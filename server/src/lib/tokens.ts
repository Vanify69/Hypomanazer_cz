import crypto from "crypto";

const HASH_ALGORITHM = "sha256";
const TOKEN_BYTES = 32;

/**
 * Vygeneruje náhodný token (raw). Raw token se nikdy neukládá do DB.
 */
export function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Vytvoří hash tokenu pro uložení do DB.
 */
export function hashToken(token: string): string {
  return crypto.createHash(HASH_ALGORITHM).update(token, "utf8").digest("hex");
}

/**
 * Ověří, zda raw token odpovídá uloženému hashi.
 */
export function verifyToken(token: string, tokenHash: string): boolean {
  if (!token || !tokenHash) return false;
  const computed = hashToken(token);
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(tokenHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Výchozí platnost intake linku (14 dní).
 */
export const INTAKE_TOKEN_EXPIRY_DAYS = 14;

/**
 * Výchozí platnost tipařského linku (1 rok).
 */
export const REFERRER_TOKEN_EXPIRY_DAYS = 365;

export function getIntakeExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + INTAKE_TOKEN_EXPIRY_DAYS);
  return d;
}

export function getReferrerExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFERRER_TOKEN_EXPIRY_DAYS);
  return d;
}
