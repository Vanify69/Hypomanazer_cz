import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultUploadDir = path.join(__dirname, "..", "..", "uploads");

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? defaultUploadDir;
}

export function getCaseUploadDir(caseId: string): string {
  const base = getUploadDir();
  const dir = path.join(base, caseId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Složka pro soubory nahrané v rámci intake (před konverzí na případ). */
export function getIntakeUploadDir(sessionId: string): string {
  const base = getUploadDir();
  const dir = path.join(base, "intake", sessionId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function ensureUploadDir(): void {
  const dir = getUploadDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
