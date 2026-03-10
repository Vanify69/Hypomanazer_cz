/**
 * Centrální čtení env proměnných pro auth a konfiguraci.
 * Jediné místo pro JWT_SECRET a JWT_EXPIRES_IN.
 */
const DEV_SECRET = "dev-secret-change-in-production";

let jwtSecretWarned = false;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production" && !jwtSecretWarned) {
    jwtSecretWarned = true;
    console.warn("[env] JWT_SECRET v produkci chybí nebo je příliš krátký – nastavte v Railway Variables (min. 32 znaků).");
  }
  return DEV_SECRET;
}

export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN?.trim() || "7d";
}
