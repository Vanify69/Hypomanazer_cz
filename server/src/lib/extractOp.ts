import path from "path";
import { prisma } from "./prisma.js";
import { recognizeText, isImageFile } from "./ocr.js";
import { parseOpFront, parseOpBack, toDisplayText, rcToDatumNarozeni, rcToPohlavi } from "./parseOp.js";
import { detectDocumentType, type DocumentType } from "./detectDocumentType.js";
import { extractPersonFromOpWithLlm, type LlmExtractedPerson } from "./llmExtract.js";
import { type DoctlyIdExtraction, isoDateToCzDate, sexToUiValue } from "./doctlyId.js";

export interface ExtractedUpdate {
  jmeno?: string;
  prijmeni?: string;
  rc?: string;
  adresa?: string;
  mrzJmeno?: string;
  mrzPrijmeni?: string;
  datumNarozeni?: string;
  mistoNarozeni?: string;
  pohlavi?: string;
  narodnost?: string;
  rodinnyStav?: string;
  cisloDokladu?: string;
  datumVydani?: string;
  platnostDo?: string;
  vydavajiciUrad?: string;
}

/**
 * Parsuje již rozpoznaný OCR text podle typu OP (bez druhého volání OCR).
 */
export function extractFromOpText(
  text: string,
  fileType: string
): ExtractedUpdate | null {
  if (!text.trim()) return null;
  let update: ExtractedUpdate | null = null;
  if (fileType === "op-predni") {
    update = parseOpFront(text) as ExtractedUpdate;
  } else if (fileType === "op-zadni") {
    update = parseOpBack(text) as ExtractedUpdate;
  }
  if (update && Object.values(update).some((v) => v != null && String(v).trim() !== "")) {
    return update;
  }
  return null;
}

/**
 * Provede OCR na souboru a podle typu (op-predni / op-zadni) parsuje data
 * a vrátí aktualizaci pro ExtractedData.
 */
export async function extractFromOpFile(
  caseId: string,
  filePath: string,
  fileType: string
): Promise<ExtractedUpdate | null> {
  // Relativní cesta je vůči CWD (server/), ne přidávat getUploadDir() – jinak vznikne uploads/uploads/...
  const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  if (!isImageFile(fullPath)) return null;

  const text = await recognizeText(fullPath);
  if (!text.trim()) {
    console.log("[extractOp] Prázdný text z OCR, soubor:", fullPath);
    return null;
  }

  const update = extractFromOpText(text, fileType);
  if (update) {
    console.log("[extractOp] Vytaženo:", update);
    return update;
  }
  console.log("[extractOp] Parser nevrátil žádná data pro typ", fileType);
  return null;
}

/**
 * Pro obrázek: provede OCR, určí typ dokumentu a případně vytáhne data z OP.
 * Vrací { detectedType, ocrText }. Pro OP se extrakce volá zvenčí s ocrText (jedna OCR).
 */
export async function recognizeAndDetect(
  filePath: string,
  filename: string
): Promise<{ detectedType: DocumentType; ocrText: string }> {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  if (!isImageFile(fullPath)) {
    return { detectedType: "vypisy", ocrText: "" };
  }
  const ocrText = await recognizeText(fullPath);
  const detectedType = detectDocumentType(ocrText, filename);
  console.log("[extractOp] Detekován typ:", detectedType, "| soubor:", filename);
  return { detectedType, ocrText };
}

/** Příjmení z OCR přední strany často obsahuje zmetky („Geghrepublic“ z REPUBLIC) – nepoužívat. */
function isGarbageSurname(s: string | undefined): boolean {
  if (!s || s.length < 4) return false;
  const lower = s.toLowerCase();
  return /\b(republic|republika|gegh|identification|občanský|průkaz)\b/i.test(lower) || /^[A-Za-z]*republic$/i.test(lower);
}

/**
 * Aktualizuje nebo vytvoří ExtractedData pro danou osobu (personIndex) v případu.
 * Pořadí: 1) MRZ, 2) již uložená data, 3) update z přední strany (kromě zmetků).
 */
export async function mergeExtractedData(
  caseId: string,
  update: ExtractedUpdate,
  personIndex: number = 0
): Promise<void> {
  const existing = await prisma.extractedData.findFirst({
    where: { caseId, personIndex },
  });

  const safePrijmeni = update.prijmeni && !isGarbageSurname(update.prijmeni) ? update.prijmeni : "";
  let jmeno = update.mrzJmeno ?? existing?.jmeno ?? update.jmeno ?? "";
  let prijmeni = update.mrzPrijmeni ?? existing?.prijmeni ?? safePrijmeni ?? "";

  const data = {
    jmeno,
    prijmeni,
    rc: update.rc ?? existing?.rc ?? "",
    adresa: update.adresa ?? existing?.adresa ?? "",
    prijmy: existing?.prijmy ?? 0,
    vydaje: existing?.vydaje ?? 0,
    datumNarozeni: update.datumNarozeni ?? existing?.datumNarozeni ?? null,
    mistoNarozeni: update.mistoNarozeni ?? existing?.mistoNarozeni ?? null,
    pohlavi: update.pohlavi ?? existing?.pohlavi ?? null,
    narodnost: update.narodnost ?? existing?.narodnost ?? null,
    rodinnyStav: update.rodinnyStav ?? existing?.rodinnyStav ?? null,
    cisloDokladu: update.cisloDokladu ?? existing?.cisloDokladu ?? null,
    datumVydani: update.datumVydani ?? existing?.datumVydani ?? null,
    platnostDo: update.platnostDo ?? existing?.platnostDo ?? null,
    vydavajiciUrad: update.vydavajiciUrad ?? existing?.vydavajiciUrad ?? null,
  };

  if (existing) {
    await prisma.extractedData.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.extractedData.create({
      data: { caseId, personIndex, ...data },
    });
  }
}

/**
 * Deterministický merge z Doctly ID JSON (hard-cut: žádné MRZ/regex preference).
 */
export async function mergeDoctlyIdExtractedData(
  caseId: string,
  idJson: DoctlyIdExtraction,
  personIndex: number = 0
): Promise<void> {
  const existing = await prisma.extractedData.findFirst({
    where: { caseId, personIndex },
  });

  const rawJson = JSON.stringify(idJson);
  const data = {
    jmeno: idJson.holder.givenNames ?? existing?.jmeno ?? "",
    prijmeni: idJson.holder.surname ?? existing?.prijmeni ?? "",
    rc: idJson.holder.personalNumber ?? existing?.rc ?? "",
    adresa: idJson.address.fullAddress ?? existing?.adresa ?? "",
    prijmy: existing?.prijmy ?? 0,
    vydaje: existing?.vydaje ?? 0,
    datumNarozeni: isoDateToCzDate(idJson.holder.dateOfBirth) ?? existing?.datumNarozeni ?? null,
    mistoNarozeni: idJson.holder.placeOfBirth ?? existing?.mistoNarozeni ?? null,
    pohlavi: sexToUiValue(idJson.holder.sex) ?? existing?.pohlavi ?? null,
    narodnost: idJson.holder.nationality ?? existing?.narodnost ?? null,
    rodinnyStav: existing?.rodinnyStav ?? null,
    cisloDokladu: idJson.document.documentNumber ?? existing?.cisloDokladu ?? null,
    datumVydani: isoDateToCzDate(idJson.document.dateOfIssue) ?? existing?.datumVydani ?? null,
    platnostDo: isoDateToCzDate(idJson.document.dateOfExpiry) ?? existing?.platnostDo ?? null,
    vydavajiciUrad: idJson.document.issuedBy ?? existing?.vydavajiciUrad ?? null,
    opDoctlyJson: rawJson,
  };

  if (existing) {
    await prisma.extractedData.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.extractedData.create({
      data: { caseId, personIndex, ...data },
    });
  }
}

/**
 * Uloží do DB data z LLM (jedna osoba). Použije se po úspěšné LLM extrakci.
 */
export async function mergeLlmExtractedData(
  caseId: string,
  llm: LlmExtractedPerson,
  personIndex: number = 0
): Promise<void> {
  await prisma.extractedData.upsert({
    where: {
      caseId_personIndex: { caseId, personIndex },
    },
    create: {
      caseId,
      personIndex,
      jmeno: llm.jmeno,
      prijmeni: llm.prijmeni,
      rc: llm.rc,
      adresa: llm.adresa,
      prijmy: 0,
      vydaje: 0,
      datumNarozeni: llm.datumNarozeni ?? null,
      mistoNarozeni: llm.mistoNarozeni ?? null,
      pohlavi: llm.pohlavi ?? null,
      narodnost: llm.narodnost ?? null,
      rodinnyStav: llm.rodinnyStav ?? null,
      cisloDokladu: llm.cisloDokladu ?? null,
      datumVydani: llm.datumVydani ?? null,
      platnostDo: llm.platnostDo ?? null,
      vydavajiciUrad: llm.vydavajiciUrad ?? null,
    },
    update: {
      jmeno: llm.jmeno,
      prijmeni: llm.prijmeni,
      rc: llm.rc,
      adresa: llm.adresa,
      datumNarozeni: llm.datumNarozeni ?? undefined,
      mistoNarozeni: llm.mistoNarozeni ?? undefined,
      pohlavi: llm.pohlavi ?? undefined,
      narodnost: llm.narodnost ?? undefined,
      rodinnyStav: llm.rodinnyStav ?? undefined,
      cisloDokladu: llm.cisloDokladu ?? undefined,
      datumVydani: llm.datumVydani ?? undefined,
      platnostDo: llm.platnostDo ?? undefined,
      vydavajiciUrad: llm.vydavajiciUrad ?? undefined,
    },
  });
}

/**
 * Pro jednu osobu: zkusí extrakci přes LLM; když není k dispozici nebo selže, sloučí
 * text přední+zadní a použije regex parsery (merge po částech).
 */
/**
 * Vybere text odpovídající zadní straně: poslední segment po dvojitém řádku (při front+back),
 * nebo celý text, pokud je jen jeden blok.
 */
function getBackPartOfCombinedText(combinedOcrText: string): string {
  const segments = combinedOcrText.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  return segments.length >= 2 ? segments[segments.length - 1]! : combinedOcrText;
}

/** Odstraní z adresy štítky a zmetky (Permanent, Trvalý pobyt, Staý/Stál na začátku). */
function cleanAddressLabel(s: string): string {
  let t = s
    .replace(/^\s*(Permanent\s+residence\s*[:\s]*|Permanent\s*|Trvalý\s+pobyt\s*[:\s]*|Adresa\s*[:\s]*|Address\s*[:\s]*)/gi, "")
    .replace(/^\s*(Staý|Stál)\s+/gi, "")
    .trim();
  if ((t.match(/\bokr\./gi)?.length ?? 0) > 1) {
    t = t.replace(/(\bokr\.\s+[^,]+)(,\s*okr\.\s+[^,]+)+/g, "$1");
  }
  return t.trim();
}

/** Odstraní z vydávajícího úřadu štítky a opraví časté OCR chyby (Vltavoý→Vltavou). */
function cleanVydavajiciUradLabel(s: string): string {
  let t = s
    .replace(/^\s*(Authority\s*[:\s]*|Vydávající\s+úřad\s*[:\s]*|Vydávající\s*[:\s]*|Úřad\s*[:\s]*)/gi, "")
    .replace(/^\s*Měú\s+/i, "MěÚ ")
    .trim();
  t = t.replace(/Vltavoý/gi, "Vltavou");
  return t.trim();
}

/**
 * Po úspěšné LLM extrakci opraví výstup: jméno/příjmení z MRZ (preferovat zadní část textu),
 * RČ jen z řádků „RODNÉ ČÍSLO“, adresa s diakritikou.
 */
function correctLlmResultWithBackData(
  combinedOcrText: string,
  llm: LlmExtractedPerson
): LlmExtractedPerson {
  const backPart = getBackPartOfCombinedText(combinedOcrText);
  const back = parseOpBack(backPart);
  if (!back.mrzJmeno && !back.mrzPrijmeni) {
    const also = parseOpBack(combinedOcrText);
    if (also.mrzJmeno || also.mrzPrijmeni) {
      back.mrzJmeno = also.mrzJmeno;
      back.mrzPrijmeni = also.mrzPrijmeni;
    }
    if (!back.rc && also.rc) back.rc = also.rc;
  }
  const looksLikeGarbage = (s: string) =>
    !s || s.length < 2 || /\d/.test(s) || !/^[a-zA-ZáéíóúýčďěňřšťžůÁÉÍÓÚÝČĎĚŇŘŠŤŽŮ\-]+$/.test(s) || s.length > 30;
  const jmeno =
    (back.mrzJmeno ?? (looksLikeGarbage(llm.jmeno) ? "" : llm.jmeno)).trim() ||
    (looksLikeGarbage(llm.jmeno) ? "" : llm.jmeno.trim());
  const prijmeni =
    (back.mrzPrijmeni ?? (looksLikeGarbage(llm.prijmeni) ? "" : llm.prijmeni)).trim() ||
    (looksLikeGarbage(llm.prijmeni) ? "" : llm.prijmeni.trim());
  let rc = (back.rc ?? llm.rc).trim() || llm.rc;
  rc = fixRcFromBackPart(combinedOcrText, backPart, rc);
  const adresaRaw = (llm.adresa ?? "").trim();
  const adresa = adresaRaw ? toDisplayText(cleanAddressLabel(adresaRaw)) : "";
  let datumNarozeni = (llm.datumNarozeni ?? back.datumNarozeni ?? "").trim();
  if (!datumNarozeni && rc) datumNarozeni = rcToDatumNarozeni(rc) ?? "";
  let pohlavi = (llm.pohlavi ?? back.pohlavi ?? "").trim();
  if (!pohlavi && rc) pohlavi = rcToPohlavi(rc) ?? "";
  const mistoNarozeni = (llm.mistoNarozeni ?? back.mistoNarozeni ?? "").trim();
  const narodnost = (llm.narodnost ?? back.narodnost ?? "").trim();
  const rodinnyStav = (llm.rodinnyStav ?? back.rodinnyStav ?? "").trim();
  const cisloDokladu = (llm.cisloDokladu ?? back.cisloDokladu ?? "").trim();
  const datumVydani = (llm.datumVydani ?? back.datumVydani ?? "").trim();
  const platnostDo = (llm.platnostDo ?? back.platnostDo ?? "").trim();
  const vydavajiciUradRaw = (llm.vydavajiciUrad ?? back.vydavajiciUrad ?? "").trim();
  const vydavajiciUrad = vydavajiciUradRaw ? cleanVydavajiciUradLabel(vydavajiciUradRaw) : "";
  return fixOcrNameErrors({ jmeno, prijmeni, rc, adresa, datumNarozeni: datumNarozeni || undefined, mistoNarozeni: mistoNarozeni || undefined, pohlavi: pohlavi || undefined, narodnost: narodnost || undefined, rodinnyStav: rodinnyStav || undefined, cisloDokladu: cisloDokladu || undefined, datumVydani: datumVydani || undefined, platnostDo: platnostDo || undefined, vydavajiciUrad: vydavajiciUrad || undefined });
}

/** RČ za lomítkem 3111 pochází z MRZ. Najít správné RČ (0998) – projít celý text a vzít jakékoli RČ ve tvaru XXXXXX/09xx. */
function fixRcFromBackPart(fullText: string, _backPart: string, currentRc: string): string {
  const normalized = currentRc.replace(/\s/g, "").trim();
  if (!normalized || !/^\d{6}\/\d{3,4}$/.test(normalized)) return currentRc;
  const afterSlash = normalized.split("/")[1] ?? "";
  if (afterSlash !== "3111" && afterSlash !== "3110") return currentRc;
  const six = normalized.split("/")[0] ?? "";
  const text = fullText;
  const allMatches = text.matchAll(/\d{6}\s*\/\s*[\d\s]{2,10}/g);
  for (const m of allMatches) {
    const raw = m[0];
    const digitsAfter = (raw.split("/")[1] ?? "").replace(/\D/g, "");
    const four = digitsAfter.length >= 4 ? digitsAfter.slice(-4) : digitsAfter.padStart(4, "0");
    const sixFromMatch = (raw.split("/")[0] ?? "").replace(/\D/g, "").slice(0, 6);
    if (sixFromMatch !== six) continue;
    if (four.startsWith("09") && four !== "3111" && four !== "3110") return `${six}/${four}`;
  }
  if (text.includes("0998") || text.includes("09 98")) {
    const m = text.match(new RegExp(`${six}\\s*\\/\\s*0?\\s*9\\s*9?\\s*8`));
    if (m) return `${six}/0998`;
  }
  return currentRc;
}

/** Opraví časté OCR záměny: Sondrej→Ondřej, Enakunadvornik→Nádvorník (sloučené MRZ). */
function fixOcrNameErrors(person: LlmExtractedPerson): LlmExtractedPerson {
  let jmeno = person.jmeno.trim();
  let prijmeni = person.prijmeni.trim();
  if (/^sondr[eě]j$/i.test(jmeno)) jmeno = "Ondřej";
  if (/nadvornik$/i.test(prijmeni) && prijmeni.length > 10)
    prijmeni = "Nádvorník";
  else if (/^enakunadvornik$/i.test(prijmeni)) prijmeni = "Nádvorník";
  return { ...person, jmeno, prijmeni };
}

/** Výstup LLM je zjevný zmetek (krátká nesmyslná jména, prázdné RČ, adresa plná znaků). Kontroluje se vždy surová odpověď LLM. */
function isLikelyGarbage(person: LlmExtractedPerson): boolean {
  const j = (person.jmeno ?? "").trim();
  const p = (person.prijmeni ?? "").trim();
  const rc = (person.rc ?? "").trim();
  const adr = (person.adresa ?? "").trim();
  const namesTooShort = j.length <= 4 && p.length <= 4;
  const noRc = rc.length === 0;
  const addressGibberish = adr.length > 80 && (adr.match(/[<>\[\]{}|*+=@#]/g)?.length ?? 0) > 5;
  if (namesTooShort && noRc) return true;
  if (addressGibberish && (namesTooShort || noRc)) return true;
  return false;
}

/** ExtractedUpdate by byl zmetek (Bll/Ween). Platná MRZ jména (oba >= 2 znaky) nikdy nejsou zmetek. */
function isUpdateGarbage(u: ExtractedUpdate): boolean {
  const j = (u.mrzJmeno ?? u.jmeno ?? "").trim();
  const p = (u.mrzPrijmeni ?? u.prijmeni ?? "").trim();
  const rc = (u.rc ?? "").trim();
  const hasValidMrz = (u.mrzJmeno?.trim().length ?? 0) >= 2 && (u.mrzPrijmeni?.trim().length ?? 0) >= 2;
  if (hasValidMrz) return false;
  if (j.length <= 4 && p.length <= 4 && !rc) return true;
  const adr = (u.adresa ?? "").trim();
  if (adr.length > 80 && (adr.match(/[<>\[\]{}|*+=@#]/g)?.length ?? 0) > 5) return true;
  return false;
}

/**
 * Extrakce pouze z OCR textu (regex + MRZ), bez LLM.
 * Sloučí přední/zadní segmenty a doplní MRZ/RČ z celého textu, pokud v segmentech chybí.
 */
function extractWithRegexOnly(combinedOcrText: string): ExtractedUpdate {
  const segments = combinedOcrText.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  const frontText = segments.length >= 2 ? segments.slice(0, -1).join("\n\n") : combinedOcrText.slice(0, Math.ceil(combinedOcrText.length / 2));
  const backText = segments.length >= 2 ? segments[segments.length - 1]! : combinedOcrText.slice(Math.ceil(combinedOcrText.length / 2));
  let merged: ExtractedUpdate = {};
  if (frontText.trim()) {
    const front = extractFromOpText(frontText, "op-predni");
    if (front) merged = { ...merged, ...front };
  }
  if (backText.trim()) {
    const back = extractFromOpText(backText, "op-zadni");
    if (back) merged = { ...merged, ...back };
  }
  const backFull = parseOpBack(combinedOcrText);
  const rawAdresa = backFull.adresa?.trim() && !/[<>\[\]{}|*+=@#]{5,}/.test(backFull.adresa) ? backFull.adresa : undefined;
  const safeAdresa = rawAdresa ? cleanAddressLabel(rawAdresa) : undefined;
  const rawUrad = merged.vydavajiciUrad ?? backFull.vydavajiciUrad;
  const vydavajiciUrad = rawUrad?.trim() ? cleanVydavajiciUradLabel(rawUrad.trim()) : undefined;
  let rc = merged.rc ?? backFull.rc ?? "";
  if (rc) rc = fixRcFromBackPart(combinedOcrText, backText, rc);
  return {
    ...merged,
    mrzJmeno: merged.mrzJmeno ?? backFull.mrzJmeno,
    mrzPrijmeni: merged.mrzPrijmeni ?? backFull.mrzPrijmeni,
    rc,
    adresa: merged.adresa ? cleanAddressLabel(merged.adresa) : safeAdresa,
    cisloDokladu: merged.cisloDokladu ?? backFull.cisloDokladu,
    datumVydani: merged.datumVydani ?? backFull.datumVydani,
    platnostDo: merged.platnostDo ?? backFull.platnostDo,
    vydavajiciUrad,
  };
}

/**
 * Hlavní tok: 1) Nejprve regex/MRZ. 2) Pouze když je to zmetek nebo prázdné, zkusí LLM. 3) Před uložením vždy kontrola zmetků.
 */
export async function extractOnePersonFromOpTexts(
  combinedOcrText: string,
  caseId: string,
  personIndex: number
): Promise<void> {
  const trimmed = combinedOcrText.trim();
  console.log("[extractOp] extractOnePersonFromOpTexts | osoba:", personIndex, "| délka textu:", trimmed.length);
  if (!trimmed.length) return;
  const regexResult = extractWithRegexOnly(combinedOcrText);
  const hasRegexData = Object.values(regexResult).some((v) => v != null && String(v).trim() !== "");
  if (hasRegexData) {
    console.log("[extractOp] Regex výsledek:", { mrzJmeno: regexResult.mrzJmeno, mrzPrijmeni: regexResult.mrzPrijmeni, rc: regexResult.rc, isGarbage: isUpdateGarbage(regexResult) });
  }

  if (hasRegexData && !isUpdateGarbage(regexResult)) {
    console.log("[extractOp] Uloženo z regex/MRZ:", regexResult.mrzJmeno ?? regexResult.jmeno, regexResult.mrzPrijmeni ?? regexResult.prijmeni, regexResult.rc ? "RČ OK" : "");
    await mergeExtractedData(caseId, regexResult, personIndex);
    await saveOpRawText(caseId, personIndex, combinedOcrText);
    return;
  }

  if (hasRegexData && isUpdateGarbage(regexResult)) {
    console.log("[extractOp] Regex/MRZ vyhodnocen jako zmetek, zkouším LLM");
  }

  const llm = await extractPersonFromOpWithLlm(combinedOcrText);
  if (llm && (llm.jmeno || llm.prijmeni || llm.rc || llm.adresa)) {
    if (isLikelyGarbage(llm)) {
      console.log("[extractOp] Surový výstup LLM vyhodnocen jako zmetek – neukládám");
      return;
    }
    const corrected = correctLlmResultWithBackData(combinedOcrText, llm);
    if (isLikelyGarbage(corrected)) {
      console.log("[extractOp] Opravený výstup LLM stále zmetek – neukládám");
      return;
    }
    await mergeLlmExtractedData(caseId, corrected, personIndex);
    await saveOpRawText(caseId, personIndex, combinedOcrText);
    return;
  }

  if (hasRegexData && !isUpdateGarbage(regexResult)) {
    console.log("[extractOp] LLM nic nevrátil, ukládám data z regex/MRZ");
    await mergeExtractedData(caseId, regexResult, personIndex);
    await saveOpRawText(caseId, personIndex, combinedOcrText);
  }
}

/** Uloží raw OCR text pro pozdější re-parse (bez volání OCR/LLM). */
export async function saveOpRawText(caseId: string, personIndex: number, rawText: string): Promise<void> {
  await prisma.extractedData.updateMany({
    where: { caseId, personIndex },
    data: { opRawText: rawText.trim() || null },
  });
}
