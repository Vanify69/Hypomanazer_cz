/**
 * Spustí extrakci dat (OP, DP, výpisy) pro existující případ.
 * Volá se z jobu po convertLeadToCase. Použije CaseFile záznamy a naplní ExtractedData.
 */
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { getUploadDir } from "../lib/upload.js";
import { mergeDoctlyIdExtractedData } from "../lib/extractOp.js";
import { getTextForClassification } from "../lib/classification.js";
import { executeExtractorJson } from "../lib/doctly.js";
import { parseDoctlyIdExtraction } from "../lib/doctlyId.js";
import { extractDapFromFile, enrichParsedDapFromAres } from "../lib/extractDap.js";
import {
  extractAccountHolderFromText,
  extractVypisyFromFile,
  getTextFromFile,
  mergeVypisyMonths,
  normalizeNameForMatch,
  type VypisyExtractResult,
} from "../lib/extractVypisy.js";

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

function roleToPersonIndex(role: string): number {
  return role === "CO_APPLICANT" ? 1 : 0;
}

/** Stejný vzor jako convertLeadToCase: `ID_FRONT-APPLICANT-{cuid}.ext` */
function parseIntakePathPersonIndex(normPath: string): number | null {
  const base = path.basename(normPath.replace(/\\/g, "/"));
  if (/-CO_APPLICANT-/.test(base)) return 1;
  if (/-APPLICANT-/.test(base)) return 0;
  return null;
}

function normPathKey(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Název souboru v Doctly podle Document (správná role i když diskový basename chybně obsahuje jen APPLICANT). */
function doctlyUploadFilenameForCasePath(
  casePathNorm: string,
  docs: { id: string; storageKey: string; docType: string; personRole: string }[]
): string | undefined {
  const norm = normPathKey(casePathNorm);
  const d = docs.find((x) => normPathKey(x.storageKey) === norm);
  if (!d) return undefined;
  const ext = path.extname(norm) || ".bin";
  return `${d.docType}-${d.personRole}-${d.id}${ext}`;
}

type RecordLike = {
  fileType: string;
  ocrText: string;
  filePath: string;
  personIndex: number | null;
  casePathNorm: string;
};

type OpWorkItem = {
  filePath: string;
  fileType: string;
  personIndex: number | null;
  casePathNorm: string;
  doctlyName?: string;
};

function fileSha256Hex(filePath: string): string | null {
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  } catch {
    return null;
  }
}

/**
 * Stejný binární soubor v slotu přední i zadní → jedno volání Doctly/OCR, text jednou.
 * Název v Doctly: ID_FRONT_AND_BACK pokud jde o sloučení přední+zadní stejného PDF.
 */
async function extractUniqueOpJsonForPerson(items: OpWorkItem[]): Promise<unknown[]> {
  if (items.length === 0) return [];
  const slug = process.env.DOCTLY_ID_EXTRACTOR_SLUG?.trim();
  if (!slug) return [];
  const sorted = [...items].sort((a, b) => {
    const pa = a.personIndex ?? 999;
    const pb = b.personIndex ?? 999;
    if (pa !== pb) return pa - pb;
    if (a.fileType !== b.fileType) return a.fileType === "op-predni" ? -1 : 1;
    return a.casePathNorm.localeCompare(b.casePathNorm);
  });
  const byHash = new Map<string, OpWorkItem[]>();
  for (const it of sorted) {
    const h = fileSha256Hex(it.filePath);
    if (!h) continue;
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h)!.push(it);
  }
  const payloads: unknown[] = [];
  for (const group of byHash.values()) {
    const first = group[0];
    const hasFront = group.some((x) => x.fileType === "op-predni");
    const hasBack = group.some((x) => x.fileType === "op-zadni");
    const frontItem = group.find((x) => x.fileType === "op-predni") ?? first;
    let uploadName = frontItem.doctlyName;
    if (hasFront && hasBack && uploadName) {
      if (uploadName.includes("ID_FRONT")) {
        uploadName = uploadName.replace("ID_FRONT", "ID_FRONT_AND_BACK");
      } else if (uploadName.includes("ID_BACK")) {
        uploadName = uploadName.replace("ID_BACK", "ID_FRONT_AND_BACK");
      }
    }
    const extracted = await executeExtractorJson(first.filePath, {
      slug,
      uploadFilename: uploadName,
    });
    if (extracted) payloads.push(extracted);
  }
  return payloads;
}

export async function runExtractionsForCase(caseId: string): Promise<void> {
  const baseDir = getUploadDir();
  const caseFiles = await prisma.caseFile.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
  });
  if (caseFiles.length === 0) return;

  const documents = await prisma.document.findMany({ where: { caseId } });
  const docIdxByPath = new Map<string, number>();
  for (const d of documents) {
    const k = d.storageKey.replace(/\\/g, "/");
    docIdxByPath.set(k, roleToPersonIndex(String(d.personRole)));
  }

  const records: RecordLike[] = [];
  const opWork: OpWorkItem[] = [];

  for (const f of caseFiles) {
    const pathParts = f.path.replace(/\\/g, "/").split("/").filter(Boolean);
    const filePath = path.join(baseDir, ...pathParts);
    if (!fs.existsSync(filePath)) {
      console.warn("[runExtractions] Soubor nenalezen:", filePath, "| CaseFile.path:", f.path);
    }
    const normPath = f.path.replace(/\\/g, "/");
    let personIndex: number | null = docIdxByPath.get(normPath) ?? null;
    if (personIndex === null) {
      personIndex = parseIntakePathPersonIndex(normPath);
    }

    const doctlyName = doctlyUploadFilenameForCasePath(normPath, documents);

    let ocrText = "";
    if (f.type === "op-predni" || f.type === "op-zadni") {
      opWork.push({
        filePath,
        fileType: f.type,
        personIndex,
        casePathNorm: normPath,
        doctlyName: doctlyName ?? undefined,
      });
    } else {
      try {
        ocrText = await getTextForClassification(filePath);
      } catch {
        ocrText = "";
      }
    }
    records.push({ fileType: f.type, ocrText, filePath, personIndex, casePathNorm: normPath });
  }

  const byMappedPerson = new Map<number, OpWorkItem[]>();
  for (const o of opWork) {
    if (o.personIndex === null) continue;
    if (!byMappedPerson.has(o.personIndex)) byMappedPerson.set(o.personIndex, []);
    byMappedPerson.get(o.personIndex)!.push(o);
  }
  for (const personIndex of Array.from(byMappedPerson.keys()).sort((a, b) => a - b)) {
    const items = byMappedPerson.get(personIndex)!;
    const payloads = await extractUniqueOpJsonForPerson(items);
    if (!payloads.length) continue;
    try {
      for (const payload of payloads) {
        const parsed = parseDoctlyIdExtraction(payload);
        if (!parsed) continue;
        await mergeDoctlyIdExtractedData(caseId, parsed, personIndex);
      }
    } catch {
      /* log and continue */
    }
  }

  const predniIndices = records.map((r, i) => (r.fileType === "op-predni" && r.personIndex === null ? i : -1)).filter((i) => i >= 0);
  const zadniIndices = records.map((r, i) => (r.fileType === "op-zadni" && r.personIndex === null ? i : -1)).filter((i) => i >= 0);
  const numPersonsLegacy = Math.max(predniIndices.length, zadniIndices.length, 1);
  for (let personIndex = 0; personIndex < numPersonsLegacy; personIndex++) {
    const legacyItems: OpWorkItem[] = [];
    if (predniIndices[personIndex] !== undefined) {
      const r = records[predniIndices[personIndex]];
      legacyItems.push({
        filePath: r.filePath,
        fileType: "op-predni",
        personIndex: null,
        casePathNorm: r.casePathNorm,
        doctlyName: doctlyUploadFilenameForCasePath(r.casePathNorm, documents),
      });
    }
    if (zadniIndices[personIndex] !== undefined) {
      const r = records[zadniIndices[personIndex]];
      legacyItems.push({
        filePath: r.filePath,
        fileType: "op-zadni",
        personIndex: null,
        casePathNorm: r.casePathNorm,
        doctlyName: doctlyUploadFilenameForCasePath(r.casePathNorm, documents),
      });
    }
    const payloads = await extractUniqueOpJsonForPerson(legacyItems);
    if (!payloads.length) continue;
    try {
      for (const payload of payloads) {
        const parsed = parseDoctlyIdExtraction(payload);
        if (!parsed) continue;
        await mergeDoctlyIdExtractedData(caseId, parsed, personIndex);
      }
    } catch {
      /* log and continue */
    }
  }

  let allData = await prisma.extractedData.findMany({
    where: { caseId },
    orderBy: { personIndex: "asc" },
  });
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
  }

  const danoveIndices = records.map((r, i) => (r.fileType === "danove" ? i : -1)).filter((i) => i >= 0);
  let dpFallback = 0;
  for (const i of danoveIndices) {
    const r = records[i];
    const personIndex = r.personIndex ?? dpFallback++;
    const filePath = r.filePath;
    const doctlyDpName = doctlyUploadFilenameForCasePath(r.casePathNorm, documents);
    try {
      let dpData = await extractDapFromFile(
        filePath,
        doctlyDpName ? { doctlyUploadFilename: doctlyDpName } : undefined
      );
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
    } catch {
      /* continue */
    }
  }
  allData = await prisma.extractedData.findMany({
    where: { caseId },
    orderBy: { personIndex: "asc" },
  });

  const vypisyIndices = records.map((r, i) => (r.fileType === "vypisy" ? i : -1)).filter((i) => i >= 0);
  const numPersonsForVypisy = Math.max(allData.length, 1);
  const personIndexByFileIndex = new Map<number, number>();
  for (let vi = 0; vi < vypisyIndices.length; vi++) {
    const recordIdx = vypisyIndices[vi];
    const r = records[recordIdx];
    let personIndex: number;
    if (r.personIndex !== null) {
      personIndex = r.personIndex;
    } else {
      try {
        const text = await getTextFromFile(r.filePath);
        const holderName = extractAccountHolderFromText(text);
        const matched = findPersonIndexByHolderName(holderName, allData);
        personIndex = matched ?? (vi % numPersonsForVypisy);
      } catch {
        personIndex = vi % numPersonsForVypisy;
      }
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
      } catch {
        /* continue */
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
      }
    }
  }

  const allExtracted = await prisma.extractedData.findMany({
    where: { caseId },
    orderBy: { personIndex: "asc" },
  });
  const first = allExtracted[0];
  const fullName = first ? [first.jmeno, first.prijmeni].filter(Boolean).join(" ").trim() : "";
  await prisma.case.update({
    where: { id: caseId },
    data: {
      jmeno: fullName || "Nový klient",
      status: "data-vytazena",
    },
  });
  /** APPLICANT před CO_APPLICANT – sedí s personIndex 0 / 1 z OP extrakce. */
  const persons = await prisma.person.findMany({
    where: { caseId },
    orderBy: { role: "asc" },
  });
  for (let i = 0; i < persons.length && i < allExtracted.length; i++) {
    const ex = allExtracted[i];
    if (!ex || (!ex.jmeno?.trim() && !ex.prijmeni?.trim())) continue;
    const p = persons[i];
    if (!p) continue;
    await prisma.person.update({
      where: { id: p.id },
      data: {
        firstName: ex.jmeno?.trim() || p.firstName,
        lastName: ex.prijmeni?.trim() || p.lastName,
      },
    });
  }
}
