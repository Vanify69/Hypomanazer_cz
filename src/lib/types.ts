export type CaseStatus = 'novy' | 'data-vytazena' | 'doplneno';

/** Řádky DAP (daňové přiznání): číslo řádku → hodnota v Kč */
export type DpDataLines = Record<string, number>;

/** DP z API: buď legacy (jen řádky), nebo nový tvar s lines + základní údaje */
export interface DpDataFull {
  lines: DpDataLines;
  ic?: string;
  dic?: string;
  czNace?: string;
  zpusobVydaju?: string;
  /** Rok zdaňovacího období z DP (pro nadpis). */
  rokZdanovaciObdobi?: number;
}

/** Pro zpětnou kompatibilitu: DpData může být starý tvar (jen řádky) nebo DpDataFull */
export type DpData = DpDataLines | DpDataFull;

export function isDpDataFull(d: DpData): d is DpDataFull {
  return d != null && typeof d === 'object' && 'lines' in d;
}

export function getDpLines(d: DpData | undefined): DpDataLines {
  if (!d) return {};
  return isDpDataFull(d) ? d.lines ?? {} : d;
}

export function getDpBasic(d: DpData | undefined): Pick<DpDataFull, 'ic' | 'dic' | 'czNace' | 'zpusobVydaju' | 'rokZdanovaciObdobi'> {
  if (!d || !isDpDataFull(d)) return {};
  return {
    ic: d.ic,
    dic: d.dic,
    czNace: d.czNace,
    zpusobVydaju: d.zpusobVydaju,
    rokZdanovaciObdobi: d.rokZdanovaciObdobi,
  };
}

/** Jedna položka příjmu z výpisu */
export interface VypisEntry {
  datum: string;
  popis: string;
  castka: number;
  platce?: string; // plátce / zaměstnavatel – pro agregaci podle firmy
}

/** Pravidelný ostatní příjem (důchod, výživné) */
export interface OstatniPrijemPravidelny {
  typ: string;
  castka: number;
  mesicne?: boolean;
}

/** Příjmy z výpisů: měsíční součty + volitelně zaměstnavatel a transakce */
export interface VypisyPrijmy {
  mesic1?: number;
  mesic2?: number;
  mesic3?: number;
  mesic4?: number;
  mesic5?: number;
  mesic6?: number;
  zamestnavatel?: string;
  zamestnavatelIc?: string;
  prumernaMzda?: number;
  employmentEntries?: VypisEntry[];
  otherRegularIncome?: OstatniPrijemPravidelny[];
  otherIncomeEntries?: VypisEntry[];
}

export interface ExtractedData {
  personIndex?: number;
  jmeno: string;
  prijmeni: string;
  rc: string;
  adresa: string;
  prijmy: number;
  vydaje: number;
  /** Datum narození (např. "15. 06. 1985") */
  datumNarozeni?: string;
  /** Místo narození */
  mistoNarozeni?: string;
  /** Pohlaví */
  pohlavi?: string;
  /** Národnost */
  narodnost?: string;
  /** Rodinný stav */
  rodinnyStav?: string;
  /** Číslo dokladu (OP) */
  cisloDokladu?: string;
  /** Datum vydání OP */
  datumVydani?: string;
  /** Platnost OP do */
  platnostDo?: string;
  /** Vydávající úřad */
  vydavajiciUrad?: string;
  /** Vytažené řádky z daňového přiznání (jen nenulové zobrazujeme) */
  dpData?: DpData;
  /** Měsíční příjmy z výpisů z BU */
  vypisyPrijmy?: VypisyPrijmy;
}

export interface UploadedFile {
  id?: string;
  name: string;
  type: 'op-predni' | 'op-zadni' | 'danove' | 'vypisy';
  url?: string;
  /** ID žadatele, ke kterému soubor patří (V2.9) */
  applicantId?: string;
}

/** Kompatibilní alias pro daňová data žadatele (legacy naming). */
export type TaxData = DpData;
/** Kompatibilní alias pro data z výpisů žadatele (legacy naming). */
export type BankStatementData = VypisyPrijmy;

/** Žadatel v rámci případu – hlavní nebo spolužadatel (V2.9) */
export interface Applicant {
  id: string;
  role: 'hlavni' | 'spoluzadatel';
  order: number; // 1–4
  extractedData?: ExtractedData;
  /** Legacy kompatibilita s dokumentací UPDATE_V2_TO_CURRENT.md */
  taxData?: TaxData;
  /** Legacy kompatibilita s dokumentací UPDATE_V2_TO_CURRENT.md */
  bankStatementData?: BankStatementData;
}

/** Stav obchodu v pipeline (pro tipaře a reporting). */
export type DealStatus =
  | "NEW"
  | "DATA_EXTRACTED"
  | "SENT_TO_BANK"
  | "APPROVED"
  | "SIGNED_BY_CLIENT"
  | "CLOSED"
  | "LOST";

export interface Case {
  id: string;
  jmeno: string;
  datum: string;
  status: CaseStatus;
  /** Stav obchodu (pipeline). */
  dealStatus?: DealStatus;
  vyseUveru?: number;
  ucel?: string;
  /** Jedna nebo více osob (klient, partner) – zpětná kompatibilita */
  extractedData?: ExtractedData[];
  /** Legacy kompatibilita */
  taxData?: TaxData;
  /** Legacy kompatibilita */
  bankStatementData?: BankStatementData;
  /** Pole žadatelů (V2.9) – hlavní + až 3 spolužadatelé */
  applicants?: Applicant[];
  /** ID aktuálně vybraného žadatele (V2.9) */
  activeApplicantId?: string;
  soubory: UploadedFile[];
  isActive: boolean;
  /** Lead (z intake) – IČ zadané v intake (hlavní i spolužadatel) pro fallback v „Základní údaje z DP“. */
  lead?: { id: string; ico?: string; coApplicantIco?: string };
  /** Běží právě extrakce dat (DP/OP/výpisy) – zobrazí se progress na kartě */
  extractionInProgress?: boolean;
}

export interface BankResult {
  banka: string;
  splatka: number;
  sazba: number;
}

export interface ShortcutMapping {
  key: string;
  field: string;
  description: string;
}
