import type { BankCalculatorCode, BankTemplateMappingStatus, BankCalculationStatus } from "../../lib/prisma.js";

export type { BankCalculatorCode, BankTemplateMappingStatus, BankCalculationStatus };

/** Odkaz na buňku v Excelu – po doplnění skutečných listů u RB/UCB. */
export type CellRef = { sheet: string; cell: string };

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
  applicants: Array<{
    role: "primary" | "co";
    firstName?: string;
    lastName?: string;
    birthNumber?: string;
    monthlyIncome?: number;
    declaredExpenses?: number;
  }>;
}

export type WorkbookHandle = {
  buffer: Buffer;
};

export type LoadedTemplate = {
  bankCode: BankCalculatorCode;
  templateId: string;
  storageKey: string;
  handle: WorkbookHandle;
  mapping: BankMappingConfig;
};

export type PassFail = "PASS" | "FAIL" | "UNKNOWN";

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
