import type { BankCalculatorCode } from "../../../lib/prisma.js";
import type { CalculationEngine } from "../calculationEngine.js";
import type { BankCalculationResultDTO, LoadedTemplate, MortgageCaseData } from "../types.js";

/** Minimální záznam šablony pro adaptér (z DB). */
export type BankTemplateRecord = {
  id: string;
  storageKey: string;
  bankCode: BankCalculatorCode;
  originalFileName: string;
};

export interface BankAdapter {
  readonly bankCode: BankCalculatorCode;

  loadTemplate(ctx: { template: BankTemplateRecord; fileBuffer: Buffer }): Promise<LoadedTemplate>;

  mapInputs(loaded: LoadedTemplate, data: MortgageCaseData): Promise<void>;

  calculate(loaded: LoadedTemplate, engine: CalculationEngine): Promise<void>;

  extractOutputs(loaded: LoadedTemplate, data: MortgageCaseData): Promise<Partial<BankCalculationResultDTO>>;

  saveGeneratedFile(loaded: LoadedTemplate): Promise<{ buffer: Buffer; fileName: string }>;
}
