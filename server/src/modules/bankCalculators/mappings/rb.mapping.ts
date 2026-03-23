import type { BankMappingConfig } from "../types.js";

/**
 * TODO RB: Doplňte `sheet` a `cell` podle skutečné .xlsm kalkulačky Raiffeisenbank.
 * Hodnoty níže jsou záměrné placeholdery – výpočet v aplikaci zatím běží v mock režimu.
 */
export const rbMappingConfig: BankMappingConfig = {
  version: 1,
  inputs: {
    applicant1Income: { sheet: "TODO_RB_SHEET", cell: "TODO_A1" },
    requestedAmount: { sheet: "TODO_RB_SHEET", cell: "TODO_A2" },
    applicant1LastName: { sheet: "TODO_RB_SHEET", cell: "TODO_A3" },
  },
  outputs: {
    maxLoanAmount: { sheet: "TODO_RB_SHEET", cell: "TODO_OUT_MAX" },
    monthlyPayment: { sheet: "TODO_RB_SHEET", cell: "TODO_OUT_PAYMENT" },
    dsti: { sheet: "TODO_RB_SHEET", cell: "TODO_DSTI" },
    dti: { sheet: "TODO_RB_SHEET", cell: "TODO_DTI" },
    pdsti: { sheet: "TODO_RB_SHEET", cell: "TODO_PDSTI" },
    minRequiredIncome: { sheet: "TODO_RB_SHEET", cell: "TODO_MIN_INC" },
    passFail: { sheet: "TODO_RB_SHEET", cell: "TODO_PASS" },
  },
  options: { recalcBeforeRead: true },
};
