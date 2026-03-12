/**
 * Základní URL frontendu – pro generování odkazů (intake, ref tipařů).
 * Lokál: FRONTEND_URL nebo APP_URL v .env, výchozí http://localhost:3000
 * Produkce (Railway): buď nastavte FRONTEND_URL na backend službě, nebo se použije
 * RAILWAY_PUBLIC_DOMAIN (Railway to nastavuje automaticky – stejná doména jako aplikace).
 */
export function getFrontendBaseUrl(): string {
  const explicit =
    process.env.FRONTEND_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.PUBLIC_URL?.trim();
  if (explicit) {
    const url = explicit.replace(/\/+$/, "");
    return url || "http://localhost:3000";
  }
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (domain) {
    return `https://${domain.replace(/^https?:\/\//, "")}`;
  }
  return "http://localhost:3000";
}

/** Pro logování / health – z jakého zdroje se bere URL. */
export function getFrontendBaseUrlSource(): "FRONTEND_URL" | "APP_URL" | "PUBLIC_URL" | "RAILWAY_PUBLIC_DOMAIN" | "default" {
  if (process.env.FRONTEND_URL?.trim()) return "FRONTEND_URL";
  if (process.env.APP_URL?.trim()) return "APP_URL";
  if (process.env.PUBLIC_URL?.trim()) return "PUBLIC_URL";
  if (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) return "RAILWAY_PUBLIC_DOMAIN";
  return "default";
}
