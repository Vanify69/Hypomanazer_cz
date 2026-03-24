import type {
  BankMappingConfig,
  CellRef,
  CellValueFormat,
  ComWorkerOutputs,
  MortgageCaseData,
  PassFail,
} from "./types.js";
import type { ExcelWorkbookDriver } from "./excelWorkbookDriver.js";
import { ExcelJsWorkbookDriver } from "./excelJsWorkbookDriver.js";

/** Listy/buňky se zástupným prefixem TODO_ se při zápisu/validaci přeskakují. */
export function isPlaceholderSheet(sheet: string): boolean {
  return sheet.trim().startsWith("TODO_");
}

export function isPlaceholderCell(cell: string): boolean {
  return cell.trim().startsWith("TODO_");
}

export function shouldSkipRef(ref: CellRef | undefined): boolean {
  if (!ref) return true;
  return isPlaceholderSheet(ref.sheet) || isPlaceholderCell(ref.cell);
}

/**
 * Sjednocené vstupní hodnoty z případu – klíče odpovídají `inputs` v BankMappingConfig.
 */
export function buildMortgageInputValues(data: MortgageCaseData): Record<string, string | number | undefined> {
  const primary = data.applicants.find((a) => a.role === "primary") ?? data.applicants[0];
  const co = data.applicants.find((a) => a.role === "co");

  return {
    requestedAmount: data.requestedLoanAmount,
    purpose: data.purpose,
    propertyValue: data.propertyValue,
    dependentsCount: data.dependentsCount,
    loanToValuePercent: data.loanToValuePercent,
    applicant1Income: primary?.monthlyIncome,
    applicant1LastName: primary?.lastName,
    applicant1FirstName: primary?.firstName,
    applicant1DeclaredExpenses: primary?.declaredExpenses,
    applicant2Income: co?.monthlyIncome,
    applicant2DeclaredExpenses: co?.declaredExpenses,
  };
}

function coerceWriteValue(
  format: CellValueFormat | undefined,
  value: string | number | boolean | undefined | null
): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  const f = format ?? "number";
  if (f === "string") return String(value);
  if (f === "bool") return Boolean(value);
  if (f === "number") return typeof value === "number" ? value : Number(String(value).replace(/\s/g, "").replace(",", ".")) || 0;
  if (f === "percent" || f === "percent01") {
    const n = typeof value === "number" ? value : Number(String(value).replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(n)) return null;
    // Excel často očekává desetinné podíly (0.28); pokud přijde 28, převeď
    if (n > 1 && n <= 100) return n / 100;
    return n;
  }
  return value as number;
}

export function applyInputMapping(
  mapping: BankMappingConfig,
  data: MortgageCaseData,
  driver: ExcelWorkbookDriver
): void {
  const values = buildMortgageInputValues(data);
  for (const [key, ref] of Object.entries(mapping.inputs)) {
    if (shouldSkipRef(ref)) continue;
    const raw = values[key as keyof ReturnType<typeof buildMortgageInputValues>];
    const v = coerceWriteValue(ref!.format, raw ?? null);
    if (v !== null) driver.setCellValue(ref!, v);
  }
}

function parseNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(String(raw).replace(/\s/g, "").replace(/%$/, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parsePercent(raw: unknown, format: CellValueFormat | undefined): number | undefined {
  const n = parseNumber(raw);
  if (n === undefined) return undefined;
  if (format === "percent01") {
    if (n >= 0 && n <= 1) return n;
    if (n > 1 && n <= 100) return n / 100;
    return n;
  }
  if (format === "percent") {
    if (n > 1 && n <= 100) return n / 100;
    return n;
  }
  return n;
}

export function parsePassFail(raw: unknown): PassFail {
  if (raw === true) return "PASS";
  if (raw === false) return "FAIL";
  const s = String(raw ?? "").trim().toLowerCase();
  if (/^(1|ano|yes|y|ok|pass|true|splněno|splneno)$/.test(s)) return "PASS";
  if (/^(0|ne|no|n|fail|false|nesplněno|nesplneno)$/.test(s)) return "FAIL";
  return "UNKNOWN";
}

export function readOutputMapping(mapping: BankMappingConfig, driver: ExcelWorkbookDriver): ComWorkerOutputs {
  const o: ComWorkerOutputs = {};

  const readNum = (key: "maxLoanAmount" | "monthlyPayment" | "minRequiredIncome", ref: CellRef | undefined) => {
    if (shouldSkipRef(ref)) return;
    const n = parseNumber(driver.getCellRawValue(ref!));
    if (n !== undefined) o[key] = Math.round(n);
  };

  const readPct = (key: "dsti" | "dti" | "pdsti", ref: CellRef | undefined) => {
    if (shouldSkipRef(ref)) return;
    const p = parsePercent(driver.getCellRawValue(ref!), ref!.format);
    if (p !== undefined) o[key] = p;
  };

  readNum("maxLoanAmount", mapping.outputs.maxLoanAmount);
  readNum("monthlyPayment", mapping.outputs.monthlyPayment);
  readPct("dsti", mapping.outputs.dsti);
  readPct("dti", mapping.outputs.dti);
  readPct("pdsti", mapping.outputs.pdsti);
  readNum("minRequiredIncome", mapping.outputs.minRequiredIncome);

  if (mapping.outputs.passFail && !shouldSkipRef(mapping.outputs.passFail)) {
    const raw = driver.getCellRawValue(mapping.outputs.passFail);
    o.passFail = parsePassFail(raw);
    o.outcomeLabel = raw != null ? String(raw) : undefined;
  }

  return o;
}

export async function applyMappingToBuffer(
  mapping: BankMappingConfig,
  data: MortgageCaseData,
  inputBuffer: Buffer
): Promise<Buffer> {
  const driver = new ExcelJsWorkbookDriver();
  await driver.loadFromBuffer(inputBuffer);
  applyInputMapping(mapping, data, driver);
  return driver.writeToBuffer();
}

export async function readOutputsFromBuffer(
  mapping: BankMappingConfig,
  buffer: Buffer
): Promise<ComWorkerOutputs> {
  const driver = new ExcelJsWorkbookDriver();
  await driver.loadFromBuffer(buffer);
  return readOutputMapping(mapping, driver);
}

/** Hodnoty připravené pro COM worker (už přetypované podle formátu buňky). */
export function buildWorkerInputPayload(
  mapping: BankMappingConfig,
  data: MortgageCaseData
): Record<string, string | number | boolean | null> {
  const values = buildMortgageInputValues(data);
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, ref] of Object.entries(mapping.inputs)) {
    if (shouldSkipRef(ref)) continue;
    const raw = values[key as keyof ReturnType<typeof buildMortgageInputValues>];
    out[key] = coerceWriteValue(ref!.format, raw ?? null);
  }
  return out;
}

/** Normalizace surových hodnot z COM (klíče = názvy v mapping.outputs). */
export function comOutputsFromWorkerRaw(
  raw: Record<string, unknown>,
  mapping: BankMappingConfig
): ComWorkerOutputs {
  const o: ComWorkerOutputs = {};
  const get = (k: string) => raw[k];

  const setNum = (field: "maxLoanAmount" | "monthlyPayment" | "minRequiredIncome", key: string) => {
    const v = parseNumber(get(key));
    if (v !== undefined) o[field] = Math.round(v);
  };
  const p = (k: "dsti" | "dti" | "pdsti", key: string, fmt: CellValueFormat | undefined) => {
    const v = parsePercent(get(key), fmt);
    if (v !== undefined) o[k] = v;
  };

  setNum("maxLoanAmount", "maxLoanAmount");
  setNum("monthlyPayment", "monthlyPayment");
  setNum("minRequiredIncome", "minRequiredIncome");
  p("dsti", "dsti", mapping.outputs.dsti?.format);
  p("dti", "dti", mapping.outputs.dti?.format);
  p("pdsti", "pdsti", mapping.outputs.pdsti?.format);
  if (mapping.outputs.passFail && get("passFail") !== undefined) {
    o.passFail = parsePassFail(get("passFail"));
    o.outcomeLabel = String(get("passFail"));
  }
  return o;
}
