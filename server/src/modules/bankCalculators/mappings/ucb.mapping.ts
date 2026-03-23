import type { BankMappingConfig } from "../types.js";

/**
 * TODO UCB: Doplňte `sheet` a `cell` podle skutečné .xlsm kalkulačky UniCredit Bank.
 * Placeholdery – reálný přepočet buněk doplnit po analýze šablony.
 */
export const ucbMappingConfig: BankMappingConfig = {
  version: 1,
  inputs: {
    applicant1Income: { sheet: "TODO_UCB_SHEET", cell: "TODO_B1" },
    requestedAmount: { sheet: "TODO_UCB_SHEET", cell: "TODO_B2" },
  },
  outputs: {
    maxLoanAmount: { sheet: "TODO_UCB_SHEET", cell: "TODO_OUT_MAX" },
    monthlyPayment: { sheet: "TODO_UCB_SHEET", cell: "TODO_OUT_PAYMENT" },
    dsti: { sheet: "TODO_UCB_SHEET", cell: "TODO_DSTI" },
    dti: { sheet: "TODO_UCB_SHEET", cell: "TODO_DTI" },
    pdsti: { sheet: "TODO_UCB_SHEET", cell: "TODO_PDSTI" },
    minRequiredIncome: { sheet: "TODO_UCB_SHEET", cell: "TODO_MIN_INC" },
    passFail: { sheet: "TODO_UCB_SHEET", cell: "TODO_PASS" },
  },
  options: { recalcBeforeRead: true },
};
