import path from "node:path";
import { getExcelWorkerUrl } from "../../lib/env.js";
import type { BankMappingConfig, ComWorkerOutputs, MortgageCaseData } from "./types.js";
import { buildWorkerInputPayload, comOutputsFromWorkerRaw } from "./excelMapping.js";

function workerBaseUrl(): string | null {
  const u = getExcelWorkerUrl();
  return u ? u.replace(/\/$/, "") : null;
}

export function isComExcelWorkerConfigured(): boolean {
  return workerBaseUrl() != null;
}

type WorkerResponse =
  | { ok: true; fileBase64: string; outputs: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Odešle šablonu na Windows Excel COM worker, zapíše vstupy, přepočte a vrátí výstupní soubor + hodnoty.
 */
export async function runComExcelWorker(params: {
  fileBuffer: Buffer;
  mapping: BankMappingConfig;
  mortgageCaseData: MortgageCaseData;
  /** např. z originalFileName šablony */
  preferredExt?: string;
}): Promise<{ fileBuffer: Buffer; outputs: ComWorkerOutputs }> {
  const base = workerBaseUrl();
  if (!base) throw new Error("EXCEL_WORKER_URL není nastaven.");

  const inputValues = buildWorkerInputPayload(params.mapping, params.mortgageCaseData);
  const raw = params.preferredExt?.trim() ?? "";
  const ext = raw.startsWith(".") ? raw.toLowerCase() : path.extname(raw).toLowerCase();
  const preferredExt = ext === ".xlsx" || ext === ".xlsm" ? ext : ".xlsm";
  const body = {
    fileBase64: params.fileBuffer.toString("base64"),
    mapping: params.mapping,
    inputValues,
    preferredExt,
  };

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(`${base}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(to);
  }

  const data = (await res.json().catch(() => ({}))) as WorkerResponse & { error?: string };
  if (!res.ok || !data || typeof data !== "object") {
    throw new Error((data as { error?: string })?.error ?? `Excel worker HTTP ${res.status}`);
  }
  if (!("ok" in data) || !data.ok) {
    throw new Error((data as { error?: string }).error ?? "Excel worker selhal.");
  }
  const ok = data as { ok: true; fileBase64: string; outputs: Record<string, unknown> };
  if (!ok.fileBase64) throw new Error("Excel worker nevrátil soubor.");
  const fileBuffer = Buffer.from(ok.fileBase64, "base64");
  const outputs = comOutputsFromWorkerRaw(ok.outputs ?? {}, params.mapping);
  return { fileBuffer, outputs };
}

/** Pro dokumentaci / health – volitelné volání GET /health na workeru. */
export async function pingComExcelWorker(): Promise<boolean> {
  const base = workerBaseUrl();
  if (!base) return false;
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 3000);
    const res = await fetch(`${base}/health`, { signal: c.signal }).finally(() => clearTimeout(t));
    return res.ok;
  } catch {
    return false;
  }
}
