import type { BankMappingConfig } from "../types.js";

/**
 * UniCredit Bank – mapování buněk.
 *
 * Doplňte `sheet` a `cell` podle vaší šablony (přesné názvy listů).
 * Řádky s `TODO_UCB_*` jsou zástupné – validace struktury je pro ně vypnutá.
 */
export const ucbMappingConfig: BankMappingConfig = {
  version: 2,
  inputs: {
    requestedAmount: { sheet: "TODO_UCB_SHEET", cell: "TODO_B1", format: "number" },
    purpose: { sheet: "TODO_UCB_SHEET", cell: "TODO_B2", format: "string" },
    propertyValue: { sheet: "TODO_UCB_SHEET", cell: "TODO_B3", format: "number" },
    dependentsCount: { sheet: "TODO_UCB_SHEET", cell: "TODO_B4", format: "number" },
    loanToValuePercent: { sheet: "TODO_UCB_SHEET", cell: "TODO_B5", format: "number" },
    applicant1Income: { sheet: "TODO_UCB_SHEET", cell: "TODO_B6", format: "number" },
    applicant1LastName: { sheet: "TODO_UCB_SHEET", cell: "TODO_B7", format: "string" },
    applicant1FirstName: { sheet: "TODO_UCB_SHEET", cell: "TODO_B8", format: "string" },
    applicant1DeclaredExpenses: { sheet: "TODO_UCB_SHEET", cell: "TODO_B9", format: "number" },
    applicant2Income: { sheet: "TODO_UCB_SHEET", cell: "TODO_B10", format: "number" },
    applicant2DeclaredExpenses: { sheet: "TODO_UCB_SHEET", cell: "TODO_B11", format: "number" },
  },
  outputs: {
    maxLoanAmount: { sheet: "TODO_UCB_SHEET", cell: "TODO_OUT_MAX", format: "number" },
    monthlyPayment: { sheet: "TODO_UCB_SHEET", cell: "TODO_OUT_PAYMENT", format: "number" },
    dsti: { sheet: "TODO_UCB_SHEET", cell: "TODO_DSTI", format: "percent01" },
    dti: { sheet: "TODO_UCB_SHEET", cell: "TODO_DTI", format: "percent01" },
    pdsti: { sheet: "TODO_UCB_SHEET", cell: "TODO_PDSTI", format: "percent01" },
    minRequiredIncome: { sheet: "TODO_UCB_SHEET", cell: "TODO_MIN_INC", format: "number" },
    passFail: { sheet: "TODO_UCB_SHEET", cell: "TODO_PASS", format: "string" },
  },
  options: { recalcBeforeRead: true },
};
