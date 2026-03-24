/** Typ příjmu ve wizardu (UI) – mapuje se na API EMPLOYED / SELF_EMPLOYED / COMPANY. */

export type WizardIncomeType = 'ZAMESTNANEC' | 'OSVC' | 'FIRMA';

export type RelationType =
  | 'MANZEL'
  | 'MANZELKA'
  | 'DRUH'
  | 'DRUZKA'
  | 'PARTNER'
  | 'RODINA'
  | 'JINY';

export interface HouseholdData {
  /** undefined = uživatel ještě nezvolil */
  existujiciUvery?: boolean;
  mesicniSplatky?: number;
  pocetVyzivanychOsob?: number;
  dalsiZavazky?: string;
}

export const INCOME_TYPE_LABELS: Record<WizardIncomeType, string> = {
  ZAMESTNANEC: 'Zaměstnanec',
  OSVC: 'OSVČ',
  FIRMA: 'Firma / s.r.o.',
};

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  MANZEL: 'Manžel',
  MANZELKA: 'Manželka',
  DRUH: 'Druh',
  DRUZKA: 'Družka',
  PARTNER: 'Partner',
  RODINA: 'Rodinný příslušník',
  JINY: 'Jiný',
};

export const MAIN_APPLICANT_ID = 'main-applicant';
export const CO_APPLICANT_ID = 'co-applicant-1';

export type ApiPersonRole = 'APPLICANT' | 'CO_APPLICANT';
