export type StavPripadu = "novy" | "data-vytazena" | "doplneno";

export interface Soubor {
  id: string;
  nazev: string;
  typ: "op-predni" | "op-zadni" | "danova" | "vypisy";
  cesta: string;
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
  prijmy: number;
  vydaje: number;
}

export interface Pripad {
  id: string;
  jmeno: string;
  datumVytvoreni: string;
  stav: StavPripadu;
  vyseUveru?: number;
  ucel?: string;
  soubory: Soubor[];
  vytazenaData?: VytazenaData;
  aktivni: boolean;
}

export interface Zkratka {
  klavesa: string;
  pole: string;
  popis: string;
}
