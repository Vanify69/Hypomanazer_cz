import { BankCalculatorCode, BankCalculationStatus } from "../../../lib/prisma.js";
import type { BankAdapter } from "./adapterTypes.js";
import type { CalculationEngine } from "../calculationEngine.js";
import type { LoadedTemplate, MortgageCaseData } from "../types.js";
import type { BankCalculationResultDTO } from "../types.js";
import { rbMappingConfig } from "../mappings/rb.mapping.js";

export class RbAdapter implements BankAdapter {
  readonly bankCode = BankCalculatorCode.RB;

  async loadTemplate(ctx: {
    template: { id: string; storageKey: string; bankCode: BankCalculatorCode };
    fileBuffer: Buffer;
  }): Promise<LoadedTemplate> {
    return {
      bankCode: this.bankCode,
      templateId: ctx.template.id,
      storageKey: ctx.template.storageKey,
      handle: { buffer: Buffer.from(ctx.fileBuffer) },
      mapping: rbMappingConfig,
    };
  }

  async mapInputs(loaded: LoadedTemplate, data: MortgageCaseData): Promise<void> {
    // TODO RB: Zapište hodnoty z `data` do buněk dle `loaded.mapping.inputs` (Excel knihovna / COM).
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
    // TODO RB: Čtěte `loaded.mapping.outputs` po přepočtu – zatím mock podle případu.
    void loaded;
    const seed = data.caseId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const base = (data.requestedLoanAmount ?? 3_000_000) + (seed % 100_000);
    return {
      status: BankCalculationStatus.MOCK,
      maxLoanAmount: Math.min(base, 12_000_000),
      monthlyPayment: 12_000 + (seed % 5_000),
      dsti: 0.28 + (seed % 10) / 100,
      dti: 0.35 + (seed % 8) / 100,
      pdsti: 0.15 + (seed % 5) / 100,
      minRequiredIncome: 35_000 + (seed % 8_000),
      passFail: "UNKNOWN",
      outcomeLabel: "Mock RB (mapování buněk TODO)",
    };
  }

  async saveGeneratedFile(loaded: LoadedTemplate): Promise<{ buffer: Buffer; fileName: string }> {
    // TODO RB: Po skutečném výpočtu uložte workbook z engine – zatím kopie šablony.
    return {
      buffer: Buffer.from(loaded.handle.buffer),
      fileName: `RB_vypocet_${Date.now()}.xlsm`,
    };
  }
}
