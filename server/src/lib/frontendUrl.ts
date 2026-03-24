/**
 * Základní URL frontendu – pro generování odkazů (intake, ref tipařů).
 * Lokál: FRONTEND_URL nebo APP_URL v .env, výchozí http://localhost:3000
 * Produkce (Railway): buď nastavte FRONTEND_URL na backend službě, nebo se použije
 * RAILWAY_PUBLIC_DOMAIN (doména té služby – u samostatné API služby často api.*).
 * Odkazy musí vést na SPA host (např. app.*), ne na API – proto při hostiteli api.*
 * přemapujeme na app.* (stejná root doména).
 */
function remapApiHostToAppHostForSpaLinks(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    if (u.hostname.startsWith("api.")) {
      u.hostname = "app." + u.hostname.slice(4);
      return u.origin;
    }
  } catch {
    /* ignore */
  }
  return trimmed;
}

export function getFrontendBaseUrl(): string {
  const explicit =
    process.env.FRONTEND_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.PUBLIC_URL?.trim();
  let base: string;
  if (explicit) {
    const url = explicit.replace(/\/+$/, "");
    base = url || "http://localhost:3000";
  } else {
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
    if (domain) {
      base = `https://${domain.replace(/^https?:\/\//, "")}`;
    } else {
      base = "http://localhost:3000";
    }
  }
  return remapApiHostToAppHostForSpaLinks(base);
}

/** Pro logování / health – z jakého zdroje se bere URL. */
export function getFrontendBaseUrlSource(): "FRONTEND_URL" | "APP_URL" | "PUBLIC_URL" | "RAILWAY_PUBLIC_DOMAIN" | "default" {
  if (process.env.FRONTEND_URL?.trim()) return "FRONTEND_URL";
  if (process.env.APP_URL?.trim()) return "APP_URL";
  if (process.env.PUBLIC_URL?.trim()) return "PUBLIC_URL";
  if (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) return "RAILWAY_PUBLIC_DOMAIN";
  return "default";
}
