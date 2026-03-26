import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { hashToken } from "../lib/tokens.js";
import { mapToReferrerVisibleStatus, type ReferrerVisibleStatus } from "../lib/referrerStatus.js";
import { ReferrerEventType, type LoanType } from "../lib/prisma.js";

const router = Router();

async function findReferrerByToken(token: string) {
  const tokenHash = hashToken(token);
  const link = await prisma.referralLink.findFirst({
    where: {
      tokenHash,
      referrer: { blockedAt: null },
    },
    include: { referrer: true },
  });
  if (!link?.referrer) return null;
  if (link.expiresAt && new Date() > link.expiresAt) return null;
  return link.referrer;
}

/** GET /api/ref/:token – ověření tokenu a základní info pro formulář */
router.get("/:token", async (req: Request, res: Response) => {
  const token = req.params.token;
  if (!token) {
    res.status(400).json({ error: "Chybí token." });
    return;
  }
  const referrer = await findReferrerByToken(token);
  if (!referrer) {
    res.status(404).json({ error: "Neplatný nebo vypršený odkaz." });
    return;
  }
  res.json({
    displayName: referrer.displayName,
    valid: true,
  });
});

/** POST /api/ref/:token/leads – tipař vytvoří lead (veřejný formulář) */
router.post("/:token/leads", async (req: Request, res: Response) => {
  const token = req.params.token;
  const referrer = await findReferrerByToken(token);
  if (!referrer) {
    res.status(404).json({ error: "Neplatný nebo vypršený odkaz." });
    return;
  }

  const body = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    loanType?: string;
    note?: string;
    consent?: boolean;
  };
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  if (!firstName || !lastName) {
    res.status(400).json({ error: "Jméno a příjmení klienta jsou povinné." });
    return;
  }
  if (!body.email?.trim() && !body.phone?.trim()) {
    res.status(400).json({ error: "Vyplňte alespoň e-mail nebo telefon klienta." });
    return;
  }
  if (!body.consent) {
    res.status(400).json({ error: "Je vyžadován souhlas se sdílením kontaktu." });
    return;
  }
  const validLoanTypes: LoanType[] = ["PURCHASE", "REFINANCE", "NON_PURPOSE"];
  const loanType = validLoanTypes.includes((body.loanType as LoanType) ?? "") ? (body.loanType as LoanType) : "PURCHASE";

  const lead = await prisma.lead.create({
    data: {
      ownerUserId: referrer.ownerUserId,
      firstName,
      lastName,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      loanType,
      note: body.note?.trim() || null,
      source: "REFERRER",
      referrerId: referrer.id,
      agreedCommissionPercent: referrer.agreedCommissionPercent ?? null,
      status: "DRAFT",
    },
  });

  await prisma.referrerEvent.create({
    data: {
      referrerId: referrer.id,
      type: ReferrerEventType.LEAD_CREATED,
      payload: JSON.stringify({ leadId: lead.id, loanType }),
    },
  });

  res.status(201).json({
    ok: true,
    leadId: lead.id,
    message: "Lead byl odeslán. Poradce vás bude kontaktovat.",
  });
});

/** GET /api/ref/:token/leads – seznam leadů tipaře (anonymizovaný, pouze stavy) */
router.get("/:token/leads", async (req: Request, res: Response) => {
  const token = req.params.token;
  const referrer = await findReferrerByToken(token);
  if (!referrer) {
    res.status(404).json({ error: "Neplatný nebo vypršený odkaz." });
    return;
  }

  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const leads = await prisma.lead.findMany({
    where: { referrerId: referrer.id, createdAt: { gte: since } },
    orderBy: { updatedAt: "desc" },
    include: { convertedCase: { select: { id: true, dealStatus: true } } },
  });

  const list = leads.map((l, index) => {
    const visibleStatus = mapToReferrerVisibleStatus(l, null, l.convertedCase);
    return {
      id: `lead-${l.id.slice(-6)}`,
      displayId: `Lead #${String(index + 1).padStart(4, "0")}`,
      loanType: l.loanType,
      visibleStatus,
      updatedAt: l.updatedAt.toISOString(),
    };
  });

  res.json({ leads: list });
});

export { router as refRouter };
