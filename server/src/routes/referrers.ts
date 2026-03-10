import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { generateToken, hashToken, getReferrerExpiresAt } from "../lib/tokens.js";
import { ReferrerEventType, type ReferrerType, type PayoutMethod } from "../lib/prisma.js";
import { isQueueAvailable, addSendReferrerLinkJob } from "../lib/queue.js";

const router = Router();
router.use(requireAuth);

function getUserId(req: Request): string {
  return (req as Request & { user?: { userId: string } }).user!.userId;
}

function toReferrerResponse(r: {
  id: string;
  type: ReferrerType;
  displayName: string;
  registrationNumber: string | null;
  email: string | null;
  phone: string | null;
  payoutMethod: PayoutMethod;
  bankAccount?: string | null;
  invoiceCompanyName?: string | null;
  invoiceIco?: string | null;
  invoiceDic?: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { leads: number };
}) {
  return {
    id: r.id,
    type: r.type,
    displayName: r.displayName,
    registrationNumber: r.registrationNumber ?? undefined,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    payoutMethod: r.payoutMethod,
    bankAccount: r.bankAccount ?? undefined,
    invoiceCompanyName: r.invoiceCompanyName ?? undefined,
    invoiceIco: r.invoiceIco ?? undefined,
    invoiceDic: r.invoiceDic ?? undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    leadCount: (r as { _count?: { leads: number } })._count?.leads ?? 0,
  };
}

/** POST /api/referrers – vytvoření tipaře */
router.post("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const body = req.body as {
    type?: string;
    displayName?: string;
    registrationNumber?: string;
    email?: string;
    phone?: string;
    payoutMethod?: string;
    bankAccount?: string;
    invoiceCompanyName?: string;
    invoiceIco?: string;
    invoiceDic?: string;
  };
  const displayName = String(body.displayName ?? "").trim();
  if (!displayName) {
    res.status(400).json({ error: "Název / jméno tipaře je povinné." });
    return;
  }
  const validTypes: ReferrerType[] = ["ALLIANZ", "REAL_ESTATE", "DEVELOPER", "INTERNAL", "OTHER"];
  const type = validTypes.includes((body.type as ReferrerType) ?? "") ? (body.type as ReferrerType) : "OTHER";
  if (!body.email?.trim() && !body.phone?.trim()) {
    res.status(400).json({ error: "Vyplňte alespoň e-mail nebo telefon tipaře." });
    return;
  }
  const validPayout: PayoutMethod[] = ["NONE", "BANK_TRANSFER", "INVOICE"];
  const payoutMethod = validPayout.includes((body.payoutMethod as PayoutMethod) ?? "") ? (body.payoutMethod as PayoutMethod) : "NONE";

  const referrer = await prisma.referrer.create({
    data: {
      ownerUserId: userId,
      type,
      displayName,
      registrationNumber: body.registrationNumber?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      payoutMethod,
      bankAccount: body.bankAccount?.trim() || null,
      invoiceCompanyName: body.invoiceCompanyName?.trim() || null,
      invoiceIco: body.invoiceIco?.trim() || null,
      invoiceDic: body.invoiceDic?.trim() || null,
    },
  });

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getReferrerExpiresAt();
  await prisma.referralLink.create({
    data: { referrerId: referrer.id, tokenHash, expiresAt },
  });
  await prisma.referrerEvent.create({
    data: { referrerId: referrer.id, type: ReferrerEventType.CREATED, payload: "{}" },
  });

  const baseUrl = process.env.FRONTEND_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  const referrerLink = `${baseUrl}/ref/${rawToken}`;

  res.status(201).json({
    ...toReferrerResponse(referrer),
    referrerLink,
    expiresAt: expiresAt.toISOString(),
  });
});

/** GET /api/referrers – seznam tipařů */
router.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const q = (req.query.q as string)?.trim();
  const type = req.query.type as string | undefined;

  const where: { ownerUserId: string; type?: ReferrerType } = { ownerUserId: userId };
  if (type) where.type = type as ReferrerType;
  if (q) {
    (where as Record<string, unknown>).OR = [
      { displayName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { registrationNumber: { contains: q } },
    ];
  }

  const list = await prisma.referrer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { leads: true } } },
  });
  res.json(list.map(toReferrerResponse));
});

/** PATCH /api/referrers/:id – úprava tipaře */
router.patch("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const body = req.body as {
    type?: string;
    displayName?: string;
    registrationNumber?: string;
    email?: string;
    phone?: string;
    payoutMethod?: string;
    bankAccount?: string;
    invoiceCompanyName?: string;
    invoiceIco?: string;
    invoiceDic?: string;
  };

  const existing = await prisma.referrer.findFirst({
    where: { id, ownerUserId: userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Tipař nenalezen." });
    return;
  }

  const displayName = body.displayName !== undefined ? String(body.displayName).trim() : existing.displayName;
  if (!displayName) {
    res.status(400).json({ error: "Název / jméno tipaře je povinné." });
    return;
  }
  const email = body.email !== undefined ? (body.email?.trim() || null) : existing.email;
  const phone = body.phone !== undefined ? (body.phone?.trim() || null) : existing.phone;
  if (!email && !phone) {
    res.status(400).json({ error: "Vyplňte alespoň e-mail nebo telefon tipaře." });
    return;
  }

  const validTypes: ReferrerType[] = ["ALLIANZ", "REAL_ESTATE", "DEVELOPER", "INTERNAL", "OTHER"];
  const type = body.type !== undefined && validTypes.includes(body.type as ReferrerType)
    ? (body.type as ReferrerType)
    : existing.type;
  const validPayout: PayoutMethod[] = ["NONE", "BANK_TRANSFER", "INVOICE"];
  const payoutMethod = body.payoutMethod !== undefined && validPayout.includes(body.payoutMethod as PayoutMethod)
    ? (body.payoutMethod as PayoutMethod)
    : existing.payoutMethod;

  const updated = await prisma.referrer.update({
    where: { id },
    data: {
      type,
      displayName,
      registrationNumber: body.registrationNumber !== undefined ? (body.registrationNumber?.trim() || null) : undefined,
      email,
      phone,
      payoutMethod,
      bankAccount: body.bankAccount !== undefined ? (body.bankAccount?.trim() || null) : undefined,
      invoiceCompanyName: body.invoiceCompanyName !== undefined ? (body.invoiceCompanyName?.trim() || null) : undefined,
      invoiceIco: body.invoiceIco !== undefined ? (body.invoiceIco?.trim() || null) : undefined,
      invoiceDic: body.invoiceDic !== undefined ? (body.invoiceDic?.trim() || null) : undefined,
    },
    include: { _count: { select: { leads: true } } },
  });
  res.json(toReferrerResponse(updated));
});

/** POST /api/referrers/:id/regenerate-link – nový tipařský odkaz (starý přestane platit) */
router.post("/:id/regenerate-link", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const referrer = await prisma.referrer.findFirst({
    where: { id, ownerUserId: userId },
  });
  if (!referrer) {
    res.status(404).json({ error: "Tipař nenalezen." });
    return;
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getReferrerExpiresAt();

  const latestLink = await prisma.referralLink.findFirst({
    where: { referrerId: id },
    orderBy: { createdAt: "desc" },
  });
  if (latestLink) {
    await prisma.referralLink.update({
      where: { id: latestLink.id },
      data: { tokenHash, expiresAt },
    });
  } else {
    await prisma.referralLink.create({
      data: { referrerId: id, tokenHash, expiresAt },
    });
  }

  const baseUrl = process.env.FRONTEND_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  const referrerLink = `${baseUrl}/ref/${rawToken}`;

  res.json({ referrerLink, expiresAt: expiresAt.toISOString() });
});

/** GET /api/referrers/:id – detail tipaře */
router.get("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const referrer = await prisma.referrer.findFirst({
    where: { id, ownerUserId: userId },
    include: { _count: { select: { leads: true } } },
  });
  if (!referrer) {
    res.status(404).json({ error: "Tipař nenalezen." });
    return;
  }
  res.json(toReferrerResponse(referrer));
});

/** GET /api/referrers/:id/leads – interní report leadů od tipaře */
router.get("/:id/leads", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const referrer = await prisma.referrer.findFirst({
    where: { id, ownerUserId: userId },
  });
  if (!referrer) {
    res.status(404).json({ error: "Tipař nenalezen." });
    return;
  }
  const leads = await prisma.lead.findMany({
    where: { referrerId: id },
    orderBy: { updatedAt: "desc" },
    take: 500,
    include: { convertedCase: { select: { id: true, dealStatus: true } } },
  });
  const { mapToReferrerVisibleStatus } = await import("../lib/referrerStatus.js");
  res.json(
    leads.map((l) => ({
      id: l.id,
      loanType: l.loanType,
      status: l.status,
      visibleStatus: mapToReferrerVisibleStatus(l, null, l.convertedCase),
      updatedAt: l.updatedAt.toISOString(),
      convertedCaseId: l.convertedCase?.id,
    }))
  );
});

/** POST /api/referrers/:id/send-link – odeslat tipařský link (SMS/email). Zatím jen log. */
router.post("/:id/send-link", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const channels = (req.body?.channels as string[]) ?? [];

  const referrer = await prisma.referrer.findFirst({
    where: { id, ownerUserId: userId },
    include: { referralLinks: true },
  });
  if (!referrer) {
    res.status(404).json({ error: "Tipař nenalezen." });
    return;
  }
  if (!referrer.email && !referrer.phone) {
    res.status(400).json({ error: "U tipaře chybí e-mail i telefon." });
    return;
  }
  if (isQueueAvailable()) {
    const jobId = await addSendReferrerLinkJob({ referrerId: id, channels });
    if (jobId) {
      res.status(202).json({
        ok: true,
        message: "Odeslání bylo zařazeno do fronty.",
        jobId,
      });
      return;
    }
  }
  const doSms = channels.includes("sms") && !!referrer.phone;
  const doEmail = channels.includes("email") && !!referrer.email;
  await prisma.referrerEvent.create({
    data: { referrerId: id, type: ReferrerEventType.INVITED, payload: JSON.stringify({ channels: { sms: doSms, email: doEmail } }) },
  });
  res.json({
    ok: true,
    sent: { sms: doSms, email: doEmail },
    message: "Pro skutečné odeslání spusťte worker a nastavte REDIS_URL.",
  });
});

export { router as referrersRouter };
