/**
 * Spustí extrakci dat (OP, DP, výpisy) pro existující případ.
 * Volá se z jobu po convertLeadToCase. Použije CaseFile záznamy a naplní ExtractedData.
 */
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { getCaseUploadDir, getUploadDir } from "../lib/upload.js";
import { extractOnePersonFromOpTexts } from "../lib/extractOp.js";
import { getTextForClassification } from "../lib/classification.js";
import { isImageFile, recognizeText } from "../lib/ocr.js";
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

export async function runExtractionsForCase(caseId: string): Promise<void> {
  const baseDir = getUploadDir();
  const caseFiles = await prisma.caseFile.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
  });
  if (caseFiles.length === 0) return;

  type RecordLike = { fileType: string; ocrText: string; filePath: string };
  const records: RecordLike[] = [];

  for (const f of caseFiles) {
    const pathParts = f.path.replace(/\\/g, "/").split("/").filter(Boolean);
    const filePath = path.join(baseDir, ...pathParts);
    if (!fs.existsSync(filePath)) {
      console.warn("[runExtractions] Soubor nenalezen:", filePath, "| CaseFile.path:", f.path);
    }
    let ocrText = "";
    if (f.type === "op-predni" || f.type === "op-zadni") {
      try {
        if (isImageFile(filePath)) {
          ocrText = await recognizeText(filePath);
        } else {
          ocrText = await getTextForClassification(filePath);
        }
      } catch (err) {
        console.warn("[runExtractions] OCR/klasifikace selhala pro", filePath, err);
        ocrText = "";
      }
    } else {
      try {
        ocrText = await getTextForClassification(filePath);
      } catch {
        ocrText = "";
      }
    }
    records.push({ fileType: f.type, ocrText, filePath });
  }

  const predniIndices = records.map((r, i) => (r.fileType === "op-predni" ? i : -1)).filter((i) => i >= 0);
  const zadniIndices = records.map((r, i) => (r.fileType === "op-zadni" ? i : -1)).filter((i) => i >= 0);
  const numPersons = Math.max(predniIndices.length, zadniIndices.length, 1);
  for (let personIndex = 0; personIndex < numPersons; personIndex++) {
    const texts: string[] = [];
    if (predniIndices[personIndex] !== undefined) texts.push(records[predniIndices[personIndex]].ocrText);
    if (zadniIndices[personIndex] !== undefined) texts.push(records[zadniIndices[personIndex]].ocrText);
    const combined = texts.filter(Boolean).join("\n\n");
    if (!combined.trim()) continue;
    try {
      await extractOnePersonFromOpTexts(combined, caseId, personIndex);
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
  for (let i = 0; i < vypisyIndices.length; i++) {
    const recordIdx = vypisyIndices[i];
    const filePath = records[recordIdx].filePath;
    let personIndex: number;
    try {
      const text = await getTextFromFile(filePath);
      const holderName = extractAccountHolderFromText(text);
      const matched = findPersonIndexByHolderName(holderName, allData);
      personIndex = matched ?? (i % numPersonsForVypisy);
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
  const persons = await prisma.person.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
  });
  for (let i = 0; i < persons.length && i < allExtracted.length; i++) {
    const ex = allExtracted[i];
    if (!ex || (!ex.jmeno?.trim() && !ex.prijmeni?.trim())) continue;
    await prisma.person.update({
      where: { id: persons[i].id },
      data: {
        firstName: ex.jmeno?.trim() || persons[i].firstName,
        lastName: ex.prijmeni?.trim() || persons[i].lastName,
      },
    });
  }
}
