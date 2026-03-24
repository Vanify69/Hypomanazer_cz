/**
 * Validace povinných slotů před submitem intake – exportováno pro unit testy.
 */

import type { IntakeIncomeKind } from "./intakeSlotSync.js";
import { normalizeIntakeIncome } from "./intakeSlotSync.js";

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
  /** Typ příjmu spolužadatele (stejné hodnoty jako incomeType). */
  coApplicantIncomeType?: string;
  /** Zda uživatel uvedl, že má spolužadatele. Přednost před inferencí ze slotů. */
  hasCoApplicant?: boolean;
}

function validateOpForRole(slots: SlotLike[], role: string): string | null {
  const roleSlots = slots.filter((s) => s.personRole === role);
  for (const s of roleSlots) {
    if (
      (s.docType === "ID_FRONT" || s.docType === "ID_BACK") &&
      s.required &&
      s.status !== "UPLOADED"
    ) {
      return role === "CO_APPLICANT"
        ? "Chybí nahrání občanského průkazu spolužadatele (přední/zadní strana)."
        : "Chybí nahrání občanského průkazu (přední/zadní strana).";
    }
  }
  return null;
}

function validateIncomeDocsForRole(
  slots: SlotLike[],
  role: string,
  income: IntakeIncomeKind
): string | null {
  const roleSlots = slots.filter((s) => s.personRole === role);
  const needBank = income === "EMPLOYED" || income === "BOTH";
  const needTax = income === "SELF_EMPLOYED" || income === "BOTH" || income === "COMPANY";

  if (needBank) {
    const bankUploaded = roleSlots.filter(
      (s) => s.docType === "BANK_STATEMENT" && s.status === "UPLOADED"
    ).length;
    if (bankUploaded < 6) {
      return role === "CO_APPLICANT"
        ? "U spolužadatele (zaměstnanec) je potřeba 6 výpisů z účtu."
        : "U zaměstnance je potřeba 6 výpisů z účtu.";
    }
  }

  if (needTax) {
    const hasRequiredTaxSlot = roleSlots.some((s) => s.docType === "TAX_RETURN" && s.required);
    const taxUploaded = roleSlots.some(
      (s) => s.docType === "TAX_RETURN" && s.required && s.status === "UPLOADED"
    );
    if (hasRequiredTaxSlot && !taxUploaded) {
      return role === "CO_APPLICANT"
        ? "Chybí daňové přiznání u spolužadatele (OSVČ / firma)."
        : "Chybí daňové přiznání (OSVČ).";
    }
  }

  return null;
}

/**
 * Starší chování: bez options.incomeType se nevyžadují výpisy, jen DP pokud existuje povinný slot TAX_RETURN.
 */
function validateLegacyApplicantTax(slots: SlotLike[]): string | null {
  const applicantSlots = slots.filter((s) => s.personRole === "APPLICANT");
  const needTaxReturn = applicantSlots.some((s) => s.docType === "TAX_RETURN" && s.required);
  if (needTaxReturn && !applicantSlots.some((s) => s.docType === "TAX_RETURN" && s.status === "UPLOADED")) {
    return "Chybí daňové přiznání (OSVČ).";
  }
  return null;
}

/**
 * Validace povinných slotů před submitem. Vrací chybovou zprávu nebo null.
 */
export function validateRequiredSlots(
  slots: SlotLike[],
  options?: ValidateRequiredSlotsOptions
): string | null {
  const coSlots = slots.filter((s) => s.personRole === "CO_APPLICANT");
  const hasCoApplicant = options?.hasCoApplicant ?? coSlots.length > 0;

  const errApplicantOp = validateOpForRole(slots, "APPLICANT");
  if (errApplicantOp) return errApplicantOp;

  if (hasCoApplicant) {
    const errCoOp = validateOpForRole(slots, "CO_APPLICANT");
    if (errCoOp) return errCoOp;
  }

  if (options?.incomeType !== undefined) {
    const mainIncome = normalizeIntakeIncome(options.incomeType);
    const errMain = validateIncomeDocsForRole(slots, "APPLICANT", mainIncome);
    if (errMain) return errMain;
  } else {
    const legacyTax = validateLegacyApplicantTax(slots);
    if (legacyTax) return legacyTax;
  }

  if (hasCoApplicant && options?.coApplicantIncomeType !== undefined) {
    const coIncome = normalizeIntakeIncome(options.coApplicantIncomeType);
    const errCo = validateIncomeDocsForRole(slots, "CO_APPLICANT", coIncome);
    if (errCo) return errCo;
  }

  return null;
}
