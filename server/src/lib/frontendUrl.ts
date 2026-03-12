/**
 * Základní URL frontendu – pro generování odkazů (intake, ref tipařů).
 * Lokál: FRONTEND_URL nebo APP_URL v .env, výchozí http://localhost:3000
 * Produkce (Railway): nastavte FRONTEND_URL na backend službě (API) na plnou URL frontendu, např. https://vase-app.up.railway.app
 */
export function getFrontendBaseUrl(): string {
  const raw =
    process.env.FRONTEND_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  const url = String(raw).trim().replace(/\/+$/, "");
  return url || "http://localhost:3000";
}
