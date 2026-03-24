import type { BankCalculatorCode, BankTemplateMappingStatus, BankCalculationStatus } from "../../lib/prisma.js";

export type { BankCalculatorCode, BankTemplateMappingStatus, BankCalculationStatus };

/** Jak zapisovat / interpretovat hodnotu při čtení z buňky. */
export type CellValueFormat = "number" | "percent" | "percent01" | "bool" | "string";

/**
 * Odkaz na buňku v Excelu.
 * Reálné názvy listů a adresy doplňte podle šablony banky (viz rb.mapping / ucb.mapping).
 */
export type CellRef = {
  sheet: string;
  cell: string;
  /** Výchozí: number pro měny/poměry, string pro textové buňky. */
  format?: CellValueFormat;
};

export type BankMappingConfig = {
  version: number;
  inputs: Record<string, CellRef | undefined>;
  outputs: Record<string, CellRef | undefined>;
  options?: { recalcBeforeRead?: boolean };
};

export interface MortgageCaseData {
  caseId: string;
  requestedLoanAmount?: number;
  purpose?: string;
  /** Odhadovaná hodnota zastavení / nemovitosti (Kč), pokud je v případu k dispozici. */
  propertyValue?: number;
  /** Počet vyživovaných osob / dětí – pokud kalkulačka vyžaduje. */
  dependentsCount?: number;
  /** Cílové LTV v % (0–100), volitelné. */
  loanToValuePercent?: number;
  applicants: Array<{
    role: "primary" | "co";
    firstName?: string;
    lastName?: string;
    birthNumber?: string;
    monthlyIncome?: number;
    declaredExpenses?: number;
  }>;
}

export type PassFail = "PASS" | "FAIL" | "UNKNOWN";

/**
 * Výsledek přepočtu z Windows Excel COM workeru (před normalizací do DTO).
 * Naplní se jen když běží worker (EXCEL_WORKER_URL).
 */
export type ComWorkerOutputs = {
  maxLoanAmount?: number;
  monthlyPayment?: number;
  dsti?: number;
  dti?: number;
  pdsti?: number;
  minRequiredIncome?: number;
  passFail?: PassFail;
  outcomeLabel?: string;
};

export type WorkbookHandle = {
  buffer: Buffer;
  /** Po úspěšném COM přepočtu – čísla z workeru (Excel už workbook přepočítal). */
  comOutputs?: ComWorkerOutputs;
};

export type LoadedTemplate = {
  bankCode: BankCalculatorCode;
  templateId: string;
  storageKey: string;
  /** Přípona původního souboru (.xlsm / .xlsx) pro uložení výstupu. */
  sourceExtension: string;
  handle: WorkbookHandle;
  mapping: BankMappingConfig;
};

export interface BankCalculationResultDTO {
  runId: string;
  bankCode: BankCalculatorCode;
  status: BankCalculationStatus;
  maxLoanAmount?: number;
  monthlyPayment?: number;
  dsti?: number;
  dti?: number;
  pdsti?: number;
  minRequiredIncome?: number;
  passFail?: PassFail;
  outcomeLabel?: string;
  errorMessage?: string;
}
