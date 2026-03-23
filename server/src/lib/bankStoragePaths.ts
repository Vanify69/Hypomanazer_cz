import fs from "fs";
import path from "path";
import { getUploadDir } from "./upload.js";

/** Relativní cesta pod `UPLOAD_DIR` – vždy s `/`. */
export function bankTemplateRelativePath(userId: string, bankCode: string, uniqueName: string): string {
  return path.posix.join("bank-templates", userId, bankCode, uniqueName);
}

export function bankOutputRelativePath(
  userId: string,
  caseId: string,
  runId: string,
  safeBaseName: string
): string {
  return path.posix.join("bank-outputs", userId, caseId, `${runId}-${safeBaseName}`);
}

export function absoluteFromStorageKey(storageKey: string): string {
  const parts = storageKey.split("/").filter(Boolean);
  return path.join(getUploadDir(), ...parts);
}

export function writeBufferToStorageKey(storageKey: string, buf: Buffer): void {
  const abs = absoluteFromStorageKey(storageKey);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buf);
}

export function readBufferFromStorageKey(storageKey: string): Buffer {
  return fs.readFileSync(absoluteFromStorageKey(storageKey));
}

export function storageKeyExists(storageKey: string): boolean {
  return fs.existsSync(absoluteFromStorageKey(storageKey));
}
