import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config();

import { Worker, type Job } from "bullmq";
import {
  QUEUE_NAMES,
  getConnectionOptionsForWorker,
  type SendIntakeLinkPayload,
  type SendReferrerLinkPayload,
  type SendReferrerStatusPayload,
  addRunExtractionsJob,
} from "./lib/queue.js";
import { prisma } from "./lib/prisma.js";
import { generateToken, hashToken, getIntakeExpiresAt, getReferrerExpiresAt } from "./lib/tokens.js";
import { getSmsProvider, normalizePhoneE164 } from "./lib/sms.js";
import {
  getEmailProvider,
  buildIntakeLinkEmailBody,
  buildReferrerLinkEmailBody,
} from "./lib/email.js";
import { convertLeadToCase } from "./services/convertLeadToCase.js";
import { runExtractionsForCase } from "./services/runExtractions.js";
import { REFERRER_VISIBLE_STATUS_LABELS } from "./lib/referrerStatus.js";
import { LeadEventType, IntakeSessionState, ReferrerEventType } from "./lib/prisma.js";
import { getFrontendBaseUrl } from "./lib/frontendUrl.js";

const REDIS_URL = process.env.REDIS_URL ?? "";


async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts) await new Promise((r) => setTimeout(r, i === 0 ? 2000 : 10000));
    }
  }
  throw lastErr;
}

async function processSendIntakeLink(job: Job<SendIntakeLinkPayload>) {
  const { leadId, channels } = job.data;
  const lead = await prisma.lead.findFirst({
    where: { id: leadId },
    include: { intakeSession: true },
  });
  if (!lead?.intakeSession) throw new Error("Lead or intake session not found");
  if (lead.intakeSession.state === "SUBMITTED" || lead.intakeSession.state === "CONVERTED") return;

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getIntakeExpiresAt();
  await prisma.intakeSession.update({
    where: { id: lead.intakeSession.id },
    data: { tokenHash, expiresAt },
  });
  const intakeLink = `${getFrontendBaseUrl()}/intake/${rawToken}`;

  const smsProvider = getSmsProvider();
  const emailProvider = getEmailProvider();
  const doSms = channels.includes("sms") && lead.phone && smsProvider;
  const doEmail = channels.includes("email") && lead.email && emailProvider;

  if (doSms) {
    await withRetry(() =>
      smsProvider!.send(
        normalizePhoneE164(lead.phone!),
        `Odkaz pro nahrání podkladů: ${intakeLink}`
      )
    );
    await prisma.leadEvent.create({
      data: { leadId, type: LeadEventType.LINK_SENT_SMS, payload: "{}" },
    });
  }
  if (doEmail) {
    const { subject, html } = buildIntakeLinkEmailBody(intakeLink);
    await withRetry(() => emailProvider!.send(lead.email!, subject, html));
    await prisma.leadEvent.create({
      data: { leadId, type: LeadEventType.LINK_SENT_EMAIL, payload: "{}" },
    });
  }

  await prisma.lead.update({ where: { id: leadId }, data: { status: "SENT" } });
  await prisma.intakeSession.update({
    where: { id: lead.intakeSession.id },
    data: { state: IntakeSessionState.SENT },
  });
}

async function processSendReferrerLink(job: Job<SendReferrerLinkPayload>) {
  const { referrerId, channels } = job.data;
  const referrer = await prisma.referrer.findFirst({
    where: { id: referrerId },
    include: { referralLinks: true },
  });
  if (!referrer) throw new Error("Referrer not found");
  if (!referrer.email && !referrer.phone) return;

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getReferrerExpiresAt();
  const existing = referrer.referralLinks[0];
  if (existing) {
    await prisma.referralLink.update({
      where: { id: existing.id },
      data: { tokenHash, expiresAt },
    });
  } else {
    await prisma.referralLink.create({
      data: { referrerId, tokenHash, expiresAt },
    });
  }
  const referrerLink = `${getFrontendBaseUrl()}/ref/${rawToken}`;

  const smsProvider = getSmsProvider();
  const emailProvider = getEmailProvider();
  const doSms = channels.includes("sms") && referrer.phone && smsProvider;
  const doEmail = channels.includes("email") && referrer.email && emailProvider;

  if (doSms) {
    await withRetry(() =>
      smsProvider!.send(normalizePhoneE164(referrer.phone!), `Váš odkaz pro leady: ${referrerLink}`)
    );
  }
  if (doEmail) {
    const { subject, html } = buildReferrerLinkEmailBody(referrerLink, referrer.displayName);
    await withRetry(() => emailProvider!.send(referrer.email!, subject, html));
  }
  await prisma.referrerEvent.create({
    data: { referrerId, type: ReferrerEventType.INVITED, payload: JSON.stringify({ channels: { sms: doSms, email: doEmail } }) },
  });
}

async function processConvertLead(job: Job<{ intakeSessionId: string }>) {
  const { intakeSessionId } = job.data;
  const { caseId } = await convertLeadToCase(intakeSessionId);
  await addRunExtractionsJob(caseId);
}

async function processExtractions(job: Job<{ caseId: string }>) {
  const { caseId } = job.data;
  await runExtractionsForCase(caseId);
}

async function processReferrerNotify(job: Job<SendReferrerStatusPayload>) {
  const { referrerId, leadId, visibleStatus } = job.data;
  const referrer = await prisma.referrer.findFirst({ where: { id: referrerId } });
  if (!referrer || (!referrer.email && !referrer.phone)) return;

  const label = REFERRER_VISIBLE_STATUS_LABELS[visibleStatus as keyof typeof REFERRER_VISIBLE_STATUS_LABELS] ?? visibleStatus;
  const msg = `Stav obchodu: ${label}.`;

  const smsProvider = getSmsProvider();
  const emailProvider = getEmailProvider();
  if (referrer.phone && smsProvider) {
    await withRetry(() => smsProvider.send(normalizePhoneE164(referrer.phone!), msg));
  }
  if (referrer.email && emailProvider) {
    await withRetry(() =>
      emailProvider.send(
        referrer.email!,
        "Změna stavu obchodu",
        `<p>${msg}</p><p>Více v portálu tipaře.</p>`
      )
    );
  }
}

function runWorkers() {
  const connection = getConnectionOptionsForWorker();
  if (!connection) {
    console.warn("[Worker] REDIS_URL není nastaven nebo neplatný – worker se nespouští.");
    process.exit(0);
    return;
  }
  const opts = { connection, concurrency: 2 };

  new Worker<SendIntakeLinkPayload>(
    QUEUE_NAMES.INTAKE_LINKS,
    async (job: Job<SendIntakeLinkPayload>) => {
      await processSendIntakeLink(job);
    },
    opts
  );

  new Worker<SendReferrerLinkPayload>(
    QUEUE_NAMES.REFERRER_LINKS,
    async (job: Job<SendReferrerLinkPayload>) => {
      await processSendReferrerLink(job);
    },
    opts
  );

  new Worker<{ intakeSessionId: string }>(
    QUEUE_NAMES.CONVERT_LEAD,
    async (job: Job<{ intakeSessionId: string }>) => {
      await processConvertLead(job);
    },
    opts
  );

  new Worker<{ caseId: string }>(
    QUEUE_NAMES.EXTRACTIONS,
    async (job: Job<{ caseId: string }>) => {
      await processExtractions(job);
    },
    opts
  );

  new Worker<SendReferrerStatusPayload>(
    QUEUE_NAMES.REFERRER_NOTIFY,
    async (job: Job<SendReferrerStatusPayload>) => {
      await processReferrerNotify(job);
    },
    opts
  );

  console.log("[Worker] Běží (Redis připojen).");
}

runWorkers();
