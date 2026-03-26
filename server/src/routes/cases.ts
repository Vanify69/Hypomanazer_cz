import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getCaseUploadDir, getUploadDir } from "../lib/upload.js";
import { extractOnePersonFromOpTexts, mergeDoctlyIdExtractedData } from "../lib/extractOp.js";
import { detectDocumentType, isAllowedDocumentType } from "../lib/detectDocumentType.js";
import { getTextForClassification } from "../lib/classification.js";
import { extractDapFromFile, extractDapFromText, convertParsedToLegacy, enrichParsedDapFromAres } from "../lib/extractDap.js";
import { executeExtractorJson } from "../lib/doctly.js";
import { parseDoctlyIdExtraction } from "../lib/doctlyId.js";
import getAresDataFromDic from "../lib/ares.js";
import {
  extractAccountHolderFromText,
  extractVypisyFromFile,
  getTextFromFile,
  mergeVypisyMonths,
  normalizeNameForMatch,
  type VypisyExtractResult,
} from "../lib/extractVypisy.js";
import { caseToFillModel } from "../lib/fillModel.js";

function fileSha256HexSafe(filePath: string): string | null {
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  } catch {
    return null;
  }
}

/** Najde personIndex osoby, která nejlépe odpovídá jménu držitele účtu z výpisu. */
function findPersonIndexByHolderName(
  holderName: string | null,
  allData: { jmeno: string; prijmeni: string; personIndex: number }[]
): number | null {
  if (!holderName || holderName.trim().length < 2) return null;
  const normHolder = normalizeNameForMatch(holderName);
  if (!normHolder) return null;
  let best: { personIndex: number; score: number } | null = null;
  for (const p of allData) {
    const full = [p.jmeno, p.prijmeni].filter(Boolean).join(" ").trim();
    if (!full) continue;
    const normFull = normalizeNameForMatch(full);
    if (!normFull) continue;
    let score = 0;
    if (normHolder === normFull) score = 100;
    else if (normHolder.includes(normFull) || normFull.includes(normHolder)) score = 80;
    else {
      const holderWords = normHolder.split(/\s+/).filter((w) => w.length > 1);
      const fullWords = normFull.split(/\s+/).filter((w) => w.length > 1);
      const matchCount = holderWords.filter((w) => fullWords.some((f) => f === w || f.includes(w) || w.includes(f))).length;
      score = (matchCount / Math.max(holderWords.length, fullWords.length, 1)) * 60;
    }
    if (score > 0 && (best == null || score > best.score)) best = { personIndex: p.personIndex, score };
  }
  return best != null && best.score >= 50 ? best.personIndex : null;
}

function getPersonIndexFromApplicantId(applicantId?: string | null): number | null {
  if (!applicantId) return null;
  const m = String(applicantId).match(/-(\d+)$/);
  if (!m) return null;
  const order = parseInt(m[1], 10);
  if (!Number.isFinite(order) || order <= 0) return null;
  return order - 1;
}

const router = Router();
router.use(requireAuth);

function getIdExtractorSlug(): string | null {
  const slug = process.env.DOCTLY_ID_EXTRACTOR_SLUG?.trim();
  return slug?.length ? slug : null;
}

/** Případy, u kterých právě běží extrakce (DP/OP/výpisy) – pro progress na kartě v přehledu. */
const caseIdsWithActiveExtraction = new Set<string>();

function setExtractionInProgress(caseId: string, inProgress: boolean): void {
  if (inProgress) caseIdsWithActiveExtraction.add(caseId);
  else caseIdsWithActiveExtraction.delete(caseId);
}

function toCaseResponseWithProgress(c: any): any {
  const out = toCaseResponse(c);
  out.extractionInProgress = caseIdsWithActiveExtraction.has(c.id);
  return out;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const caseId = (req.params as any).id ?? "temp";
      const dir = getCaseUploadDir(caseId);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const safe = Buffer.from(file.originalname, "latin1").toString("utf8") || "file";
      const ext = path.extname(safe) || path.extname(file.originalname) || "";
      const base = path.basename(safe, path.extname(safe)).slice(0, 50);
      cb(null, `${base}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const DEAL_STATUS_VALUES = ["NEW", "DATA_EXTRACTED", "SENT_TO_BANK", "APPROVED", "SIGNED_BY_CLIENT", "CLOSED", "LOST"] as const;

function deriveDealStatus(c: { dealStatus?: string | null; status?: string }): string {
  if (c.dealStatus && DEAL_STATUS_VALUES.includes(c.dealStatus as any)) return c.dealStatus;
  const s = c.status;
  if (s === "novy") return "NEW";
  if (s === "data-vytazena" || s === "doplneno") return "DATA_EXTRACTED";
  return "NEW";
}

function normUploadPath(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Stejná konvence jako convertLeadToCase / runExtractions – pro Nahrané podklady per žadatel. */
function personRoleForCaseFile(
  c: { id: string; documents?: { storageKey: string; personRole: string }[] },
  filePath: string
): "APPLICANT" | "CO_APPLICANT" | null {
  const norm = normUploadPath(filePath);
  for (const d of c.documents ?? []) {
    if (normUploadPath(d.storageKey) === norm) {
      return d.personRole === "CO_APPLICANT" ? "CO_APPLICANT" : "APPLICANT";
    }
  }
  const base = path.basename(norm);
  if (/-CO_APPLICANT-/.test(base)) return "CO_APPLICANT";
  if (/-APPLICANT-/.test(base)) return "APPLICANT";
  return null;
}

/** Odpovídá migrateCase: personIndex i → applicant-{caseId}-{i+1}. */
function applicantIdForPersonRole(caseId: string, role: "APPLICANT" | "CO_APPLICANT"): string {
  const personIndex = role === "CO_APPLICANT" ? 1 : 0;
  return `applicant-${caseId}-${personIndex + 1}`;
}

function toCaseResponse(c: any): any {
  const persons = (c.extractedData ?? []).sort((a: any, b: any) => a.personIndex - b.personIndex);
  return {
    id: c.id,
    jmeno: c.jmeno,
    datum: c.datum,
    status: c.status,
    dealStatus: deriveDealStatus(c),
    vyseUveru: c.vyseUveru ?? undefined,
    ucel: c.ucel ?? undefined,
    extractedData: persons.length
      ? persons.map((p: any) => ({
          personIndex: p.personIndex,
          jmeno: p.jmeno,
          prijmeni: p.prijmeni,
          rc: p.rc,
          adresa: p.adresa,
          prijmy: p.prijmy,
          vydaje: p.vydaje,
          cisloDokladu: p.cisloDokladu ?? undefined,
          datumVydani: p.datumVydani ?? undefined,
          platnostDo: p.platnostDo ?? undefined,
          vydavajiciUrad: p.vydavajiciUrad ?? undefined,
          datumNarozeni: p.datumNarozeni ?? undefined,
          mistoNarozeni: p.mistoNarozeni ?? undefined,
          pohlavi: p.pohlavi ?? undefined,
          narodnost: p.narodnost ?? undefined,
          rodinnyStav: p.rodinnyStav ?? undefined,
          dpData: (() => {
            if (p.dpData == null) return undefined;
            try {
              const parsed = typeof p.dpData === "string" ? JSON.parse(p.dpData || "{}") : p.dpData;
              if (parsed?.schemaVersion === "1.0.0") return convertParsedToLegacy(parsed);
              if (parsed && typeof parsed === "object" && "lines" in parsed) return parsed;
              return { lines: parsed || {} };
            } catch {
              return undefined;
            }
          })(),
          vypisyPrijmy: (() => {
            if (p.vypisyPrijmy == null) return undefined;
            try {
              return typeof p.vypisyPrijmy === "string" ? JSON.parse(p.vypisyPrijmy || "{}") : p.vypisyPrijmy;
            } catch {
              return undefined;
            }
          })(),
        }))
      : undefined,
    soubory: (c.files ?? []).map((f: any) => {
      const role = personRoleForCaseFile(c, f.path);
      const applicantId = role ? applicantIdForPersonRole(c.id, role) : undefined;
      return {
        id: f.id,
        name: f.name,
        type: f.type,
        url: `/uploads/${c.id}/${path.basename(f.path)}`,
        ...(applicantId ? { applicantId } : {}),
      };
    }),
    isActive: c.isActive,
    lead: c.lead ? { id: c.lead.id, ico: c.lead.intakeSession?.ico ?? undefined } : undefined,
  };
}

// PATCH /api/cases/:id/status – změna stavu obchodu (deal pipeline), trigger notifikace tipaře
router.patch("/:id/status", async (req, res) => {
  const userId = (req as any).user.userId;
  const caseId = req.params.id;
  const newStatus = req.body?.status as string | undefined;
  if (!newStatus || !DEAL_STATUS_VALUES.includes(newStatus as any)) {
    res.status(400).json({ error: "Neplatný stav. Povolené: NEW, DATA_EXTRACTED, SENT_TO_BANK, APPROVED, SIGNED_BY_CLIENT, CLOSED, LOST." });
    return;
  }
  const existing = await prisma.case.findFirst({
    where: { id: caseId, userId },
    include: { lead: true },
  });
  if (!existing) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }
  const previousDealStatus = deriveDealStatus(existing);
  await prisma.case.update({
    where: { id: caseId },
    data: { dealStatus: newStatus as any },
  });
  if (existing.leadId && existing.lead?.source === "REFERRER") {
    const { mapToReferrerVisibleStatus } = await import("../lib/referrerStatus.js");
    const { isQueueAvailable, addSendReferrerStatusJob } = await import("../lib/queue.js");
    const prevVisible = mapToReferrerVisibleStatus(
      existing.lead,
      null,
      { dealStatus: previousDealStatus }
    );
    const nextVisible = mapToReferrerVisibleStatus(existing.lead, null, { dealStatus: newStatus });
    if (prevVisible !== nextVisible && isQueueAvailable()) {
      await addSendReferrerStatusJob({
        referrerId: existing.lead.referrerId!,
        leadId: existing.lead.id,
        visibleStatus: nextVisible,
      });
    }
  }
  const updated = await prisma.case.findUnique({
    where: { id: caseId },
    include: { extractedData: true, files: true, documents: true },
  });
  res.json(toCaseResponseWithProgress(updated));
});

// Seznam případů přihlášeného uživatele
router.get("/", async (req, res) => {
  const userId = (req as any).user.userId;
  const cases = await prisma.case.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { extractedData: true, files: true, documents: true },
  });
  res.json(cases.map(toCaseResponseWithProgress));
});

// Jeden případ
router.get("/:id", async (req, res) => {
  const userId = (req as any).user.userId;
  const c = await prisma.case.findFirst({
    where: { id: req.params.id, userId },
    include: { extractedData: true, files: true, documents: true, lead: { include: { intakeSession: true } } },
  });
  if (!c) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }
  res.json(toCaseResponseWithProgress(c));
});

// Aktivní případ (pro zkratky)
router.get("/active/current", async (req, res) => {
  const userId = (req as any).user.userId;
  const c = await prisma.case.findFirst({
    where: { userId, isActive: true },
    include: { extractedData: true, files: true, documents: true },
  });
  if (!c) {
    res.json({ case: null });
    return;
  }
  res.json({ case: toCaseResponseWithProgress(c) });
});

// FillModel pro rozšíření prohlížeče (aktivní případ → normalizovaná data pro vyplňování)
router.get("/active/current/fill-model", async (req, res) => {
  const userId = (req as any).user.userId;
  const c = await prisma.case.findFirst({
    where: { userId, isActive: true },
    include: { extractedData: true },
  });
  if (!c) {
    res.status(404).json({ error: "Nemáš aktivní případ. Zvol případ v HypoManageru a označ ho jako aktivní." });
    return;
  }
  res.json(caseToFillModel(c));
});

// Vytvoření případu
router.post("/", async (req, res) => {
  const userId = (req as any).user.userId;
  const body = req.body as {
    jmeno?: string;
    datum?: string;
    status?: string;
    vyseUveru?: number;
    ucel?: string;
    extractedData?: any;
  };

  const jmeno = (body.jmeno ?? "").trim() || "Nový klient";
  const datum =
    body.datum ??
    new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

  const c = await prisma.case.create({
    data: {
      userId,
      jmeno,
      datum,
      status: body.status ?? "novy",
      vyseUveru: body.vyseUveru ?? null,
      ucel: body.ucel ?? null,
      isActive: false,
    },
    include: { extractedData: true, files: true, documents: true },
  });

  if (body.extractedData) {
    const first = Array.isArray(body.extractedData) ? body.extractedData[0] : body.extractedData;
    if (first) {
      await prisma.extractedData.create({
        data: {
          caseId: c.id,
          personIndex: 0,
          jmeno: first.jmeno ?? "",
          prijmeni: first.prijmeni ?? "",
          rc: first.rc ?? "",
          adresa: first.adresa ?? "",
          prijmy: first.prijmy ?? 0,
          vydaje: first.vydaje ?? 0,
        },
      });
    }
  }

  const updated = await prisma.case.findUnique({
    where: { id: c.id },
    include: { extractedData: true, files: true, documents: true },
  });
  res.status(201).json(toCaseResponseWithProgress(updated!));
});

// Nový případ z více souborů (daňové, výpisy, 2+ OP – klient + partner)
const allowedTypes = ["op-predni", "op-zadni", "danove", "vypisy"];
router.post("/from-files", uploadMemory.array("files", 20), async (req, res) => {
  const userId = (req as any).user.userId;
  const files = (req as any).files as Express.Multer.File[];
  const typesRaw = (req.body?.types as string) ?? "";
  const types = typesRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const useAutoDetect = types.length < files.length;

  if (!files?.length) {
    res.status(400).json({ error: "Nahrajte alespoň jeden soubor." });
    return;
  }

  const datum = new Date().toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const c = await prisma.case.create({
    data: {
      userId,
      jmeno: "Nový klient",
      datum,
      status: "novy",
      isActive: false,
    },
  });
  const caseId = c.id;
  const caseDir = getCaseUploadDir(caseId);

  type FileRecord = { fileType: string; ocrText: string; filePath: string; idPayload: unknown | null };
  const records: FileRecord[] = [];

  console.log("[API] Nový případ ze souborů, počet:", files.length, "| auto-detekce:", useAutoDetect);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.originalname) || "";
    const base = (file.originalname || "file").replace(/\.[^.]+$/, "").slice(0, 50);
    const filename = `${base}-${Date.now()}-${i}${ext}`;
    const filePath = path.join(caseDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    let fileType: string;
    let ocrText = "";
    let idPayload: unknown | null = null;

    if (!useAutoDetect && allowedTypes.includes(types[i])) {
      fileType = types[i];
      if (fileType === "op-predni" || fileType === "op-zadni") {
        const slug = getIdExtractorSlug();
        if (slug) {
          idPayload = await executeExtractorJson(filePath, {
            slug,
            uploadFilename: file.originalname || filename,
          });
        }
      }
    } else {
      const textForClassification = await getTextForClassification(filePath);
      const detectedType = detectDocumentType(textForClassification, file.originalname || filename);
      fileType = isAllowedDocumentType(detectedType) ? detectedType : "vypisy";
      if (fileType === "op-predni" || fileType === "op-zadni") {
        const slug = getIdExtractorSlug();
        if (slug) {
          idPayload = await executeExtractorJson(filePath, {
            slug,
            uploadFilename: file.originalname || filename,
          });
        }
      } else {
        ocrText = textForClassification;
      }
    }

    console.log("[API] Soubor", i + 1, "/", files.length, ":", file.originalname, "| typ:", fileType, "| OCR znaků:", ocrText.length);
    records.push({ fileType, ocrText, filePath, idPayload });

    const relPath = path.join(caseId, filename);
    await prisma.caseFile.create({
      data: {
        caseId,
        type: fileType,
        name: file.originalname || filename,
        path: relPath,
        mimeType: file.mimetype ?? undefined,
      },
    });
  }

  const predniIndices = records.map((r, i) => (r.fileType === "op-predni" ? i : -1)).filter((i) => i >= 0);
  const zadniIndices = records.map((r, i) => (r.fileType === "op-zadni" ? i : -1)).filter((i) => i >= 0);
  const numPersons = Math.max(predniIndices.length, zadniIndices.length, 1);
  for (let personIndex = 0; personIndex < numPersons; personIndex++) {
    const payloads: unknown[] = [];
    const seen = new Set<string>();
    for (const idx of [predniIndices[personIndex], zadniIndices[personIndex]]) {
      if (idx === undefined) continue;
      const r = records[idx];
      const h = fileSha256HexSafe(r.filePath);
      if (h && seen.has(h)) continue;
      if (h) seen.add(h);
      if (r.idPayload) payloads.push(r.idPayload);
    }
    console.log("[API] Osoba", personIndex, "| ID payloads:", payloads.length, "| predni:", predniIndices[personIndex], "zadni:", zadniIndices[personIndex]);
    if (!payloads.length) continue;
    try {
      for (const payload of payloads) {
        const parsed = parseDoctlyIdExtraction(payload);
        if (!parsed) continue;
        await mergeDoctlyIdExtractedData(caseId, parsed, personIndex);
      }
    } catch (err) {
      console.error("[cases] Extrakce OP pro osobu", personIndex, "selhala:", err);
    }
  }

  let allData = await prisma.extractedData.findMany({
    where: { caseId },
    orderBy: { personIndex: "asc" },
  });
  if (allData.length === 0) {
    if (allData.length === 0 && (predniIndices.length > 0 || zadniIndices.length > 0)) {
      await prisma.extractedData.create({
        data: {
          caseId,
          personIndex: 0,
          jmeno: "",
          prijmeni: "",
          rc: "",
          adresa: "",
          prijmy: 0,
          vydaje: 0,
        },
      });
      allData = await prisma.extractedData.findMany({
        where: { caseId },
        orderBy: { personIndex: "asc" },
      });
      console.log("[API] Vytvořen prázdný záznam – vyplňte data z OP ručně.");
    }
  }
  const danoveIndices = records.map((r, i) => (r.fileType === "danove" ? i : -1)).filter((i) => i >= 0);
  for (let di = 0; di < danoveIndices.length; di++) {
    const personIndex = di;
    const filePath = records[danoveIndices[di]].filePath;
    try {
      let dpData = await extractDapFromFile(filePath);
      const hasDpContent =
        (dpData.rows && Object.values(dpData.rows).some((v) => v != null)) ||
        dpData.meta?.dicNormalized ||
        (dpData.rawText && dpData.rawText.trim().length > 0);
      if (hasDpContent) {
        dpData = await enrichParsedDapFromAres(dpData);
        const json = JSON.stringify(dpData);
        await prisma.extractedData.upsert({
          where: { caseId_personIndex: { caseId, personIndex } },
          create: {
            caseId,
            personIndex,
            jmeno: "",
            prijmeni: "",
            rc: "",
            adresa: "",
            prijmy: 0,
            vydaje: 0,
            dpData: json,
          },
          update: { dpData: json },
        });
        console.log("[API] DP přiřazeno osobě", personIndex);
      }
    } catch (err) {
      console.error("[cases] Extrakce DP pro osobu", personIndex, "selhala:", err);
    }
  }
  allData = await prisma.extractedData.findMany({
    where: { caseId },
    orderBy: { personIndex: "asc" },
  });

  const vypisyIndices = records.map((r, i) => (r.fileType === "vypisy" ? i : -1)).filter((i) => i >= 0);
  const numPersonsForVypisy = Math.max(allData.length, 1);
  const personIndexByFileIndex = new Map<number, number>();
  for (let i = 0; i < vypisyIndices.length; i++) {
    const recordIdx = vypisyIndices[i];
    const filePath = records[recordIdx].filePath;
    let personIndex: number;
    try {
      const text = await getTextFromFile(filePath);
      const holderName = extractAccountHolderFromText(text);
      const matched = findPersonIndexByHolderName(holderName, allData);
      personIndex = matched ?? (i % numPersonsForVypisy);
      if (holderName && matched != null) {
        console.log("[API] Výpis přiřazen k osobě", personIndex, "podle jména:", holderName);
      }
    } catch {
      personIndex = i % numPersonsForVypisy;
    }
    personIndexByFileIndex.set(recordIdx, personIndex);
  }
  const fileIndicesByPerson = new Map<number, number[]>();
  for (const recordIdx of vypisyIndices) {
    const p = personIndexByFileIndex.get(recordIdx) ?? 0;
    if (!fileIndicesByPerson.has(p)) fileIndicesByPerson.set(p, []);
    fileIndicesByPerson.get(p)!.push(recordIdx);
  }
  for (const [p, personVypisyIndices] of fileIndicesByPerson) {
    if (personVypisyIndices.length === 0) continue;
    const fileResults: VypisyExtractResult[] = [];
    for (const idx of personVypisyIndices) {
      try {
        const res = await extractVypisyFromFile(records[idx].filePath);
        if (Object.keys(res).length > 0) fileResults.push(res);
      } catch (err) {
        console.error("[cases] Extrakce výpisu", records[idx].filePath, "selhala:", err);
      }
    }
    if (fileResults.length > 0) {
      const merged = mergeVypisyMonths(fileResults);
      if (Object.keys(merged).length > 0) {
        const json = JSON.stringify(merged);
        await prisma.extractedData.upsert({
          where: { caseId_personIndex: { caseId, personIndex: p } },
          create: {
            caseId,
            personIndex: p,
            jmeno: "",
            prijmeni: "",
            rc: "",
            adresa: "",
            prijmy: 0,
            vydaje: 0,
            vypisyPrijmy: json,
          },
          update: { vypisyPrijmy: json },
        });
        console.log("[API] Výpisy přiřazeny osobě", p);
      }
    }
  }
  allData = await prisma.extractedData.findMany({
    where: { caseId },
    orderBy: { personIndex: "asc" },
  });

  const first = allData[0];
  const fullName = first ? [first.jmeno, first.prijmeni].filter(Boolean).join(" ") : "";
  await prisma.case.update({
    where: { id: caseId },
    data: {
      jmeno: fullName || "Nový klient",
      status: allData.length ? "data-vytazena" : undefined,
    },
  });

  const updated = await prisma.case.findUnique({
    where: { id: caseId },
    include: { extractedData: true, files: true, documents: true },
  });
  res.status(201).json(toCaseResponseWithProgress(updated!));
});

// Aktualizace případu
router.patch("/:id", async (req, res) => {
  const userId = (req as any).user.userId;
  const body = req.body as any;

  const existing = await prisma.case.findFirst({
    where: { id: req.params.id, userId },
    include: { extractedData: true },
  });
  if (!existing) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }

  const updateData: any = {};
  if (body.jmeno !== undefined) updateData.jmeno = String(body.jmeno).trim();
  if (body.datum !== undefined) updateData.datum = String(body.datum);
  if (body.status !== undefined) updateData.status = body.status;
  if (body.dealStatus !== undefined) updateData.dealStatus = DEAL_STATUS_VALUES.includes(body.dealStatus) ? body.dealStatus : undefined;
  if (body.vyseUveru !== undefined) updateData.vyseUveru = body.vyseUveru == null ? null : Number(body.vyseUveru);
  if (body.ucel !== undefined) updateData.ucel = body.ucel == null ? null : String(body.ucel);
  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

  if (body.isActive === true) {
    await prisma.case.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  await prisma.case.update({
    where: { id: req.params.id },
    data: updateData,
  });

  if (body.extractedData) {
    const persons = Array.isArray(body.extractedData) ? body.extractedData : [body.extractedData];
    const existingList = existing.extractedData ?? [];
    const keptPersonIndices = new Set<number>();
    for (let i = 0; i < persons.length; i++) {
      const d = persons[i];
      const personIndex = d.personIndex ?? i;
      keptPersonIndices.add(personIndex);
      const prev = existingList.find((p: any) => p.personIndex === personIndex);
      const dpJson = d.dpData != null ? (typeof d.dpData === "string" ? d.dpData : JSON.stringify(d.dpData)) : undefined;
      const vypisyJson = d.vypisyPrijmy != null ? (typeof d.vypisyPrijmy === "string" ? d.vypisyPrijmy : JSON.stringify(d.vypisyPrijmy)) : undefined;
      await prisma.extractedData.upsert({
        where: { caseId_personIndex: { caseId: req.params.id, personIndex } },
        create: {
          caseId: req.params.id,
          personIndex,
          jmeno: d.jmeno ?? "",
          prijmeni: d.prijmeni ?? "",
          rc: d.rc ?? "",
          adresa: d.adresa ?? "",
          prijmy: d.prijmy ?? 0,
          vydaje: d.vydaje ?? 0,
          ...(dpJson !== undefined && { dpData: dpJson }),
          ...(vypisyJson !== undefined && { vypisyPrijmy: vypisyJson }),
        },
        update: {
          jmeno: d.jmeno ?? prev?.jmeno ?? "",
          prijmeni: d.prijmeni ?? prev?.prijmeni ?? "",
          rc: d.rc ?? prev?.rc ?? "",
          adresa: d.adresa ?? prev?.adresa ?? "",
          prijmy: d.prijmy ?? prev?.prijmy ?? 0,
          vydaje: d.vydaje ?? prev?.vydaje ?? 0,
          ...(dpJson !== undefined && { dpData: dpJson }),
          ...(vypisyJson !== undefined && { vypisyPrijmy: vypisyJson }),
        },
      });
    }
    // Odstranit z DB řádky extractedData, které už v payload nejsou (odebrání spolužadatele)
    await prisma.extractedData.deleteMany({
      where: {
        caseId: req.params.id,
        personIndex: { notIn: Array.from(keptPersonIndices) },
      },
    });
  }

  const updated = await prisma.case.findUnique({
    where: { id: req.params.id },
    include: { extractedData: true, files: true, documents: true },
  });
  res.json(toCaseResponseWithProgress(updated!));
});

// Nastavení aktivního případu
router.post("/:id/active", async (req, res) => {
  const userId = (req as any).user.userId;
  const id = req.params.id;

  const c = await prisma.case.findFirst({ where: { id, userId } });
  if (!c) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }

  await prisma.case.updateMany({
    where: { userId },
    data: { isActive: false },
  });
  await prisma.case.update({
    where: { id },
    data: { isActive: true },
  });

  const updated = await prisma.case.findUnique({
    where: { id },
    include: { extractedData: true, files: true, documents: true },
  });
  res.json(toCaseResponseWithProgress(updated!));
});

// Smazání případu
router.delete("/:id", async (req, res) => {
  const userId = (req as any).user.userId;
  const c = await prisma.case.findFirst({ where: { id: req.params.id, userId } });
  if (!c) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }
  await prisma.case.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Smazání souboru z případu
router.delete("/:id/files/:fileId", async (req, res) => {
  const userId = (req as any).user.userId;
  const { id: caseId, fileId } = req.params;
  const existing = await prisma.case.findFirst({ where: { id: caseId, userId } });
  if (!existing) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }
  const file = await prisma.caseFile.findFirst({
    where: { id: fileId, caseId },
  });
  if (!file) {
    res.status(404).json({ error: "Soubor nenalezen." });
    return;
  }
  await prisma.caseFile.delete({ where: { id: fileId } });
  const updated = await prisma.case.findUnique({
    where: { id: caseId },
    include: { extractedData: true, files: true, documents: true },
  });
  res.status(200).json(toCaseResponseWithProgress(updated!));
});

// Upload souboru k případu
router.post("/:id/files", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message ?? "Chyba nahrávání souboru." });
      return;
    }
    next();
  });
}, async (req, res) => {
  const userId = (req as any).user.userId;
  const caseId = req.params.id;
  const file = (req as any).file;
  if (!file) {
    res.status(400).json({ error: "Žádný soubor." });
    return;
  }

  const existing = await prisma.case.findFirst({ where: { id: caseId, userId } });
  if (!existing) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }

  const type = (req.body?.type as string) ?? "vypisy";
  const allowed = ["op-predni", "op-zadni", "danove", "vypisy"];
  const fileType = allowed.includes(type) ? type : "vypisy";

  console.log("[API] Upload souboru:", file.originalname, "| typ:", fileType);

  const relPath = path.join(caseId, path.basename(file.path));
  await prisma.caseFile.create({
    data: {
      caseId,
      type: fileType,
      name: file.originalname || file.filename,
      path: relPath,
      mimeType: file.mimetype ?? undefined,
    },
  });

  // Automatická extrakce z OP (přední/zadní strana) – podle applicantId → personIndex
  if (fileType === "op-predni" || fileType === "op-zadni") {
    const applicantId = String((req.query as any)?.applicantId ?? req.body?.applicantId ?? "");
    const personFromApplicant = getPersonIndexFromApplicantId(applicantId);
    const personFromParam = Math.max(
      0,
      parseInt(String((req.query as any)?.personIndex ?? req.body?.personIndex ?? 0), 10)
    );
    const personIndex = personFromApplicant ?? personFromParam;
    console.log("[API] Spouštím Doctly extractor pro OP, typ:", fileType, "| applicantId:", applicantId, "| personIndex:", personIndex);
    try {
      const slug = getIdExtractorSlug();
      if (slug) {
        const payload = await executeExtractorJson(file.path, {
          slug,
          uploadFilename: file.originalname || file.filename,
        });
        const parsed = parseDoctlyIdExtraction(payload);
        if (parsed) await mergeDoctlyIdExtractedData(caseId, parsed, personIndex);
        if (personIndex === 0) {
          const data = await prisma.extractedData.findFirst({ where: { caseId, personIndex: 0 } });
          const fullName = data ? [data.jmeno, data.prijmeni].filter(Boolean).join(" ") : "";
          await prisma.case.update({
            where: { id: caseId },
            data: { jmeno: fullName || undefined, status: "data-vytazena" },
          });
        }
      } else {
        console.warn("[cases] Chybí DOCTLY_ID_EXTRACTOR_SLUG, OP extrakce přeskočena.");
      }
    } catch (err) {
      console.error("[cases] Extrakce OP selhala:", err);
    }
  }

  if (fileType === "danove") {
    const applicantId = String((req.query as any)?.applicantId ?? req.body?.applicantId ?? "");
    const personFromApplicant = getPersonIndexFromApplicantId(applicantId);
    const personFromParam = Math.max(
      0,
      parseInt(String((req.query as any)?.personIndex ?? req.body?.personIndex ?? 0), 10)
    );
    const personIndex = personFromApplicant ?? personFromParam;
    try {
      let dpData = await extractDapFromFile(file.path);
      const hasDpContent =
        (dpData.rows && Object.values(dpData.rows).some((v) => v != null)) ||
        dpData.meta?.dicNormalized ||
        (dpData.rawText && dpData.rawText.trim().length > 0);
      if (hasDpContent) {
        dpData = await enrichParsedDapFromAres(dpData);
        const json = JSON.stringify(dpData);
        await prisma.extractedData.upsert({
          where: { caseId_personIndex: { caseId, personIndex } },
          create: {
            caseId,
            personIndex,
            jmeno: "",
            prijmeni: "",
            rc: "",
            adresa: "",
            prijmy: 0,
            vydaje: 0,
            dpData: json,
          },
          update: { dpData: json },
        });
      }
    } catch (err) {
      console.error("[cases] Extrakce DP selhala:", err);
    }
  }

  if (fileType === "vypisy") {
    const applicantId = String((req.query as any)?.applicantId ?? req.body?.applicantId ?? "");
    const personFromApplicant = getPersonIndexFromApplicantId(applicantId);
    const personFromParam = Math.max(
      0,
      parseInt(String(req.body?.personIndex ?? 0), 10)
    );
    let personIndex = personFromApplicant ?? personFromParam;
    try {
      const allData = await prisma.extractedData.findMany({
        where: { caseId },
        orderBy: { personIndex: "asc" },
        select: { jmeno: true, prijmeni: true, personIndex: true },
      });
      const text = await getTextFromFile(file.path);
      const holderName = extractAccountHolderFromText(text);
      const matched = findPersonIndexByHolderName(holderName, allData);
      if (matched != null) {
        personIndex = matched;
        if (holderName) console.log("[API] Výpis přiřazen k osobě", personIndex, "podle jména:", holderName);
      }
      const extracted = await extractVypisyFromFile(file.path);
      if (Object.keys(extracted).length > 0) {
        const existing = await prisma.extractedData.findUnique({
          where: { caseId_personIndex: { caseId, personIndex } },
        });
        let merged: VypisyExtractResult;
        if (existing?.vypisyPrijmy) {
          try {
            const prev = JSON.parse(existing.vypisyPrijmy) as VypisyExtractResult;
            merged = mergeVypisyMonths([prev, extracted]);
          } catch {
            merged = extracted;
          }
        } else {
          merged = extracted;
        }
        const json = JSON.stringify(merged);
        await prisma.extractedData.upsert({
          where: { caseId_personIndex: { caseId, personIndex } },
          create: {
            caseId,
            personIndex,
            jmeno: "",
            prijmeni: "",
            rc: "",
            adresa: "",
            prijmy: 0,
            vydaje: 0,
            vypisyPrijmy: json,
          },
          update: { vypisyPrijmy: json },
        });
      }
    } catch (err) {
      console.error("[cases] Extrakce výpisu selhala:", err);
    }
  }

  const updated = await prisma.case.findUnique({
    where: { id: caseId },
    include: { extractedData: true, files: true, documents: true },
  });
  res.status(201).json(toCaseResponseWithProgress(updated!));
});

// Nahraj a parsuj raw text z Doctly (když automatický upload nedostane data)
router.post("/:id/dp/parse-raw", async (req, res) => {
  const userId = (req as any).user.userId;
  const caseId = req.params.id;
  const rawText = String(req.body?.rawText ?? "").trim();
  const applicantId = String(req.body?.applicantId ?? (req.query as any)?.applicantId ?? "");
  const personFromApplicant = getPersonIndexFromApplicantId(applicantId);
  const personFromParam = Math.max(
    0,
    parseInt(String(req.body?.personIndex ?? (req.query as any)?.personIndex ?? 0), 10)
  );
  const personIndex = personFromApplicant ?? personFromParam;

  if (!rawText) {
    res.status(400).json({ error: "Chybí rawText v těle požadavku." });
    return;
  }

  const existing = await prisma.case.findFirst({ where: { id: caseId, userId } });
  if (!existing) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }

  setExtractionInProgress(caseId, true);
  try {
    let reparsed = extractDapFromText(rawText, `parse-raw:${caseId}:${personIndex}`);
    reparsed = await enrichParsedDapFromAres(reparsed);
    const json = JSON.stringify(reparsed);
    await prisma.extractedData.upsert({
      where: { caseId_personIndex: { caseId, personIndex } },
      create: {
        caseId,
        personIndex,
        jmeno: "",
        prijmeni: "",
        rc: "",
        adresa: "",
        prijmy: 0,
        vydaje: 0,
        dpData: json,
      },
      update: { dpData: json },
    });

    const updated = await prisma.case.findUnique({
      where: { id: caseId },
      include: { extractedData: true, files: true, documents: true },
    });
    res.status(200).json(toCaseResponseWithProgress(updated!));
  } catch (err) {
    console.error("[cases] DP parse-raw selhal:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Načtení dat z textu selhalo." });
  } finally {
    setExtractionInProgress(caseId, false);
  }
});

// Re-parse DP z již uloženého raw textu (bez volání Doctly, bez kreditů)
router.post("/:id/dp/reparse", async (req, res) => {
  const userId = (req as any).user.userId;
  const caseId = req.params.id;
  const applicantId = String(req.body?.applicantId ?? (req.query as any)?.applicantId ?? "");
  const personFromApplicant = getPersonIndexFromApplicantId(applicantId);
  const personFromParam = Math.max(
    0,
    parseInt(String(req.body?.personIndex ?? (req.query as any)?.personIndex ?? 0), 10)
  );
  const personIndex = personFromApplicant ?? personFromParam;

  const existing = await prisma.case.findFirst({ where: { id: caseId, userId } });
  if (!existing) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }

  const dataRow = await prisma.extractedData.findUnique({
    where: { caseId_personIndex: { caseId, personIndex } },
  });
  if (!dataRow?.dpData) {
    res.status(400).json({ error: "Pro tohoto žadatele nejsou uložená data DP." });
    return;
  }

  let parsed: any;
  try {
    parsed = typeof dataRow.dpData === "string" ? JSON.parse(dataRow.dpData) : dataRow.dpData;
  } catch {
    res.status(400).json({ error: "Uložená data DP nelze přečíst." });
    return;
  }

  const rawText = String(parsed?.rawText ?? "").trim();
  if (!rawText) {
    res.status(400).json({ error: "Chybí uložený raw výstup z Doctly. Nahrajte DP znovu." });
    return;
  }

  setExtractionInProgress(caseId, true);
  try {
    let reparsed = extractDapFromText(rawText, `cached:${caseId}:${personIndex}`);
    reparsed = await enrichParsedDapFromAres(reparsed);
    // Při re-parsu zachovat předchozí IČ/DIČ, pokud nový výstup z Doctly je neplatný (např. chybný CZ02)
    const prevMeta = parsed?.meta;
    if (prevMeta && reparsed.meta) {
      if (!reparsed.meta.icoCandidate && prevMeta.icoCandidate) {
        reparsed = { ...reparsed, meta: { ...reparsed.meta, icoCandidate: prevMeta.icoCandidate } };
      }
      if (!reparsed.meta.dicNormalized && prevMeta.dicNormalized && /^CZ\d{8,10}$/.test(String(prevMeta.dicNormalized).replace(/\s/g, ""))) {
        reparsed = {
          ...reparsed,
          meta: {
            ...reparsed.meta,
            dic: prevMeta.dic ?? reparsed.meta.dic,
            dicNormalized: prevMeta.dicNormalized,
          },
        };
      }
    }
    await prisma.extractedData.update({
      where: { caseId_personIndex: { caseId, personIndex } },
      data: { dpData: JSON.stringify(reparsed) },
    });

    const updated = await prisma.case.findUnique({
      where: { id: caseId },
      include: { extractedData: true, files: true, documents: true },
    });
    res.status(200).json(toCaseResponseWithProgress(updated!));
  } catch (err) {
    console.error("[cases] DP reparse selhal:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Znovu načtení dat selhalo." });
  } finally {
    setExtractionInProgress(caseId, false);
  }
});

// Doplnit IČ a CZ-NACE z ARES podle DIČ z DP
router.post("/:id/dp/ares-enrich", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const caseId = req.params.id;
  const applicantId = String(req.body?.applicantId ?? (req.query as any)?.applicantId ?? "");
  const personFromApplicant = getPersonIndexFromApplicantId(applicantId);
  const personFromParam = Math.max(
    0,
    parseInt(String(req.body?.personIndex ?? (req.query as any)?.personIndex ?? 0), 10)
  );
  const personIndex = personFromApplicant ?? personFromParam;

  const existing = await prisma.case.findFirst({ where: { id: caseId, userId } });
  if (!existing) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }

  const dataRow = await prisma.extractedData.findUnique({
    where: { caseId_personIndex: { caseId, personIndex } },
  });
  if (!dataRow?.dpData) {
    res.status(400).json({ error: "Pro tohoto žadatele nejsou uložená data DP." });
    return;
  }

  let parsed: any;
  try {
    parsed = typeof dataRow.dpData === "string" ? JSON.parse(dataRow.dpData) : dataRow.dpData;
  } catch {
    res.status(400).json({ error: "Uložená data DP nelze přečíst." });
    return;
  }

  const dic = String(
    parsed?.meta?.dicNormalized ?? parsed?.dic ?? ""
  ).trim().toUpperCase().replace(/\s+/g, "");
  if (!/^CZ\d{8,10}$/.test(dic)) {
    res.status(400).json({
      error: "DIČ musí být ve formátu CZ + 8 číslic (IČO) nebo CZ + 9–10 číslic (rodné číslo).",
    });
    return;
  }

  let aresResult: Awaited<ReturnType<typeof getAresDataFromDic>>;
  try {
    aresResult = await getAresDataFromDic(dic);
  } catch (err) {
    res.status(502).json({
      error: "ARES nedostupný nebo chyba.",
      reason: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (aresResult.ico == null && aresResult.czNacePrevazujici == null) {
    const c = await prisma.case.findUnique({
      where: { id: caseId },
      include: { extractedData: true, files: true, documents: true },
    });
    res.status(200).json(toCaseResponseWithProgress(c!));
    return;
  }

  if (parsed?.schemaVersion === "1.0.0") {
    parsed.meta = parsed.meta ?? {};
    if (aresResult.ico != null) parsed.meta.icoCandidate = aresResult.ico;
    if (aresResult.czNacePrevazujici != null) parsed.meta.czNacePrevazujici = aresResult.czNacePrevazujici;
  } else {
    if (aresResult.ico != null) parsed.ic = aresResult.ico;
    if (aresResult.czNacePrevazujici != null) parsed.czNace = aresResult.czNacePrevazujici;
  }

  await prisma.extractedData.update({
    where: { caseId_personIndex: { caseId, personIndex } },
    data: { dpData: JSON.stringify(parsed) },
  });

  const updated = await prisma.case.findUnique({
    where: { id: caseId },
    include: { extractedData: true, files: true, documents: true },
  });
  res.status(200).json(toCaseResponseWithProgress(updated!));
});

// Re-parse OP z uloženého JSON/textu (bez nového volání Doctly/OCR)
router.post("/:id/op/reparse", async (req, res) => {
  const userId = (req as any).user.userId;
  const caseId = req.params.id;
  const applicantId = String(req.body?.applicantId ?? (req.query as any)?.applicantId ?? "");
  const personFromApplicant = getPersonIndexFromApplicantId(applicantId);
  const personFromParam = Math.max(
    0,
    parseInt(String(req.body?.personIndex ?? (req.query as any)?.personIndex ?? 0), 10)
  );
  const personIndex = personFromApplicant ?? personFromParam;

  const existing = await prisma.case.findFirst({ where: { id: caseId, userId } });
  if (!existing) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }

  const dataRow = await prisma.extractedData.findUnique({
    where: { caseId_personIndex: { caseId, personIndex } },
  });
  const rawJson = (dataRow?.opDoctlyJson ?? "").trim();
  if (rawJson) {
    try {
      const payload = JSON.parse(rawJson);
      const parsed = parseDoctlyIdExtraction(payload);
      if (!parsed) {
        res.status(400).json({ error: "Uložený JSON z OP nelze zpracovat." });
        return;
      }
      await mergeDoctlyIdExtractedData(caseId, parsed, personIndex);
    } catch {
      res.status(400).json({ error: "Uložený JSON z OP nelze přečíst." });
      return;
    }
  } else {
    const rawText = (dataRow?.opRawText ?? "").trim();
    if (!rawText) {
      res.status(400).json({ error: "Chybí uložený raw výstup z OP. Nahrajte OP znovu." });
      return;
    }
    await extractOnePersonFromOpTexts(rawText, caseId, personIndex);
  }

  const updated = await prisma.case.findUnique({
    where: { id: caseId },
    include: { extractedData: true, files: true, documents: true },
  });
  res.status(200).json(toCaseResponseWithProgress(updated!));
});

// Re-parse výpisů z již uložených souborů (bez znovu-nahrávání)
router.post("/:id/vypisy/reparse", async (req, res) => {
  const userId = (req as any).user.userId;
  const caseId = req.params.id;
  const applicantId = String(req.body?.applicantId ?? (req.query as any)?.applicantId ?? "");
  const personFromApplicant = getPersonIndexFromApplicantId(applicantId);
  const personFromParam = Math.max(
    0,
    parseInt(String(req.body?.personIndex ?? (req.query as any)?.personIndex ?? 0), 10)
  );
  const personIndex = personFromApplicant ?? personFromParam;

  const existing = await prisma.case.findFirst({ where: { id: caseId, userId } });
  if (!existing) {
    res.status(404).json({ error: "Případ nenalezen." });
    return;
  }

  const files = await prisma.caseFile.findMany({
    where: { caseId, type: "vypisy" },
  });
  if (files.length === 0) {
    res.status(400).json({ error: "Pro tento případ nejsou uložené výpisy. Nahrajte výpisy." });
    return;
  }

  const allData = await prisma.extractedData.findMany({
    where: { caseId },
    orderBy: { personIndex: "asc" },
    select: { jmeno: true, prijmeni: true, personIndex: true },
  });
  const baseDir = getUploadDir();

  const toMerge: VypisyExtractResult[] = [];
  for (const f of files) {
    const fullPath = path.join(baseDir, f.path);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const text = await getTextFromFile(fullPath);
      const holderName = extractAccountHolderFromText(text);
      const matched = findPersonIndexByHolderName(holderName, allData);
      const filePersonIndex = matched ?? personIndex;
      if (filePersonIndex !== personIndex) continue;
      const vypisyResult = await extractVypisyFromFile(fullPath);
      if (Object.keys(vypisyResult).length > 0) toMerge.push(vypisyResult);
    } catch (err) {
      console.error("[cases] Extrakce výpisu pro reparse selhala:", f.path, err);
    }
  }

  if (toMerge.length === 0) {
    res.status(400).json({ error: "Pro tohoto žadatele nejsou odpovídající výpisy (žádný soubor neodpovídá jménu nebo žádný není dostupný)." });
    return;
  }

  const merged = mergeVypisyMonths(toMerge);
  const json = JSON.stringify(merged);
  await prisma.extractedData.upsert({
    where: { caseId_personIndex: { caseId, personIndex } },
    create: {
      caseId,
      personIndex,
      jmeno: "",
      prijmeni: "",
      rc: "",
      adresa: "",
      prijmy: 0,
      vydaje: 0,
      vypisyPrijmy: json,
    },
    update: { vypisyPrijmy: json },
  });

  const updated = await prisma.case.findUnique({
    where: { id: caseId },
    include: { extractedData: true, files: true, documents: true },
  });
  res.status(200).json(toCaseResponseWithProgress(updated!));
});

export { router as casesRouter };
