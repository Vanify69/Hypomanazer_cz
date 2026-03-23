import { BankCalculatorCode, BankCalculationStatus } from "../../../lib/prisma.js";
import type { BankAdapter } from "./adapterTypes.js";
import type { CalculationEngine } from "../calculationEngine.js";
import type { LoadedTemplate, MortgageCaseData } from "../types.js";
import type { BankCalculationResultDTO } from "../types.js";
import { ucbMappingConfig } from "../mappings/ucb.mapping.js";

export class UcbAdapter implements BankAdapter {
  readonly bankCode = BankCalculatorCode.UCB;

  async loadTemplate(ctx: {
    template: { id: string; storageKey: string; bankCode: BankCalculatorCode };
    fileBuffer: Buffer;
  }): Promise<LoadedTemplate> {
    return {
      bankCode: this.bankCode,
      templateId: ctx.template.id,
      storageKey: ctx.template.storageKey,
      handle: { buffer: Buffer.from(ctx.fileBuffer) },
      mapping: ucbMappingConfig,
    };
  }

  async mapInputs(loaded: LoadedTemplate, data: MortgageCaseData): Promise<void> {
    // TODO UCB: Zapište hodnoty z `data` do buněk dle `loaded.mapping.inputs`.
    void loaded;
    void data;
  }

  async calculate(loaded: LoadedTemplate, engine: CalculationEngine): Promise<void> {
    await engine.recalculate(loaded.handle);
  }

  async extractOutputs(
    loaded: LoadedTemplate,
    data: MortgageCaseData
  ): Promise<Partial<BankCalculationResultDTO>> {
    // TODO UCB: Čtěte výstupní buňky po přepočtu.
    void loaded;
    const seed = (data.caseId + "ucb").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const base = (data.requestedLoanAmount ?? 3_000_000) + (seed % 120_000);
    return {
      status: BankCalculationStatus.MOCK,
      maxLoanAmount: Math.min(base, 11_500_000),
      monthlyPayment: 11_500 + (seed % 4_500),
      dsti: 0.27 + (seed % 12) / 100,
      dti: 0.34 + (seed % 9) / 100,
      pdsti: 0.14 + (seed % 6) / 100,
      minRequiredIncome: 34_000 + (seed % 9_000),
      passFail: "UNKNOWN",
      outcomeLabel: "Mock UCB (mapování buněk TODO)",
    };
  }

  async saveGeneratedFile(loaded: LoadedTemplate): Promise<{ buffer: Buffer; fileName: string }> {
    // TODO UCB: Export workbook po přepočtu.
    return {
      buffer: Buffer.from(loaded.handle.buffer),
      fileName: `UCB_vypocet_${Date.now()}.xlsm`,
    };
  }
}
