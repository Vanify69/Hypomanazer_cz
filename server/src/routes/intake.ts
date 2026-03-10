import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { hashToken } from "../lib/tokens.js";
import { getIntakeUploadDir } from "../lib/upload.js";
import { validateRequiredSlots } from "../lib/intakeValidation.js";
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

  const existingSlots = session.uploadSlots;
  const hasApplicantIdFront = existingSlots.some((s) => s.personRole === "APPLICANT" && s.docType === "ID_FRONT");
  const hasApplicantIdBack = existingSlots.some((s) => s.personRole === "APPLICANT" && s.docType === "ID_BACK");
  if (!hasApplicantIdFront) {
    const exists = await prisma.uploadSlot.findFirst({
      where: { intakeSessionId: session.id, personRole: "APPLICANT", docType: "ID_FRONT" },
    });
    if (!exists) {
      await prisma.uploadSlot.create({
        data: { intakeSessionId: session.id, personRole: "APPLICANT", docType: "ID_FRONT", required: true },
      });
    }
  }
  if (!hasApplicantIdBack) {
    const exists = await prisma.uploadSlot.findFirst({
      where: { intakeSessionId: session.id, personRole: "APPLICANT", docType: "ID_BACK" },
    });
    if (!exists) {
      await prisma.uploadSlot.create({
        data: { intakeSessionId: session.id, personRole: "APPLICANT", docType: "ID_BACK", required: true },
      });
    }
  }

  if (body.hasCoApplicant) {
    const hasCoIdFront = existingSlots.some((s) => s.personRole === "CO_APPLICANT" && s.docType === "ID_FRONT");
    const hasCoIdBack = existingSlots.some((s) => s.personRole === "CO_APPLICANT" && s.docType === "ID_BACK");
    if (!hasCoIdFront) {
      await prisma.uploadSlot.create({
        data: { intakeSessionId: session.id, personRole: "CO_APPLICANT", docType: "ID_FRONT", required: true },
      });
    }
    if (!hasCoIdBack) {
      await prisma.uploadSlot.create({
        data: { intakeSessionId: session.id, personRole: "CO_APPLICANT", docType: "ID_BACK", required: true },
      });
    }
  }

  const incomeType = body.incomeType === "SELF_EMPLOYED" || body.incomeType === "BOTH" ? body.incomeType : "EMPLOYED";
  if (incomeType === "EMPLOYED") {
    await prisma.uploadSlot.deleteMany({
      where: { intakeSessionId: session.id, personRole: "APPLICANT", docType: "TAX_RETURN" },
    });
  }
  if (incomeType === "SELF_EMPLOYED") {
    await prisma.uploadSlot.deleteMany({
      where: { intakeSessionId: session.id, personRole: "APPLICANT", docType: "BANK_STATEMENT" },
    });
  }
  if (incomeType === "SELF_EMPLOYED" || incomeType === "BOTH") {
    const hasTaxReturn = existingSlots.some((s) => s.docType === "TAX_RETURN" && s.personRole === "APPLICANT");
    if (!hasTaxReturn) {
      const exists = await prisma.uploadSlot.findFirst({
        where: { intakeSessionId: session.id, personRole: "APPLICANT", docType: "TAX_RETURN" },
      });
      if (!exists) {
        await prisma.uploadSlot.create({
          data: { intakeSessionId: session.id, personRole: "APPLICANT", docType: "TAX_RETURN", required: true, period: new Date().getFullYear().toString() },
        });
      }
    }
  }
  if (incomeType === "EMPLOYED" || incomeType === "BOTH") {
    const bankCount = existingSlots.filter((s) => s.docType === "BANK_STATEMENT" && s.personRole === "APPLICANT").length;
    for (let i = bankCount; i < 6; i++) {
      await prisma.uploadSlot.create({
        data: { intakeSessionId: session.id, personRole: "APPLICANT", docType: "BANK_STATEMENT", required: true },
      });
    }
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

  const body = req.body as { consent?: boolean; incomeType?: string; ico?: string; hasCoApplicant?: boolean };
  if (!body.consent) {
    res.status(400).json({ error: "Je vyžadován souhlas se zpracováním osobních údajů." });
    return;
  }

  const incomeType = body.incomeType === "SELF_EMPLOYED" || body.incomeType === "BOTH" ? body.incomeType : "EMPLOYED";
  if (incomeType === "SELF_EMPLOYED" || incomeType === "BOTH") {
    const ico = (body.ico ?? "").trim();
    if (!ico) {
      res.status(400).json({ error: "U OSVČ je IČO povinné. Vyplňte IČO." });
      return;
    }
    if (!/^\d{8}$/.test(ico)) {
      res.status(400).json({ error: "IČO musí mít 8 číslic." });
      return;
    }
  }

  const slots = await prisma.uploadSlot.findMany({ where: { intakeSessionId: session.id } });
  const err = validateRequiredSlots(slots, { incomeType, hasCoApplicant: body.hasCoApplicant });
  if (err) {
    res.status(400).json({ error: err });
    return;
  }

  const now = new Date();
  await prisma.intakeSession.update({
    where: { id: session.id },
    data: { submittedAt: now, consentAt: now, consentVersion: "v1", state: IntakeSessionState.SUBMITTED },
  });
  const icoTrimmed = (body.ico ?? "").trim();
  const icoValid = /^\d{8}$/.test(icoTrimmed) ? icoTrimmed : null;
  await prisma.intakeSession.update({
    where: { id: session.id },
    data: icoValid ? { ico: icoValid } : {},
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
