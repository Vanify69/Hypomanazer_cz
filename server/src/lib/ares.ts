/**
 * ARES 2.0 – z DIČ získá IČO a převažující CZ-NACE (Core + RES endpointy).
 */

const ARES_CORE_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";
const ARES_RES_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty-res";
const TIMEOUT_MS = 5_000;
const MAX_RETRIES = 2;

export type AresSource = "ARES-RES" | "ARES-CORE" | null;

export interface AresResult {
  dic: string;
  ico: string | null;
  czNacePrevazujici: string | null;
  source: AresSource;
  reason?: string;
  raw?: {
    aresCore?: unknown;
    aresRes?: unknown;
  };
}

interface AresResZaznam {
  czNacePrevazujici?: string | null;
  czNacePrevazujici2008?: string | null;
  czNace?: string[] | null;
  czNace2008?: string[] | null;
  primarniZaznam?: boolean;
}

interface AresResResponse {
  zaznamy?: AresResZaznam[] | null;
}

function normalizeDic(dic: string): string {
  return String(dic ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

/** Pro CZ+8 číslic vrátí IČO; pro CZ+9/10 číslic (rodné číslo) vrátí číselnou část jako identifikátor. */
function icoOrIdFromDic(dic: string): string | null {
  const m = /^CZ(\d{8,10})$/.exec(dic);
  return m ? m[1]! : null;
}

/** True jen pro CZ + přesně 8 číslic (IČO) – ARES API bere jen IČO. */
function isAresLookupable(dic: string): boolean {
  return /^CZ\d{8}$/.test(dic);
}

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    signal: controller.signal,
    headers: { Accept: "application/json" },
  }).finally(() => clearTimeout(timeoutId));
}

async function fetchWithRetry(url: string, timeoutMs: number, maxRetries: number): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, timeoutMs);
      return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === maxRetries) throw lastError;
    }
  }
  throw lastError ?? new Error("Unknown error");
}

function extractCzNacePrevazujici(resBody: AresResResponse): { value: string | null; source: AresSource } {
  const zaznamy = resBody?.zaznamy;
  if (!Array.isArray(zaznamy) || zaznamy.length === 0) {
    return { value: null, source: null };
  }
  const primary = zaznamy.find((z) => z.primarniZaznam === true) ?? zaznamy[0];
  const rec = primary as AresResZaznam;

  if (rec.czNacePrevazujici != null && String(rec.czNacePrevazujici).trim() !== "") {
    return { value: String(rec.czNacePrevazujici).trim(), source: "ARES-RES" };
  }
  if (rec.czNacePrevazujici2008 != null && String(rec.czNacePrevazujici2008).trim() !== "") {
    return { value: String(rec.czNacePrevazujici2008).trim(), source: "ARES-RES" };
  }
  const fromArray = (arr: string[] | null | undefined): string | null => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const first = arr[0];
    return first != null && String(first).trim() !== "" ? String(first).trim() : null;
  };
  const nace = fromArray(rec.czNace) ?? fromArray(rec.czNace2008);
  return { value: nace, source: nace ? "ARES-RES" : null };
}

/**
 * Z DIČ získá IČ (resp. identifikátor) a převažující CZ-NACE.
 * - CZ + 8 číslic (IČO): volá ARES, vrací IČO a CZ-NACE z registru.
 * - CZ + 9 nebo 10 číslic (rodné číslo): IČ doplní číselnou částí DIČ, CZ-NACE ARES neposkytuje (nelze vyhledat podle RČ).
 */
async function getAresDataFromDic(dic: string): Promise<AresResult> {
  const normalizedDic = normalizeDic(dic);
  const idFromDic = icoOrIdFromDic(normalizedDic);

  if (idFromDic === null) {
    return {
      dic: normalizedDic || dic,
      ico: null,
      czNacePrevazujici: null,
      source: null,
      reason: "DIC must be CZ + 8 to 10 digits",
    };
  }

  if (!isAresLookupable(normalizedDic)) {
    return {
      dic: normalizedDic,
      ico: idFromDic,
      czNacePrevazujici: null,
      source: null,
      reason: "DIČ based on rodné číslo – IČ filled from DIČ, CZ-NACE not available from ARES",
    };
  }

  let aresCore: unknown = undefined;
  let aresRes: unknown = undefined;
  let czNacePrevazujici: string | null = null;
  let source: AresSource = null;
  let reason: string | undefined;

  try {
    const [coreRes, resRes] = await Promise.all([
      fetchWithRetry(`${ARES_CORE_BASE}/${idFromDic}`, TIMEOUT_MS, MAX_RETRIES),
      fetchWithRetry(`${ARES_RES_BASE}/${idFromDic}`, TIMEOUT_MS, MAX_RETRIES),
    ]);

    if (!resRes.ok) {
      reason = `ARES RES HTTP ${resRes.status}`;
    } else {
      aresRes = (await resRes.json()) as AresResResponse;
      const extracted = extractCzNacePrevazujici(aresRes as AresResResponse);
      czNacePrevazujici = extracted.value;
      source = extracted.source;
    }

    if (!coreRes.ok) {
      if (!reason) reason = `ARES Core HTTP ${coreRes.status}`;
    } else {
      aresCore = await coreRes.json();
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    reason = message.includes("abort") ? "Timeout" : message;
  }

  return {
    dic: normalizedDic,
    ico: idFromDic,
    czNacePrevazujici: czNacePrevazujici ?? null,
    source,
    ...(reason && { reason }),
    raw: { aresCore, aresRes },
  };
}

export default getAresDataFromDic;
