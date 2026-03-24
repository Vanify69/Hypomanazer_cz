import { BankCalculationStatus } from "../../lib/prisma.js";
import { readOutputsFromBuffer } from "./excelMapping.js";
import type { BankCalculationResultDTO, ComWorkerOutputs, LoadedTemplate, MortgageCaseData } from "./types.js";

export function comOutputsPopulated(o: ComWorkerOutputs | undefined): boolean {
  if (!o) return false;
  return Object.values(o).some((v) => v !== undefined && v !== null && v !== "");
}

export async function resolveAdapterOutputs(
  loaded: LoadedTemplate,
  _data: MortgageCaseData,
  mockFallback: () => Promise<Partial<BankCalculationResultDTO>>
): Promise<Partial<BankCalculationResultDTO>> {
  const c = loaded.handle.comOutputs;
  if (comOutputsPopulated(c)) {
    return {
      status: BankCalculationStatus.SUCCESS,
      maxLoanAmount: c!.maxLoanAmount,
      monthlyPayment: c!.monthlyPayment,
      dsti: c!.dsti,
      dti: c!.dti,
      pdsti: c!.pdsti,
      minRequiredIncome: c!.minRequiredIncome,
      passFail: c!.passFail,
      outcomeLabel: c!.outcomeLabel,
    };
  }

  try {
    const fromBuf = await readOutputsFromBuffer(loaded.mapping, loaded.handle.buffer);
    if (comOutputsPopulated(fromBuf)) {
      return {
        status: BankCalculationStatus.MOCK,
        maxLoanAmount: fromBuf.maxLoanAmount,
        monthlyPayment: fromBuf.monthlyPayment,
        dsti: fromBuf.dsti,
        dti: fromBuf.dti,
        pdsti: fromBuf.pdsti,
        minRequiredIncome: fromBuf.minRequiredIncome,
        passFail: fromBuf.passFail,
        outcomeLabel: fromBuf.outcomeLabel ?? "Hodnoty načteny ze souboru (bez Excel COM přepočtu).",
      };
    }
  } catch {
    /* šablona nejde načíst ExcelJS nebo prázdné výstupy */
  }

  return mockFallback();
}
