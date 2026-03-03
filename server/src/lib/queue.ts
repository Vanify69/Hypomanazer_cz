import { Queue } from "bullmq";

const REDIS_URL = process.env.REDIS_URL ?? "";

function getConnectionOptions(): { host: string; port: number; password?: string } | null {
  if (!REDIS_URL) return null;
  try {
    const u = new URL(REDIS_URL);
    return {
      host: u.hostname || "localhost",
      port: parseInt(u.port || "6379", 10),
      ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

const connectionOptions = getConnectionOptions();

const QUEUE_NAMES = {
  INTAKE_LINKS: "intake-links",
  REFERRER_LINKS: "referrer-links",
  CONVERT_LEAD: "convert-lead",
  EXTRACTIONS: "extractions",
  REFERRER_NOTIFY: "referrer-notify",
} as const;

const defaultJobOptions = {
  removeOnComplete: { count: 100 },
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
};

function getQueue(name: string) {
  if (!connectionOptions) return null;
  return new Queue(name, {
    connection: connectionOptions,
    defaultJobOptions,
  });
}

export const queues = {
  intakeLinks: getQueue(QUEUE_NAMES.INTAKE_LINKS),
  referrerLinks: getQueue(QUEUE_NAMES.REFERRER_LINKS),
  convertLead: getQueue(QUEUE_NAMES.CONVERT_LEAD),
  extractions: getQueue(QUEUE_NAMES.EXTRACTIONS),
  referrerNotify: getQueue(QUEUE_NAMES.REFERRER_NOTIFY),
};

export function isQueueAvailable(): boolean {
  return REDIS_URL.length > 0;
}

export interface SendIntakeLinkPayload {
  leadId: string;
  channels: string[];
}

export async function addSendIntakeLinkJob(payload: SendIntakeLinkPayload): Promise<string | null> {
  const q = queues.intakeLinks;
  if (!q) return null;
  const job = await q.add("send", payload, { jobId: `intake-${payload.leadId}-${Date.now()}` });
  return job.id ?? null;
}

export interface SendReferrerLinkPayload {
  referrerId: string;
  channels: string[];
}

export async function addSendReferrerLinkJob(payload: SendReferrerLinkPayload): Promise<string | null> {
  const q = queues.referrerLinks;
  if (!q) return null;
  const job = await q.add("send", payload);
  return job.id ?? null;
}

export async function addConvertLeadToCaseJob(intakeSessionId: string): Promise<string | null> {
  const q = queues.convertLead;
  if (!q) return null;
  const job = await q.add("convert", { intakeSessionId });
  return job.id ?? null;
}

export async function addRunExtractionsJob(caseId: string): Promise<string | null> {
  const q = queues.extractions;
  if (!q) return null;
  const job = await q.add("run", { caseId });
  return job.id ?? null;
}

export interface SendReferrerStatusPayload {
  referrerId: string;
  leadId: string;
  visibleStatus: string;
}

export async function addSendReferrerStatusJob(payload: SendReferrerStatusPayload): Promise<string | null> {
  const q = queues.referrerNotify;
  if (!q) return null;
  const job = await q.add("notify", payload);
  return job.id ?? null;
}

export function getConnectionOptionsForWorker(): { host: string; port: number; password?: string } | null {
  return getConnectionOptions();
}

export { QUEUE_NAMES };
