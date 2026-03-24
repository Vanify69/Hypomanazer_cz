export type StavPripadu = "novy" | "data-vytazena" | "doplneno";

export interface Soubor {
  id: string;
  nazev: string;
  typ: "op-predni" | "op-zadni" | "danova" | "vypisy";
  cesta: string;
  zadatelId?: string; // ID žadatele, ke kterému soubor patří
}

export interface VytazenaData {
  jmeno: string;
  prijmeni: string;
  rodneCislo: string;
  ulice: string;
  mesto: string;
  psc: string;
  datumNarozeni: string;
  cisloOP: string;
  prijmy?: number;
  vydaje?: number;
}

export interface Zadatel {
  id: string;
  role: "hlavni" | "spoluzadatel"; // Hlavní žadatel nebo spolužadatel
  poradi: number; // 1-4
  data: VytazenaData;
}

export interface Pripad {
  id: string;
  jmeno: string;
  datumVytvoreni: string;
  stav: StavPripadu;
  vyseUveru?: number;
  ucel?: string;
  soubory: Soubor[];
  vytazenaData?: VytazenaData; // Zpětná kompatibilita - pro staré případy
  zadatele?: Zadatel[]; // Nový formát - pole žadatelů
  aktivni: boolean;
  aktivniZadatelId?: string; // ID aktuálně vybraného žadatele pro zkratky
}

export interface Zkratka {
  klavesa: string;
  pole: string;
  popis: string;
}