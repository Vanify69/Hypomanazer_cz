import type { BankMappingConfig } from "../types.js";

/**
 * Raiffeisenbank – mapování buněk.
 *
 * Doplňte `sheet` a `cell` podle vaší .xlsm/.xlsx (přesné názvy listů včetně mezer).
 * Řádky s `TODO_RB_*` zůstávají zástupné – validace struktury je pro ně vypnutá.
 *
 * Logické klíče vstupů odpovídají `buildMortgageInputValues` v excelMapping.ts.
 */
export const rbMappingConfig: BankMappingConfig = {
  version: 2,
  inputs: {
    requestedAmount: { sheet: "TODO_RB_SHEET", cell: "TODO_A1", format: "number" },
    purpose: { sheet: "TODO_RB_SHEET", cell: "TODO_A2", format: "string" },
    propertyValue: { sheet: "TODO_RB_SHEET", cell: "TODO_A3", format: "number" },
    dependentsCount: { sheet: "TODO_RB_SHEET", cell: "TODO_A4", format: "number" },
    loanToValuePercent: { sheet: "TODO_RB_SHEET", cell: "TODO_A5", format: "number" },
    applicant1Income: { sheet: "TODO_RB_SHEET", cell: "TODO_A6", format: "number" },
    applicant1LastName: { sheet: "TODO_RB_SHEET", cell: "TODO_A7", format: "string" },
    applicant1FirstName: { sheet: "TODO_RB_SHEET", cell: "TODO_A8", format: "string" },
    applicant1DeclaredExpenses: { sheet: "TODO_RB_SHEET", cell: "TODO_A9", format: "number" },
    applicant2Income: { sheet: "TODO_RB_SHEET", cell: "TODO_A10", format: "number" },
    applicant2DeclaredExpenses: { sheet: "TODO_RB_SHEET", cell: "TODO_A11", format: "number" },
  },
  outputs: {
    maxLoanAmount: { sheet: "TODO_RB_SHEET", cell: "TODO_OUT_MAX", format: "number" },
    monthlyPayment: { sheet: "TODO_RB_SHEET", cell: "TODO_OUT_PAYMENT", format: "number" },
    dsti: { sheet: "TODO_RB_SHEET", cell: "TODO_DSTI", format: "percent01" },
    dti: { sheet: "TODO_RB_SHEET", cell: "TODO_DTI", format: "percent01" },
    pdsti: { sheet: "TODO_RB_SHEET", cell: "TODO_PDSTI", format: "percent01" },
    minRequiredIncome: { sheet: "TODO_RB_SHEET", cell: "TODO_MIN_INC", format: "number" },
    passFail: { sheet: "TODO_RB_SHEET", cell: "TODO_PASS", format: "string" },
  },
  options: { recalcBeforeRead: true },
};
