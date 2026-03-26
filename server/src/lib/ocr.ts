import { createWorker } from "tesseract.js";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { getTextFromDocument, isDoctlyAvailable, isDoctlySupportedFile } from "./doctly.js";

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

export function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXT.includes(ext);
}

/** Skóre OCR textu pro „vypadá jako OP“ – čím vyšší, tím lepší. */
function scoreOcrForOp(text: string): number {
  const t = text.trim();
  if (!t.length) return 0;
  let score = t.length;
  if (/\d{6}\s*\/\s*\d{3,4}/.test(t)) score += 500; // rodné číslo
  if (/\b(surname|given\s+names?|jm[eé]no|p[rř]íjmení|prijmeni|rodn[eé]\s+[cč]íslo)\b/i.test(t)) score += 300;
  if (/\b(adresa|trval[eé]ho\s+bydli|č\.?\s*p\.|okr\.)\b/i.test(t)) score += 300;
  if (/<<<|IDCZE/i.test(t)) score += 200; // MRZ
  return score;
}

/**
 * Normalizuje obrázek pro OCR: aplikuje EXIF orientaci (foto z mobilu na výšku),
 * převede do formátu vhodného pro Tesseract. Volitelně vrátí i rotované varianty.
 */
async function prepareImageForOcr(inputBuffer: Buffer): Promise<{ main: Buffer; rotated: Buffer[] }> {
  const normalized = await sharp(inputBuffer)
    .rotate() // EXIF orientace (bez parametru = auto podle EXIF)
    .toFormat("png")
    .toBuffer();

  const meta = await sharp(normalized).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  const rotated: Buffer[] = [];
  for (const angle of [90, 180, 270]) {
    const buf = await sharp(normalized).rotate(angle).toFormat("png").toBuffer();
    rotated.push(buf);
  }

  return { main: normalized, rotated };
}

export interface RecognizeTextOptions {
  /** false = pouze Tesseract (pro klasifikaci a výpisy). Default true = může použít Doctly. */
  useDoctly?: boolean;
  /** Název v Doctly (role spolužadatele / typ dokumentu) – viz Document v DB. */
  doctlyUploadFilename?: string;
}

/**
 * Rozpozná text z obrázku. Normalizuje orientaci (EXIF) a při špatném výsledku
 * zkusí rotace 90°/180°/270° (portrait vs. landscape) a vrátí nejlepší text.
 */
export async function recognizeText(
  imagePath: string,
  options?: RecognizeTextOptions
): Promise<string> {
  const useDoctly = options?.useDoctly !== false;
  const absolutePath = path.resolve(imagePath);
  console.log("[OCR] Start, soubor:", path.basename(absolutePath), "| useDoctly:", useDoctly);
  if (!fs.existsSync(absolutePath)) {
    console.error("[OCR] Soubor neexistuje:", absolutePath);
    return "";
  }
  if (useDoctly && isDoctlyAvailable() && isDoctlySupportedFile(absolutePath)) {
    const doctlyText = await getTextFromDocument(absolutePath, {
      uploadFilename: options?.doctlyUploadFilename,
    });
    if (doctlyText && doctlyText.trim().length > 0) {
      console.log("[OCR] Použit Doctly, délka textu:", doctlyText.length);
      return doctlyText;
    }
  }
  let inputBuffer: Buffer;
  try {
    inputBuffer = await fs.promises.readFile(absolutePath);
    console.log("[OCR] Načteno", inputBuffer.length, "bajtů");
  } catch (err) {
    console.error("[OCR] Nelze načíst soubor:", err);
    return "";
  }

  let buffersToTry: Buffer[];
  try {
    const { main, rotated } = await prepareImageForOcr(inputBuffer);
    buffersToTry = [main, ...rotated];
  } catch (err) {
    console.error("[OCR] Sharp selhal, použit původní buffer:", err);
    buffersToTry = [inputBuffer];
  }

  console.log("[OCR] Vytvářím Tesseract worker (ces+eng)...");
  const worker = await createWorker("ces+eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") process.stderr.write(".");
    },
  });

  const GOOD_SCORE = 400; // RČ nebo klíčová slova OP = stačí jedna orientace

  try {
    let bestText = "";
    let bestScore = 0;

    for (let i = 0; i < buffersToTry.length; i++) {
      const angle = [0, 90, 180, 270][i];
      const label = angle === 0 ? "EXIF" : `${angle}°`;
      console.log("[OCR] Zkouším orientaci:", label);
      const {
        data: { text },
      } = await worker.recognize(buffersToTry[i]);
      const out = (text ?? "").trim();
      const score = scoreOcrForOp(out);
      if (score > bestScore) {
        bestScore = score;
        bestText = out;
        if (out) console.log("[OCR] Lepší výsledek při", label, "| skóre:", score);
      }
      if (bestScore >= GOOD_SCORE) {
        console.log("[OCR] Dostatečné skóre, další rotace přeskakuji.");
        break;
      }
    }

    if (bestText) {
      console.log("[OCR] Rozpoznaný text (první 400 znaků):", bestText.slice(0, 400));
    } else {
      console.log("[OCR] Tesseract nevrátil žádný text pro:", path.basename(absolutePath));
    }
    return bestText;
  } catch (err) {
    console.error("[OCR] Chyba:", err);
    return "";
  } finally {
    await worker.terminate();
  }
}

/**
 * Text z OP (obrázek nebo PDF) pro extrakci údajů – PDF jde přes Doctly stejně jako JPG,
 * ne jen prvních N znaků z pdf-parse (getTextForClassification).
 */
export async function extractTextFromOpFile(
  filePath: string,
  options?: RecognizeTextOptions
): Promise<string> {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) return "";
  if (isImageFile(absolutePath)) {
    return recognizeText(absolutePath, options);
  }
  const ext = path.extname(absolutePath).toLowerCase();
  if (ext === ".pdf") {
    if (isDoctlyAvailable() && isDoctlySupportedFile(absolutePath)) {
      const t = await getTextFromDocument(absolutePath, {
        uploadFilename: options?.doctlyUploadFilename,
      });
      if (t && t.trim().length > 0) return t;
    }
    const { getTextFromFile } = await import("./extractVypisy.js");
    return getTextFromFile(absolutePath);
  }
  const { getTextForClassification } = await import("./classification.js");
  return getTextForClassification(absolutePath);
}
