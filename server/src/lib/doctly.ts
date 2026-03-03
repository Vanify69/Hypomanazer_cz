/**
 * Doctly – AI-powered document extraction.
 * Převádí PDF, DOCX a obrázky na strukturovaný text (Markdown) s vysokou přesností.
 * @see https://docs.doctly.ai/
 */

import path from "path";
import fs from "fs";

const DOCTLY_BASE_URL = "https://api.doctly.ai/api/v1";
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 120_000; // 2 minuty

export function isDoctlyAvailable(): boolean {
  return Boolean(process.env.DOCTLY_API_KEY?.trim());
}

function getAuthHeader(): string {
  const key = process.env.DOCTLY_API_KEY?.trim();
  if (!key) return "";
  return `Bearer ${key}`;
}

const SUPPORTED_EXT = [".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp", ".gif"];

export function isDoctlySupportedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXT.includes(ext);
}

interface DoctlyDocumentResponse {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";
  output_file_url?: string | null;
  detail?: string;
}

/**
 * Nahraje dokument na Doctly, počká na zpracování a stáhne výsledný Markdown.
 * @returns Text z dokumentu nebo null při chybě / neaktivním Doctly
 */
export async function getTextFromDocument(filePath: string): Promise<string | null> {
  const apiKey = process.env.DOCTLY_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error("[Doctly] Soubor neexistuje:", fullPath);
    return null;
  }

  if (!isDoctlySupportedFile(fullPath)) {
    console.log("[Doctly] Nepodporovaný formát:", path.extname(fullPath));
    return null;
  }

  const filename = path.basename(fullPath);
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const mimeType = mimeTypes[ext] ?? "application/octet-stream";

  try {
    const buffer = fs.readFileSync(fullPath);
    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: mimeType }), filename);
    formData.append("accuracy", "lite");

    console.log("[Doctly] Nahrávám dokument:", filename);

    const createRes = await fetch(`${DOCTLY_BASE_URL}/documents`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
      },
      body: formData,
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[Doctly] Chyba nahrání:", createRes.status, errText);
      return null;
    }

    const createData = (await createRes.json()) as DoctlyDocumentResponse;
    const docId = createData.id;

    if (!docId) {
      console.error("[Doctly] API nevrátilo ID dokumentu");
      return null;
    }

    const doc = await waitForDocument(docId, apiKey);
    if (!doc || doc.status !== "COMPLETED" || !doc.output_file_url) {
      if (doc?.status === "FAILED") {
        console.error("[Doctly] Zpracování dokumentu selhalo");
      } else if (doc?.status) {
        console.error("[Doctly] Neočekávaný stav:", doc.status);
      }
      return null;
    }

    const outputRes = await fetch(doc.output_file_url);
    if (!outputRes.ok) {
      console.error("[Doctly] Chyba stahování výstupu:", outputRes.status);
      return null;
    }

    const text = await outputRes.text();
    console.log("[Doctly] Zpracováno:", filename, "| délka textu:", text.length);
    return text;
  } catch (err) {
    console.error("[Doctly] Chyba:", err);
    return null;
  }
}

async function waitForDocument(
  docId: string,
  apiKey: string
): Promise<DoctlyDocumentResponse | null> {
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const res = await fetch(`${DOCTLY_BASE_URL}/documents/${docId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      console.error("[Doctly] Chyba při pollingu:", res.status);
      return null;
    }

    const doc = (await res.json()) as DoctlyDocumentResponse;

    if (doc.status === "COMPLETED" || doc.status === "FAILED" || doc.status === "EXPIRED") {
      return doc;
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.error("[Doctly] Timeout při čekání na zpracování");
  return null;
}
