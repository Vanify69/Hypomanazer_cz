/**
 * Extrakce DAP FO z Doctly/PDF: používá parser dle specifikace (extractDapFo)
 * a vrací ParsedDapFo pro ukládání; API převádí na legacy tvar pro frontend.
 */

import path from "path";
import fs from "fs";
import { recognizeText } from "./ocr.js";
import { isImageFile } from "./ocr.js";
import { getTextFromDocument, isDoctlyAvailable, isDoctlySupportedFile } from "./doctly.js";
import {
  parseDoctlyDapFo,
  convertParsedToLegacy,
  type ParsedDapFo,
  ROW_MAP,
  KEY_TO_ROWID,
} from "./extractDapFo.js";
import getAresDataFromDic from "./ares.js";

export type { ParsedDapFo };
export { ROW_MAP, KEY_TO_ROWID, convertParsedToLegacy };

/** Řádkové klíče pro legacy UI (31, 32, … 62a, … 113). */
export const DAP_LINE_KEYS = ROW_MAP.map((r) => r.rowId);

/** Popis řádku pro zobrazení v UI. */
export const DAP_LINE_LABELS: Record<string, string> = Object.fromEntries(
  ROW_MAP.map((r) => [r.rowId, r.label])
);

/** Základní údaje z DP (legacy). */
export interface DapBasicInfo {
  ic?: string;
  dic?: string;
  czNace?: string;
  zpusobVydaju?: string;
}

/** Legacy výstup pro zpětnou kompatibilitu. */
export interface DapExtractResult {
  lines: Record<string, number>;
  ic?: string;
  dic?: string;
  czNace?: string;
  zpusobVydaju?: string;
  rawText?: string;
}

async function getTextFromPdf(filePath: string): Promise<string> {
  const buf = fs.readFileSync(filePath);
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const result = await parser.getText();
    return (result?.text ?? "") as string;
  } finally {
    await parser.destroy();
  }
}

export async function getTextFromDapFile(filePath: string): Promise<string> {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return "";
  if (isDoctlyAvailable() && isDoctlySupportedFile(fullPath)) {
    const doctlyText = await getTextFromDocument(fullPath);
    if (doctlyText && doctlyText.trim().length > 0) return doctlyText;
  }
  const ext = path.extname(fullPath).toLowerCase();
  if (ext === ".pdf") return getTextFromPdf(fullPath);
  if (isImageFile(fullPath)) return recognizeText(fullPath);
  return "";
}

/**
 * Z textu DAP vytáhne data (nový formát ParsedDapFo).
 * Používá se pro upload i pro re-parse z uloženého raw textu.
 */
export function extractDapFromText(text: string, source = "inline-text"): ParsedDapFo {
  if (!text.trim()) {
    console.log("[extractDap] Prázdný text z DAP zdroje:", source);
    const empty = parseDoctlyDapFo("", "");
    empty.rawText = "";
    return empty;
  }
  const parsed = parseDoctlyDapFo(text, text);
  const filled = Object.values(parsed.rows).filter((v) => v != null).length;
  console.log("[extractDap] Vytaženo řádků:", filled, "| meta:", parsed.meta.sourceFormat, "| zdroj:", source);
  return parsed;
}

/**
 * Z souboru (PDF/obrázek) vrátí ParsedDapFo. Backend ukládá tento formát do dpData.
 */
export async function extractDapFromFile(filePath: string): Promise<ParsedDapFo> {
  const text = await getTextFromDapFile(filePath);
  return extractDapFromText(text, path.basename(filePath));
}

/**
 * Pro místa, která potřebují legacy tvar (např. testy): převod Parsed → legacy.
 */
export function toLegacyDapExtractResult(parsed: ParsedDapFo): DapExtractResult {
  return convertParsedToLegacy(parsed);
}

/**
 * Doplní IČ a CZ-NACE podle DIČ. CZ+8 číslic: ARES (IČO + CZ-NACE). CZ+9/10 číslic (rodné číslo): IČ = číselná část DIČ, CZ-NACE z ARES není k dispozici.
 */
export async function enrichParsedDapFromAres(parsed: ParsedDapFo): Promise<ParsedDapFo> {
  const dic = String(parsed.meta?.dicNormalized ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!/^CZ\d{8,10}$/.test(dic)) return parsed;
  try {
    const ares = await getAresDataFromDic(dic);
    if (ares.ico == null && ares.czNacePrevazujici == null) return parsed;
    return {
      ...parsed,
      meta: {
        ...parsed.meta,
        ...(ares.ico != null && { icoCandidate: ares.ico }),
        ...(ares.czNacePrevazujici != null && { czNacePrevazujici: ares.czNacePrevazujici }),
      },
    };
  } catch {
    return parsed;
  }
}
