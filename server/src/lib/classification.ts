/**
 * Klasifikace dokumentů – text pro detekci typu bez volání Doctly.
 * Pro obrázky: Tesseract. Pro PDF: prvních N znaků z pdf-parse.
 */

import path from "path";
import { recognizeText } from "./ocr.js";
import { isImageFile } from "./ocr.js";
import { getTextFromFile } from "./extractVypisy.js";

const MAX_CHARS_FOR_CLASSIFICATION = 5000;

/**
 * Vrátí text použitelný pro klasifikaci (detekce typu + přiřazení k osobě).
 * Nepoužívá Doctly – u PDF prvních N znaků, u obrázků pouze Tesseract.
 */
export async function getTextForClassification(filePath: string): Promise<string> {
  const fullPath = path.resolve(filePath);
  if (isImageFile(fullPath)) {
    return recognizeText(fullPath, { useDoctly: false });
  }
  const ext = path.extname(fullPath).toLowerCase();
  if (ext === ".pdf") {
    const text = await getTextFromFile(fullPath);
    return text.slice(0, MAX_CHARS_FOR_CLASSIFICATION);
  }
  return "";
}
