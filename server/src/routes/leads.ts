import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  generateToken,
  hashToken,
  getIntakeExpiresAt,
} from "../lib/tokens.js";
import type { LeadStatus, LoanType, LeadSource, Prisma } from "../lib/prisma.js";
import { LeadEventType, IntakeSessionState } from "../lib/prisma.js";
import { isQueueAvailable, addSendIntakeLinkJob } from "../lib/queue.js";

const router = Router();
router.use(requireAuth);

function getUserId(req: Request): string {
  return (req as Request & { user?: { userId: string } }).user!.userId;
}

/** Odpověď s leadem (pro list i detail). */
function toLeadResponse(lead: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  loanType: LoanType;
  note: string | null;
  source: LeadSource;
  referrerId: string | null;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
  intakeSession?: { id: string; state: string; expiresAt: Date; intakeLink?: string | null } | null;
  convertedCase?: { id: string } | null;
  referrer?: { id: string; displayName: string } | null;
}) {
  const convertedCaseId = lead.convertedCase?.id ?? null;
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email ?? undefined,
    phone: lead.phone ?? undefined,
    loanType: lead.loanType,
    note: lead.note ?? undefined,
    source: lead.source,
    referrerId: lead.referrerId ?? undefined,
    referrer: lead.referrer ? { id: lead.referrer.id, displayName: lead.referrer.displayName } : undefined,
    status: lead.status,
    convertedCaseId: convertedCaseId ?? undefined,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    intakeSession: lead.intakeSession
      ? {
          id: lead.intakeSession.id,
          state: lead.intakeSession.state,
          expiresAt: lead.intakeSession.expiresAt.toISOString(),
          intakeLink: lead.intakeSession.intakeLink ?? undefined,
        }
      : undefined,
  };
}

/** POST /api/leads – vytvoření leadu (source=OWN nebo REFERRER s referrerId) */
router.post("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const body = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    loanType?: string;
    note?: string;
    source?: string;
    referrerId?: string;
  };
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  if (!firstName || !lastName) {
    res.status(400).json({ error: "Jméno a příjmení jsou povinné." });
    return;
  }
  const loanType = body.loanType as LoanType | undefined;
  const validLoanTypes: LoanType[] = ["PURCHASE", "REFINANCE", "NON_PURPOSE"];
  if (!loanType || !validLoanTypes.includes(loanType)) {
    res.status(400).json({ error: "Neplatný typ úvěru." });
    return;
  }

  let source: LeadSource = "OWN";
  let referrerId: string | null = null;
  if (body.source === "REFERRER" && body.referrerId?.trim()) {
    const ref = await prisma.referrer.findFirst({
      where: { id: body.referrerId.trim(), ownerUserId: userId },
    });
    if (!ref) {
      res.status(400).json({ error: "Tipař nenalezen nebo nemáte oprávnění." });
      return;
    }
    source = "REFERRER";
    referrerId = ref.id;
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getIntakeExpiresAt();
  const baseUrl = process.env.FRONTEND_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  const intakeLink = `${baseUrl}/intake/${rawToken}`;

  const lead = await prisma.lead.create({
    data: {
      ownerUserId: userId,
      firstName,
      lastName,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      loanType,
      note: body.note?.trim() || null,
      source,
      referrerId,
      status: "DRAFT",
    },
  });

  const session = await prisma.intakeSession.create({
    data: {
      leadId: lead.id,
      tokenHash,
      intakeLink,
      expiresAt,
      state: IntakeSessionState.CREATED,
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { intakeSessionId: session.id },
  });

  await prisma.uploadSlot.createMany({
    data: [
      {
        intakeSessionId: session.id,
        personRole: "APPLICANT",
        docType: "ID_FRONT",
        required: true,
      },
      {
        intakeSessionId: session.id,
        personRole: "APPLICANT",
        docType: "ID_BACK",
        required: true,
      },
    ],
  });

  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      type: LeadEventType.LINK_CREATED,
      payload: JSON.stringify({ sessionId: session.id }),
    },
  });

  const withReferrer = referrerId
    ? await prisma.lead.findUnique({
        where: { id: lead.id },
        include: { referrer: { select: { id: true, displayName: true } } },
      })
    : { ...lead, referrer: null };
  res.status(201).json({
    ...toLeadResponse({
      ...(withReferrer ?? lead),
      intakeSession: session,
    }),
    intakeLink,
    expiresAt: expiresAt.toISOString(),
  });
});

/** PATCH /api/leads/:id – úprava leadu (jméno, kontakt, typ úvěru, poznámka, tipař) */
router.patch("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const body = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    loanType?: string;
    note?: string;
    source?: string;
    referrerId?: string | null;
  };

  const existing = await prisma.lead.findFirst({
    where: { id, ownerUserId: userId },
    include: { referrer: { select: { id: true, displayName: true } } },
  });
  if (!existing) {
    res.status(404).json({ error: "Lead nenalezen." });
    return;
  }

  const firstName = body.firstName !== undefined ? String(body.firstName).trim() : existing.firstName;
  const lastName = body.lastName !== undefined ? String(body.lastName).trim() : existing.lastName;
  if (!firstName || !lastName) {
    res.status(400).json({ error: "Jméno a příjmení jsou povinné." });
    return;
  }
  const validLoanTypes: LoanType[] = ["PURCHASE", "REFINANCE", "NON_PURPOSE"];
  const loanType = body.loanType !== undefined ? (body.loanType as LoanType) : existing.loanType;
  if (!validLoanTypes.includes(loanType)) {
    res.status(400).json({ error: "Neplatný typ úvěru." });
    return;
  }

  let source: LeadSource = existing.source;
  let referrerId: string | null = existing.referrerId;
  if (body.source !== undefined) {
    if (body.source === "REFERRER" && body.referrerId?.trim()) {
      const ref = await prisma.referrer.findFirst({
        where: { id: body.referrerId.trim(), ownerUserId: userId },
      });
      if (!ref) {
        res.status(400).json({ error: "Tipař nenalezen nebo nemáte oprávnění." });
        return;
      }
      source = "REFERRER";
      referrerId = ref.id;
    } else {
      source = "OWN";
      referrerId = null;
    }
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      firstName,
      lastName,
      email: body.email !== undefined ? (body.email?.trim() || null) : undefined,
      phone: body.phone !== undefined ? (body.phone?.trim() || null) : undefined,
      loanType,
      note: body.note !== undefined ? (body.note?.trim() || null) : undefined,
      source,
      referrerId,
    },
    include: { intakeSession: true, convertedCase: { select: { id: true } }, referrer: { select: { id: true, displayName: true } } },
  });
  res.json(toLeadResponse(updated));
});

/** GET /api/leads – seznam leadů s filtry */
router.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const status = req.query.status as string | undefined;
  const loanType = req.query.loanType as string | undefined;
  const source = req.query.source as string | undefined;
  const referrerId = req.query.referrerId as string | undefined;
  const q = req.query.q as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const deleted = req.query.deleted === "true";

  const where = {
    ownerUserId: userId,
    deletedAt: deleted ? { not: null } : null,
    ...(status && { status: status as LeadStatus }),
    ...(loanType && { loanType: loanType as LoanType }),
    ...(source && { source: source as LeadSource }),
    ...(referrerId && { referrerId }),
    ...(q?.trim() && {
      OR: [
        { firstName: { contains: q.trim() } },
        { lastName: { contains: q.trim() } },
        { email: { contains: q.trim() } },
        { phone: { contains: q.trim() } },
      ] as const,
    }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  const leads = await prisma.lead.findMany({
    where: where as Prisma.LeadWhereInput,
    orderBy: { updatedAt: "desc" },
    include: {
      intakeSession: true,
      convertedCase: { select: { id: true } },
      referrer: { select: { id: true, displayName: true } },
    },
  });

  res.json(leads.map((l) => toLeadResponse(l)));
});

/** GET /api/leads/:id – detail leadu */
router.get("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const lead = await prisma.lead.findFirst({
    where: { id, ownerUserId: userId },
    include: {
      intakeSession: { include: { uploadSlots: true } },
      convertedCase: { select: { id: true } },
      referrer: { select: { id: true, displayName: true } },
    },
  });
  if (!lead) {
    res.status(404).json({ error: "Lead nenalezen." });
    return;
  }
  res.json({
    ...toLeadResponse(lead),
    uploadSlots: lead.intakeSession?.uploadSlots ?? [],
  });
});

/** POST /api/leads/:id/create-intake – vytvoření intake session u leadu (koncept od tipaře bez odkazů). */
router.post("/:id/create-intake", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const lead = await prisma.lead.findFirst({
    where: { id, ownerUserId: userId },
    include: { intakeSession: true },
  });
  if (!lead) {
    res.status(404).json({ error: "Lead nenalezen." });
    return;
  }
  if (lead.intakeSession) {
    res.status(400).json({ error: "K leadu již byl vygenerován odkaz na podklady." });
    return;
  }
  if (!lead.email && !lead.phone) {
    res.status(400).json({
      error: "Pro odeslání linku je potřeba vyplnit e-mail nebo telefon. Nejprve lead upravte.",
    });
    return;
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getIntakeExpiresAt();
  const baseUrl = process.env.FRONTEND_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  const intakeLink = `${baseUrl}/intake/${rawToken}`;

  const session = await prisma.intakeSession.create({
    data: {
      leadId: lead.id,
      tokenHash,
      intakeLink,
      expiresAt,
      state: IntakeSessionState.CREATED,
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { intakeSessionId: session.id },
  });

  await prisma.uploadSlot.createMany({
    data: [
      { intakeSessionId: session.id, personRole: "APPLICANT", docType: "ID_FRONT", required: true },
      { intakeSessionId: session.id, personRole: "APPLICANT", docType: "ID_BACK", required: true },
    ],
  });

  await prisma.leadEvent.create({
    data: { leadId: lead.id, type: LeadEventType.LINK_CREATED, payload: JSON.stringify({ sessionId: session.id }) },
  });

  res.json({
    intakeLink,
    expiresAt: expiresAt.toISOString(),
    message: "Odkaz na podklady byl vygenerován. Nyní můžete odkaz zkopírovat nebo poslat klientovi.",
  });
});

/** POST /api/leads/:id/send-link – odeslání intake linku (SMS/email). Zatím jen aktualizace stavu. */
router.post("/:id/send-link", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const channels = (req.body?.channels as string[]) ?? [];

  const lead = await prisma.lead.findFirst({
    where: { id, ownerUserId: userId },
    include: { intakeSession: true },
  });
  if (!lead) {
    res.status(404).json({ error: "Lead nenalezen." });
    return;
  }
  if (!lead.email && !lead.phone) {
    res.status(400).json({
      error: "Pro odeslání linku je potřeba vyplnit e-mail nebo telefon.",
    });
    return;
  }
  if (!lead.intakeSession) {
    res.status(400).json({ error: "K leadu není přiřazena intake session." });
    return;
  }
  if (
    lead.intakeSession.state === "EXPIRED" ||
    lead.intakeSession.state === "SUBMITTED" ||
    lead.intakeSession.state === "CONVERTED"
  ) {
    res.status(400).json({ error: "Odkaz již nelze odeslat (vypršel nebo byl použit)." });
    return;
  }

  if (isQueueAvailable()) {
    const jobId = await addSendIntakeLinkJob({ leadId: lead.id, channels });
    if (jobId) {
      res.status(202).json({
        ok: true,
        message: "Odeslání bylo zařazeno do fronty.",
        jobId,
      });
      return;
    }
  }

  const doSendSms = channels.includes("sms") && !!lead.phone;
  const doSendEmail = channels.includes("email") && !!lead.email;
  if (doSendSms) {
    await prisma.leadEvent.create({
      data: { leadId: lead.id, type: LeadEventType.LINK_SENT_SMS, payload: "{}" },
    });
  }
  if (doSendEmail) {
    await prisma.leadEvent.create({
      data: { leadId: lead.id, type: LeadEventType.LINK_SENT_EMAIL, payload: "{}" },
    });
  }
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "SENT" },
  });
  await prisma.intakeSession.update({
    where: { id: lead.intakeSession.id },
    data: { state: IntakeSessionState.SENT },
  });
  res.json({
    ok: true,
    sent: { sms: doSendSms, email: doSendEmail },
    message: "Stav byl aktualizován. Pro skutečné odeslání SMS/e-mail spusťte worker a nastavte REDIS_URL.",
  });
});

/** POST /api/leads/:id/regenerate-link – nový token pro intake */
router.post("/:id/regenerate-link", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const lead = await prisma.lead.findFirst({
    where: { id, ownerUserId: userId },
    include: { intakeSession: true },
  });
  if (!lead || !lead.intakeSession) {
    res.status(404).json({ error: "Lead nebo intake session nenalezena." });
    return;
  }
  if (
    lead.intakeSession.state === "SUBMITTED" ||
    lead.intakeSession.state === "CONVERTED"
  ) {
    res.status(400).json({ error: "Už nelze vygenerovat nový odkaz (intake byl odeslán)." });
    return;
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getIntakeExpiresAt();
  const baseUrl = process.env.FRONTEND_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  const intakeLink = `${baseUrl}/intake/${rawToken}`;

  await prisma.intakeSession.update({
    where: { id: lead.intakeSession.id },
    data: { tokenHash, intakeLink, expiresAt },
  });

  res.json({
    ok: true,
    intakeLink,
    expiresAt: expiresAt.toISOString(),
  });
});

/** POST /api/leads/:id/expire – zrušení platnosti intake linku */
router.post("/:id/expire", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const lead = await prisma.lead.findFirst({
    where: { id, ownerUserId: userId },
    include: { intakeSession: true },
  });
  if (!lead) {
    res.status(404).json({ error: "Lead nenalezen." });
    return;
  }
  if (lead.intakeSession) {
    await prisma.intakeSession.update({
      where: { id: lead.intakeSession.id },
      data: { state: IntakeSessionState.EXPIRED },
    });
  }
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "EXPIRED" },
  });
  await prisma.leadEvent.create({
    data: { leadId: lead.id, type: LeadEventType.EXPIRED, payload: "{}" },
  });

  res.json({ ok: true });
});

/** POST /api/leads/:id/delete – přesun do koše (soft delete) */
router.post("/:id/delete", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const lead = await prisma.lead.findFirst({
    where: { id, ownerUserId: userId },
  });
  if (!lead) {
    res.status(404).json({ error: "Lead nenalezen." });
    return;
  }
  if (lead.deletedAt) {
    res.status(400).json({ error: "Lead je již v koši." });
    return;
  }
  await prisma.lead.update({
    where: { id: lead.id },
    data: { deletedAt: new Date() },
  });
  res.json({ ok: true });
});

/** POST /api/leads/:id/restore – obnovení leadu z koše */
router.post("/:id/restore", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const lead = await prisma.lead.findFirst({
    where: { id, ownerUserId: userId },
  });
  if (!lead) {
    res.status(404).json({ error: "Lead nenalezen." });
    return;
  }
  if (!lead.deletedAt) {
    res.status(400).json({ error: "Lead není v koši." });
    return;
  }
  await prisma.lead.update({
    where: { id: lead.id },
    data: { deletedAt: null },
  });
  res.json({ ok: true });
});

/** DELETE /api/leads/:id – trvalé odstranění leadu (pouze z koše) */
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const lead = await prisma.lead.findFirst({
    where: { id, ownerUserId: userId },
  });
  if (!lead) {
    res.status(404).json({ error: "Lead nenalezen." });
    return;
  }
  if (!lead.deletedAt) {
    res.status(400).json({ error: "Trvalé odstranění jen u leadů v koši. Nejprve lead smažte (přesuňte do koše)." });
    return;
  }
  await prisma.lead.delete({
    where: { id: lead.id },
  });
  res.json({ ok: true });
});

export { router as leadsRouter };
