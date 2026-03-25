import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { hashToken } from "../lib/tokens.js";
import { getIntakeUploadDir } from "../lib/upload.js";
import { validateRequiredSlots } from "../lib/intakeValidation.js";
import { normalizeIntakeIncome, syncIncomeDocumentSlots } from "../lib/intakeSlotSync.js";
import { convertLeadToCase } from "../services/convertLeadToCase.js";
import { runExtractionsForCase } from "../services/runExtractions.js";
import { isQueueAvailable, addConvertLeadToCaseJob } from "../lib/queue.js";
import { LeadEventType, IntakeSessionState } from "../lib/prisma.js";

const router = Router();

async function findSessionByToken(token: string) {
  const normalized = (token ?? "").trim();
  if (!normalized) return null;
  const tokenHash = hashToken(normalized);
  const session = await prisma.intakeSession.findFirst({
    where: { tokenHash },
    include: { lead: true, uploadSlots: true },
  });
  return session;
}

/** GET /api/intake/:token – data pro intake stránku (bez auth) */
router.get("/:token", async (req: Request, res: Response) => {
  const token = req.params.token ?? "";
  if (!token.trim()) {
    res.status(400).json({ error: "Chybí token." });
    return;
  }
  const session = await findSessionByToken(token);
  if (!session) {
    res.status(404).json({ error: "Neplatný odkaz." });
    return;
  }
  if (new Date() > session.expiresAt) {
    res.status(410).json({ error: "Odkaz vypršel. Kontaktujte svého poradce.", expired: true });
    return;
  }
  if (session.state === "SUBMITTED" || session.state === "CONVERTED") {
    return res.json({
      state: session.state,
      message: "Podklady již byly odeslány.",
      submittedAt: session.submittedAt?.toISOString(),
    });
  }

  if (!session.openedAt) {
    await prisma.intakeSession.update({
      where: { id: session.id },
      data: { openedAt: new Date(), state: IntakeSessionState.OPENED },
    });
    await prisma.lead.update({
      where: { id: session.leadId },
      data: { status: "OPENED" },
    });
    await prisma.leadEvent.create({
      data: { leadId: session.leadId, type: LeadEventType.LINK_OPENED, payload: "{}" },
    });
  }

  res.json({
    state: session.state,
    leadId: session.leadId,
    loanType: session.lead.loanType,
    uploadSlots: session.uploadSlots.map((s) => ({
      id: s.id,
      personRole: s.personRole,
      docType: s.docType,
      period: s.period ?? undefined,
      required: s.required,
      status: s.status,
    })),
    expiresAt: session.expiresAt.toISOString(),
  });
});

/** POST /api/intake/:token/progress – uložit průběh (incomeType, coapplicant, ico) a aktualizovat sloty */
router.post("/:token/progress", async (req: Request, res: Response) => {
  const token = req.params.token;
  const session = await findSessionByToken(token);
  if (!session) {
    res.status(404).json({ error: "Neplatný odkaz." });
    return;
  }
  if (new Date() > session.expiresAt) {
    res.status(410).json({ error: "Odkaz vypršel.", expired: true });
    return;
  }
  if (session.state === "SUBMITTED" || session.state === "CONVERTED") {
    return res.json({ ok: true });
  }

  const body = req.body as {
    hasCoApplicant?: boolean;
    incomeType?: string;
    coApplicantIncomeType?: string;
    ico?: string;
  };
  await prisma.intakeSession.update({
    where: { id: session.id },
    data: { state: IntakeSessionState.IN_PROGRESS },
  });
  await prisma.lead.update({
    where: { id: session.leadId },
    data: { status: "IN_PROGRESS" },
  });

  const ensureIdSlot = async (personRole: "APPLICANT" | "CO_APPLICANT", docType: "ID_FRONT" | "ID_BACK") => {
    const exists = await prisma.uploadSlot.findFirst({
      where: { intakeSessionId: session.id, personRole, docType },
    });
    if (!exists) {
      await prisma.uploadSlot.create({
        data: { intakeSessionId: session.id, personRole, docType, required: true },
      });
    }
  };

  await ensureIdSlot("APPLICANT", "ID_FRONT");
  await ensureIdSlot("APPLICANT", "ID_BACK");

  if (!body.hasCoApplicant) {
    await prisma.uploadSlot.deleteMany({
      where: { intakeSessionId: session.id, personRole: "CO_APPLICANT" },
    });
  } else {
    await ensureIdSlot("CO_APPLICANT", "ID_FRONT");
    await ensureIdSlot("CO_APPLICANT", "ID_BACK");
  }

  const mainIncome = normalizeIntakeIncome(body.incomeType);
  await syncIncomeDocumentSlots(session.id, "APPLICANT", mainIncome);

  if (body.hasCoApplicant) {
    const coIncome = normalizeIntakeIncome(body.coApplicantIncomeType);
    await syncIncomeDocumentSlots(session.id, "CO_APPLICANT", coIncome);
  }

  await prisma.leadEvent.create({
    data: { leadId: session.leadId, type: LeadEventType.INTAKE_PROGRESS, payload: JSON.stringify(body) },
  });
  res.json({ ok: true });
});

const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

/** POST /api/intake/:token/upload – nahrát soubor do slotu (multipart: slotId, file) */
router.post("/:token/upload", uploadMem.single("file"), async (req: Request, res: Response) => {
  const token = req.params.token;
  const slotId = req.body?.slotId as string | undefined;
  const file = req.file;
  if (!slotId || !file?.buffer) {
    res.status(400).json({ error: "Chybí slotId nebo soubor." });
    return;
  }
  const session = await findSessionByToken(token);
  if (!session) {
    res.status(404).json({ error: "Neplatný odkaz." });
    return;
  }
  const slot = session.uploadSlots.find((s) => s.id === slotId);
  if (!slot) {
    res.status(400).json({ error: "Neplatný slot." });
    return;
  }
  const ext = path.extname(file.originalname) || "";
  const storageKey = `${slotId}-${Date.now()}${ext}`;
  const dir = getIntakeUploadDir(session.id);
  const destPath = path.join(dir, storageKey);
  fs.writeFileSync(destPath, file.buffer);

  await prisma.uploadSlot.update({
    where: { id: slotId },
    data: { storageKey, status: "UPLOADED" },
  });
  await prisma.leadEvent.create({
    data: { leadId: session.leadId, type: LeadEventType.UPLOAD_ADDED, payload: JSON.stringify({ slotId, docType: slot.docType }) },
  });
  res.json({ ok: true, slotId, storageKey });
});

/** DELETE /api/intake/:token/slots/:slotId – smazat nahraný soubor ze slotu (umožní znovu nahrát) */
router.delete("/:token/slots/:slotId", async (req: Request, res: Response) => {
  const token = req.params.token;
  const slotId = req.params.slotId;
  const session = await findSessionByToken(token);
  if (!session) {
    res.status(404).json({ error: "Neplatný odkaz." });
    return;
  }
  if (session.state === "SUBMITTED" || session.state === "CONVERTED") {
    res.status(400).json({ error: "Podklady již byly odeslány, nelze měnit dokumenty." });
    return;
  }
  const slot = session.uploadSlots.find((s) => s.id === slotId);
  if (!slot) {
    res.status(404).json({ error: "Slot nenalezen." });
    return;
  }
  if (slot.status !== "UPLOADED" || !slot.storageKey) {
    res.json({ ok: true });
    return;
  }
  const dir = getIntakeUploadDir(session.id);
  const filePath = path.join(dir, slot.storageKey);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // pokračujeme i když se soubor nepodařilo smazat
    }
  }
  await prisma.uploadSlot.update({
    where: { id: slotId },
    data: { storageKey: null, status: "EMPTY" },
  });
  res.json({ ok: true });
});

/** POST /api/intake/:token/submit – odeslat intake (souhlas + validace), spustit konverzi */
router.post("/:token/submit", async (req: Request, res: Response) => {
  const token = req.params.token;
  const session = await findSessionByToken(token);
  if (!session) {
    res.status(404).json({ error: "Neplatný odkaz." });
    return;
  }
  if (session.state === "SUBMITTED" || session.state === "CONVERTED") {
    return res.json({ ok: true, message: "Podklady již byly odeslány." });
  }
  if (new Date() > session.expiresAt) {
    res.status(410).json({ error: "Odkaz vypršel.", expired: true });
    return;
  }

  const body = req.body as {
    consent?: boolean;
    incomeType?: string;
    coApplicantIncomeType?: string;
    ico?: string;
    coApplicantIco?: string;
    hasCoApplicant?: boolean;
    coApplicantRelation?: string;
    household?: {
      existujiciUvery?: boolean;
      mesicniSplatky?: number;
      pocetVyzivanychOsob?: number;
      dalsiZavazky?: string;
    };
    poznamka?: string;
  };
  if (!body.consent) {
    res.status(400).json({ error: "Je vyžadován souhlas se zpracováním osobních údajů." });
    return;
  }

  const mainIncome = normalizeIntakeIncome(body.incomeType);
  const coIncome = body.hasCoApplicant ? normalizeIntakeIncome(body.coApplicantIncomeType) : "EMPLOYED";
  const incomeNeedsIco = (inc: ReturnType<typeof normalizeIntakeIncome>) =>
    inc === "SELF_EMPLOYED" || inc === "BOTH" || inc === "COMPANY";
  const needsMainIco = incomeNeedsIco(mainIncome);
  const needsCoIco = body.hasCoApplicant && incomeNeedsIco(coIncome);

  const mainIcoTrim = (body.ico ?? "").trim();
  const coIcoTrim = (body.coApplicantIco ?? "").trim();

  if (needsMainIco) {
    if (!/^\d{8}$/.test(mainIcoTrim)) {
      res.status(400).json({
        error: "Vyplňte platné IČO hlavního žadatele (8 číslic).",
      });
      return;
    }
  }
  if (needsCoIco) {
    if (!/^\d{8}$/.test(coIcoTrim)) {
      res.status(400).json({
        error: "Vyplňte platné IČO spolužadatele (8 číslic).",
      });
      return;
    }
  }

  const slots = await prisma.uploadSlot.findMany({ where: { intakeSessionId: session.id } });
  const err = validateRequiredSlots(slots, {
    incomeType: mainIncome,
    coApplicantIncomeType: body.hasCoApplicant ? coIncome : undefined,
    hasCoApplicant: body.hasCoApplicant,
  });
  if (err) {
    res.status(400).json({ error: err });
    return;
  }

  /** Vždy uložit hasCoApplicant – convertLeadToCase podle toho založí druhou osobu (dřív bez kroku „Ostatní“ metadata chyběla). */
  const intakeMeta: Record<string, unknown> = {
    hasCoApplicant: Boolean(body.hasCoApplicant),
  };
  if (body.coApplicantRelation !== undefined) intakeMeta.coApplicantRelation = body.coApplicantRelation ?? null;
  if (body.household !== undefined) intakeMeta.household = body.household ?? null;
  if (body.poznamka !== undefined) intakeMeta.poznamka = body.poznamka ?? null;
  const intakeMetadata = JSON.stringify(intakeMeta);

  const now = new Date();
  const mainIcoValid = needsMainIco && /^\d{8}$/.test(mainIcoTrim) ? mainIcoTrim : undefined;
  const coIcoValid = needsCoIco && /^\d{8}$/.test(coIcoTrim) ? coIcoTrim : undefined;
  await prisma.intakeSession.update({
    where: { id: session.id },
    data: {
      submittedAt: now,
      consentAt: now,
      consentVersion: "v1",
      state: IntakeSessionState.SUBMITTED,
      intakeMetadata,
      ...(mainIcoValid !== undefined ? { ico: mainIcoValid } : {}),
      ...(coIcoValid !== undefined ? { coApplicantIco: coIcoValid } : {}),
    },
  });
  await prisma.lead.update({
    where: { id: session.leadId },
    data: { status: "SUBMITTED" },
  });
  await prisma.leadEvent.create({
    data: { leadId: session.leadId, type: LeadEventType.SUBMITTED, payload: JSON.stringify({ consentVersion: "v1" }) },
  });

  if (isQueueAvailable()) {
    const jobId = await addConvertLeadToCaseJob(session.id);
    if (jobId) {
      res.json({ ok: true, message: "Podklady byly odeslány. Případ se vytváří na pozadí." });
      return;
    }
  }
  res.json({ ok: true, message: "Podklady byly odeslány. Zpracování probíhá na pozadí." });
  setImmediate(() => {
    convertLeadToCase(session.id)
      .then(({ caseId }) => runExtractionsForCase(caseId))
      .catch(() => {
        /* případ zůstane s údaji z leadu, extrakce lze spustit později z UI */
      });
  });
});

export { router as intakeRouter };
