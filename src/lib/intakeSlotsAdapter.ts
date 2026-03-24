import type { ApiPersonRole, WizardIncomeType } from './intakeWizardTypes';

export type UploadSlotView = {
  id: string;
  personRole: string;
  docType: string;
  period?: string;
  required: boolean;
  status: string;
};

export function wizardIncomeToApi(
  w: WizardIncomeType
): 'EMPLOYED' | 'SELF_EMPLOYED' | 'COMPANY' {
  switch (w) {
    case 'ZAMESTNANEC':
      return 'EMPLOYED';
    case 'OSVC':
      return 'SELF_EMPLOYED';
    case 'FIRMA':
      return 'COMPANY';
    default:
      return 'EMPLOYED';
  }
}

export function apiIncomeNeedsIco(api: string): boolean {
  return api === 'SELF_EMPLOYED' || api === 'BOTH';
}

/** IČO ve wizardu pro OSVČ i firmu (s.r.o.). */
export function wizardIncomeNeedsIco(w: WizardIncomeType): boolean {
  return w === 'OSVC' || w === 'FIRMA';
}

export function slotsForRole(slots: UploadSlotView[], role: ApiPersonRole): UploadSlotView[] {
  return slots.filter((s) => s.personRole === role);
}

export function opFrontSlot(
  slots: UploadSlotView[],
  role: ApiPersonRole
): UploadSlotView | undefined {
  return slots.find((s) => s.personRole === role && s.docType === 'ID_FRONT');
}

export function opBackSlot(
  slots: UploadSlotView[],
  role: ApiPersonRole
): UploadSlotView | undefined {
  return slots.find((s) => s.personRole === role && s.docType === 'ID_BACK');
}

export function bankSlotsForRole(
  slots: UploadSlotView[],
  role: ApiPersonRole
): UploadSlotView[] {
  return slots
    .filter((s) => s.personRole === role && s.docType === 'BANK_STATEMENT')
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function taxSlotForRole(
  slots: UploadSlotView[],
  role: ApiPersonRole
): UploadSlotView | undefined {
  return slots.find((s) => s.personRole === role && s.docType === 'TAX_RETURN');
}

export function countBankUploaded(slots: UploadSlotView[], role: ApiPersonRole): number {
  return bankSlotsForRole(slots, role).filter((s) => s.status === 'UPLOADED').length;
}

export function isPersonDocsCompleteFromSlots(
  slots: UploadSlotView[],
  role: ApiPersonRole,
  income: WizardIncomeType
): boolean {
  const f = opFrontSlot(slots, role);
  const b = opBackSlot(slots, role);
  if (!f || f.status !== 'UPLOADED' || !b || b.status !== 'UPLOADED') return false;
  const api = wizardIncomeToApi(income);
  if (api === 'EMPLOYED') {
    return countBankUploaded(slots, role) >= 6;
  }
  if (api === 'SELF_EMPLOYED' || api === 'COMPANY') {
    const t = taxSlotForRole(slots, role);
    return !!t && t.status === 'UPLOADED';
  }
  return true;
}

export function getMissingItemsFromSlots(
  slots: UploadSlotView[],
  role: ApiPersonRole,
  income: WizardIncomeType | undefined
): string[] {
  const missing: string[] = [];
  if (!income) {
    missing.push('Typ příjmu');
    return missing;
  }
  const f = opFrontSlot(slots, role);
  const b = opBackSlot(slots, role);
  if (!f || f.status !== 'UPLOADED') missing.push('OP - přední strana');
  if (!b || b.status !== 'UPLOADED') missing.push('OP - zadní strana');
  const api = wizardIncomeToApi(income);
  if (api === 'EMPLOYED') {
    const need = 6 - countBankUploaded(slots, role);
    if (need > 0) missing.push(`${need} výpis${need > 1 ? 'y' : ''} z účtu`);
  } else if (api === 'SELF_EMPLOYED' || api === 'COMPANY') {
    const t = taxSlotForRole(slots, role);
    if (!t || t.status !== 'UPLOADED') {
      missing.push(api === 'COMPANY' ? 'Daňové přiznání PO (DPPO)' : 'Daňové přiznání FO (DPFO)');
    }
  }
  return missing;
}

export function isHouseholdComplete(h: { existujiciUvery?: boolean }): boolean {
  return h.existujiciUvery !== undefined;
}

export function isWizardIntakeComplete(
  slots: UploadSlotView[],
  hasCoApplicant: boolean,
  mainIncome: WizardIncomeType | undefined,
  coIncome: WizardIncomeType | undefined,
  household: { existujiciUvery?: boolean },
  coRelationOk: boolean
): boolean {
  if (!mainIncome || !isPersonDocsCompleteFromSlots(slots, 'APPLICANT', mainIncome)) return false;
  if (hasCoApplicant) {
    if (!coRelationOk || !coIncome || !isPersonDocsCompleteFromSlots(slots, 'CO_APPLICANT', coIncome))
      return false;
  }
  return isHouseholdComplete(household);
}
