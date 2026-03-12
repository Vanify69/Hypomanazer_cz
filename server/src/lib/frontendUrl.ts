/**
 * Základní URL frontendu – pro generování odkazů (intake, ref tipařů).
 * Lokál: FRONTEND_URL nebo APP_URL v .env, výchozí http://localhost:3000
 * Produkce (Railway): na službě BACKEND (API) nastavte FRONTEND_URL na plnou URL frontendu.
 * Pokud máte frontend jako jinou službu, použijte referenci:
 *   FRONTEND_URL = https://${{ NázevFrontendSlužby.RAILWAY_PUBLIC_DOMAIN }}
 */
export function getFrontendBaseUrl(): string {
  const raw =
    process.env.FRONTEND_URL ??
    process.env.APP_URL ??
    process.env.PUBLIC_URL ??
    "http://localhost:3000";
  const url = String(raw).trim().replace(/\/+$/, "");
  return url || "http://localhost:3000";
}

/** Pro logování / health – z jakého zdroje se bere URL. */
export function getFrontendBaseUrlSource(): "FRONTEND_URL" | "APP_URL" | "PUBLIC_URL" | "default" {
  if (process.env.FRONTEND_URL?.trim()) return "FRONTEND_URL";
  if (process.env.APP_URL?.trim()) return "APP_URL";
  if (process.env.PUBLIC_URL?.trim()) return "PUBLIC_URL";
  return "default";
}
