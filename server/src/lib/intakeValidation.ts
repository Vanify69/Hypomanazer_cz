/**
 * Validace povinných slotů před submitem intake – exportováno pro unit testy.
 */

export interface SlotLike {
  personRole: string;
  docType: string;
  required: boolean;
  status: string;
  period?: string | null;
}

export interface ValidateRequiredSlotsOptions {
  /** Když EMPLOYED, DP (daňové přiznání) se nevyžaduje. */
  incomeType?: string;
  /** Zda uživatel uvedl, že má spolužadatele. Přednost před inferencí ze slotů. */
  hasCoApplicant?: boolean;
}

/**
 * Validace povinných slotů před submitem. Vrací chybovou zprávu nebo null.
 */
export function validateRequiredSlots(slots: SlotLike[], options?: ValidateRequiredSlotsOptions): string | null {
  const applicantSlots = slots.filter((s) => s.personRole === "APPLICANT");
  const coSlots = slots.filter((s) => s.personRole === "CO_APPLICANT");
  const hasCoApplicant = options?.hasCoApplicant ?? coSlots.length > 0;

  for (const s of applicantSlots) {
    if ((s.docType === "ID_FRONT" || s.docType === "ID_BACK") && s.required && s.status !== "UPLOADED") {
      return "Chybí nahrání občanského průkazu (přední/zadní strana).";
    }
  }
  if (hasCoApplicant) {
    const coIdFront = coSlots.some((s) => s.docType === "ID_FRONT" && s.status === "UPLOADED");
    const coIdBack = coSlots.some((s) => s.docType === "ID_BACK" && s.status === "UPLOADED");
    if (!coIdFront || !coIdBack) return "Chybí OP spolužadatele (přední/zadní strana).";
  }

  const bankStatements = applicantSlots.filter((s) => s.docType === "BANK_STATEMENT" && s.status === "UPLOADED");
  const taxReturns = applicantSlots.filter((s) => s.docType === "TAX_RETURN" && s.status === "UPLOADED");
  const needBankStatements = options?.incomeType === "EMPLOYED" || options?.incomeType === "BOTH";
  if (needBankStatements) {
    if (bankStatements.length < 6) {
      return "U zaměstnance je potřeba 6 výpisů z účtu.";
    }
  }
  const isEmployeeOnly = options?.incomeType === "EMPLOYED";
  const needTaxReturn =
    !isEmployeeOnly && applicantSlots.some((s) => s.docType === "TAX_RETURN" && s.required);
  if (needTaxReturn && taxReturns.length === 0) {
    return "Chybí daňové přiznání (OSVČ).";
  }
  return null;
}
