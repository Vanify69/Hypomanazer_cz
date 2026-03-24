export type CaseStatus = 'novy' | 'data-vytazena' | 'doplneno';

// Rozšířené statusy pro případy podle business logiky
export type CaseBusinessStatus = 
  | 'NEW' // Rozpracované
  | 'DATA_EXTRACTED' // Rozpracované
  | 'SENT_TO_BANK' // Ve schvalování/procesu
  | 'APPROVED' // Ve schvalování/procesu
  | 'SIGNED_BY_CLIENT' // Ve schvalování/procesu
  | 'CLOSED' // Uzavřené - úspěšné
  | 'LOST'; // Uzavřené - neúspěšné

// Statusy leadů
export type LeadStatus = 
  | 'DRAFT' // Rozpracované
  | 'SENT' // Odeslané
  | 'OPENED' // Otevřené klientem
  | 'IN_PROGRESS' // Zpracovává se
  | 'SUBMITTED' // Podklady odevzdány
  | 'CONVERTED'; // Převedeno na případ

// Typy událostí
export type EventType = 
  | 'MEETING' // Schůzka
  | 'CALL' // Telefonát
  | 'TASK' // Úkol
  | 'REMINDER'; // Připomínka

// Typy tipařů
export type PartnerType = 
  | 'REALITKA' // Realitní kancelář
  | 'DEVELOPER' // Developer
  | 'POJISTOVAK' // Pojišťovací agent
  | 'FINANCNI_PORADCE' // Finanční poradce
  | 'JINÝ'; // Jiný

export interface ExtractedData {
  jmeno: string;
  prijmeni: string;
  rc: string;
  adresa: string;
  datumNarozeni: string;
  mistoNarozeni: string;
  // Dodatečná pole z OP
  cisloDokladu?: string;
  pohlavi?: string;
  narodnost?: string;
  datumVydani?: string;
  platnostDo?: string;
  rodinnyStav?: string;
  vydavajiciUrad?: string;
}

export interface TaxData {
  rok: number;
  hrubePrijmy: number;
  zdanitelnyPrijem: number;
  danZPrijmu: number;
  socialniPojisteni: number;
  zdravotniPojisteni: number;
  cistePrijmy: number;
  // Dodatečná metadata z DP
  ic?: string; // Identifikační číslo
  dic?: string; // Daňové identifikační číslo
  czNace?: string; // Převažující CZ-NACE (např. "66190 - Ostatní pomocné činnosti k finančním činnostem")
  zpusobUplatneniVydaju?: 'danovaEvidence' | 'ucetnictvi' | 'pausalniVydaje'; // Způsob uplatnění výdajů z Přílohy č. 1
  vydajovyPausal?: 40 | 60 | 80; // Výdajový paušál v % (pouze pokud zpusobUplatneniVydaju = 'pausalniVydaje')
  // Kompletní data z daňového přiznání
  kompletniData?: {
    // 1. ODDÍL - Údaje o poplatníkovi
    radek06?: string; // Příjmení
    radek07?: string; // Rodné příjmení
    radek08?: string; // Jméno(-a)
    radek09?: string; // Titul
    radek10?: string; // Státní příslušnost
    radek11?: string; // Číslo pasu
    radek12?: string; // Obec (adresa v den podání DAP)
    radek13?: string; // Ulice / část obce
    radek14?: string; // Číslo popisné/orientační
    radek15?: string; // PSČ
    radek16?: string; // Telefon / mobilní telefon
    radek17?: string; // E-mail
    radek18?: string; // Stát
    radek19?: string; // Obec (k poslednímu dni roku)
    radek20?: string; // Ulice (k poslednímu dni roku)
    radek21?: string; // Číslo popisné (k poslednímu dni roku)
    radek22?: string; // PSČ (k poslednímu dni roku)
    radek23?: string; // Obec (obvyklý pobyt na území ČR)
    radek24?: string; // Ulice (obvyklý pobyt na území ČR)
    radek25?: string; // Číslo popisné (obvyklý pobyt na území ČR)
    radek26?: string; // PSČ (obvyklý pobyt na území ČR)
    radek27?: string; // Telefon (obvyklý pobyt na území ČR)
    radek28?: string; // E-mail (obvyklý pobyt na území ČR)
    radek29?: string; // Kód státu – vyplní jen daňový nerezident
    radek29a?: number; // Výše celosvětových příjmů
    radek30?: boolean; // Transakce uskutečněné se zahraničními spojenými osobami (true = ano, false = ne)
    
    // 2. ODDÍL - Výpočet dílčího základu daně z příjmů fyzických osob ze závislé činnosti (§ 6 zákona)
    radek31?: number; // Úhrn příjmů od všech zaměstnavatelů
    radek32?: number; // (neobsazeno)
    radek33?: number; // Daň zaplacená v zahraničí podle § 6 odst. 13 zákona
    radek34?: number; // Dílčí základ daně podle § 6 zákona (ř. 31 – ř. 33)
    radek35?: number; // Úhrn příjmů plynoucí ze zahraničí podle § 6 zákona
    
    // 3. ODDÍL - Dílčí základy daně z příjmů fyzických osob podle § 6, § 7, § 8, § 9 a § 10 zákona
    radek36?: number; // Dílčí základ daně ze závislé činnosti podle § 6 zákona (ř. 34)
    radek37?: number; // Dílčí základ daně nebo ztráta ze samostatné činnosti podle § 7 zákona (ř. 113 přílohy č. 1 DAP)
    radek38?: number; // Dílčí základ daně z kapitálového majetku podle § 8 zákona
    radek39?: number; // Dílčí základ daně nebo ztráta z nájmu podle § 9 zákona (ř. 206 přílohy č. 2 DAP)
    radek40?: number; // Dílčí základ daně z ostatních příjmů podle § 10 zákona (ř. 209 přílohy č. 2 DAP)
    radek41?: number; // Úhrn řádků (ř. 37 + ř. 38 + ř. 39 + ř. 40)
    radek42?: number; // Základ daně (36 + kladná hodnota z ř. 41)
    radek43?: number; // (neobsazeno)
    radek44?: number; // Uplatňovaná výše pravomocně stanovené ztráty (maximálně do výše ř. 41)
    radek45?: number; // Základ daně po odečtení ztráty (ř. 42 – ř. 44)
    
    // 4. ODDÍL - Nezdanitelné části základu daně, odčitatelné položky a daň celkem
    radek46?: number; // § 15 odst. 1 zákona (hodnota bezúplatného plnění – daru/darů)
    radek47?: number; // § 15 odst. 3 a 4 zákona (odečet úroků)
    radek48?: number; // § 15a odst. 1 písm. a), b) a c) zákona (penzijní připojištění, doplňkové penzijní spoření a penzijní pojištění)
    radek49?: number; // § 15a odst. 1 písm. d) zákona (soukromé životní pojištění)
    radek50?: number; // § 15a odst. 1 písm. e) zákona (dlouhodobý investiční produkt)
    radek51?: number; // § 15c zákona (pojištění dlouhodobé péče)
    radek52?: number; // § 34 odst. 4 zákona (výzkum a vývoj)
    radek53?: number; // § 34 odst. 4 (odpočet na podporu odborného vzdělávání)
    radek54?: number; // Úhrn nezdanitelných částí základu daně a položek odčitatelných od základu daně (ř. 46 + ř. 47 + ř. 48 + ř. 49 + ř. 50 + ř. 51 + ř. 52 + ř. 53)
    radek55?: number; // Základ daně snížený o nezdanitelné části základu daně a položky odčitatelné od základu daně (ř. 45 – ř. 54)
    radek56?: number; // Základ daně zaokrouhlený na celá sta Kč dolů
    radek57?: number; // Daň podle § 16 zákona
    
    // 5. ODDÍL - Daň celkem, ztráta
    radek58?: number; // Daň podle § 16 zákona (ř. 57) nebo částka ř. 339 přílohy č. 3 DAP
    radek59?: number; // (neobsazeno)
    radek60?: number; // Daň zaokrouhlená na celé Kč nahoru
    radek61?: number; // Daňová ztráta
    
    // 6. ODDÍL - Slevy na dani a daňové zvýhodnění
    radek62?: number; // § 35ba odst. 1 písm. a) zákona (základní sleva na poplatníka - měsíční)
    radek62a?: number; // Sleva – zastavená exekuce
    radek63?: number; // § 35ba odst. 1 písm. a) zákona (základní sleva na poplatníka - roční)
    radek64?: number; // § 35ba odst. 1 písm. a) zákona (základní sleva na poplatníka - celkem)
    radek65a?: number; // § 35ba odst. 1 písm. b) zákona (sleva na manželku/manžela)
    radek65b?: number; // § 35ba odst. 1 písm. b) zákona (sleva na manželku/manžela ZTP/P)
    radek66?: number; // § 35ba odst. 1 písm. c) zákona (sleva na invaliditu 1-2 stupně)
    radek67?: number; // § 35ba odst. 1 písm. d) zákona (sleva na invaliditu 3. stupně)
    radek68?: number; // § 35ba odst. 1 písm. e) zákona (sleva na držitele ZTP/P)
    radek69?: number; // § 35ba odst. 1 písm. f) zákona (sleva na studenta)
    radek69a?: number; // § 35bb zákona (sleva na umístění dítěte)
    radek69b?: number; // § 35bc zákona (sleva na evidenci tržeb)
    radek70?: number; // Úhrn slev na dani (ř. 64 + ř. 65a + ř. 65b + ř. 66 + ř. 67 + ř. 68 + ř. 69 + ř. 69a + ř. 69b)
    radek71?: number; // Daň po uplatnění slev (ř. 60 – ř. 70)
    radek72?: number; // Daňové zvýhodnění na dítě
    radek73?: number; // Sleva na dani podle § 35c zákona
    radek74?: number; // Daň po uplatnění slevy podle § 35c (ř. 71 – ř. 73)
    radek74a?: number; // Daň podle §16a
    radek75?: number; // Daň celkem (ř. 74 – ř. 72) - pokud je výsledek záporný, uvedete 0
    radek76?: number; // Daňový bonus (pokud je rozdíl ř. 74 – ř. 72 záporný)
    radek77?: number; // Daň celkem po úpravě o daňový bonus
    radek77a?: number; // Daňový bonus po odpočtu daně
    
    // 6. ODDÍL - Dodatečné DAP
    radek78?: number; // Poslední známá daň
    radek79?: number; // Zjištěná daň
    radek80?: number; // Rozdíl
    radek81?: number; // Poslední známá daňová ztráta
    radek82?: number; // Zjištěná ztráta
    radek83?: number; // Rozdíl ztrát
    
    // 7. ODDÍL - Placení daně
    radek84?: number; // Sražené zálohy
    radek85?: number; // Zaplacené zálohy
    radek86?: number; // Zálohy – paušální režim
    radek87?: number; // Sražená daň §36/6
    radek87a?: number; // Sražená daň §36/7
    radek88?: number; // Zajištěná daň
    radek89?: number; // Vyplacené bonusy
    radek90?: number; // Zaplacená daňová povinnost
    radek91?: number; // Zbývá doplatit
    radek92?: number; // Přeplatek
    
    // Příloha č. 1 - Přehled příjmů a výdajů podle § 7 zákona
    radek101?: number; // Příjmy podle § 7
    radek102?: number; // Výdaje podle § 7
    radek103?: number; // Daňová ztráta podle § 7
    radek104?: number; // Rozdíl mezi příjmy a výdaji (§ 7)
    radek105?: number; // Úpravy zvyšující
    radek106?: number; // Úpravy snižující
    radek107?: number; // Rozdělené příjmy
    radek108?: number; // Rozdělené výdaje
    radek109?: number; // Příjmy jako spolupracující osoba
    radek110?: number; // Výdaje jako spolupracující osoba
    radek111?: number; // (neobsazeno)
    radek112?: number; // Podíl společníka
    radek113?: number; // Dílčí základ daně ze samostatné činnosti nebo ztráta
  };
}

export interface BankStatementData {
  obdobi: string; // Období výpisů (např. "01/2025 - 06/2025")
  zamestnavatel?: string; // Název zaměstnavatele (např. "ABC s.r.o.")
  zamestnavatelIco?: string; // IČ zaměstnavatele (např. "12345678")
  prumernaMzda?: number; // Průměrná měsíční mzda (např. 44 833 Kč)
  prijmyZeZamestnani: {
    datum: string; // Datum přijetí (např. "2025-06-15")
    castka: number; // Částka mzdy
    popis: string; // Popis (např. "Mzda - ABC s.r.o.")
  }[];
  pravidelneOstatniPrijmy?: {
    typ: string; // Typ příjmu (např. "Invalidní důchod", "Výživné", "Výsluha")
    castka: number; // Pravidelná částka
    pravidelnost: 'mesicne' | 'nepravidelne'; // Zda je pravidelná nebo ne
  }[];
  ostatniPrijmy?: {
    datum: string; // Datum přijetí
    castka: number; // Částka
    popis: string; // Popis (např. "Invalidní důchod", "Výživné")
  }[];
}

export interface UploadedFile {
  name: string;
  type: 'op-predni' | 'op-zadni' | 'danove' | 'vypisy';
  url?: string;
  applicantId?: string; // ID žadatele, ke kterému soubor patří
}

export interface Applicant {
  id: string;
  role: 'hlavni' | 'spoluzadatel';
  order: number; // 1-4
  extractedData?: ExtractedData;
  taxData?: TaxData;
  bankStatementData?: BankStatementData;
}

export interface Case {
  id: string;
  jmeno: string;
  datum: string;
  status: CaseStatus;
  businessStatus?: CaseBusinessStatus; // Nový business status
  vyseUveru?: number;
  ucel?: string;
  extractedData?: ExtractedData; // Zpětná kompatibilita
  taxData?: TaxData; // Zpětná kompatibilita
  bankStatementData?: BankStatementData; // Zpětná kompatibilita
  applicants?: Applicant[]; // Nový formát - pole žadatelů
  soubory: UploadedFile[];
  isActive: boolean;
  activeApplicantId?: string; // ID aktuálně vybraného žadatele
}

// Lead - potenciální klient
export interface Lead {
  id: string;
  jmeno: string;
  prijmeni: string;
  telefon: string;
  email: string;
  status: LeadStatus;
  zdroj: string; // Zdroj leadu (např. "Web", "Doporučení", "Reklama")
  datumVytvoreni: string;
  datumOdevzdaniPodkladu?: string;
  poznamka?: string;
  naviazanyPripad?: string; // ID případu, pokud byl převeden
}

// Událost (schůzka, telefonát, úkol, připomínka)
export interface Event {
  id: string;
  typ: EventType;
  nazev: string;
  popis?: string;
  datum: string;
  cas: string;
  konec?: string; // Čas konce události
  misto?: string; // Místo schůzky
  celoDenni?: boolean; // Zda je událost celodenní
  klientId?: string; // ID leadu nebo případu
  klientJmeno?: string;
  klientTyp?: 'lead' | 'pripad';
  splneno: boolean;
}

// Tipař (partner, který přivádí leady)
export interface Partner {
  id: string;
  nazev: string; // Název firmy nebo jméno osoby
  typ: PartnerType;
  regCislo?: string; // IČ nebo registrační číslo
  kontakt: {
    telefon?: string;
    email?: string;
    osoba?: string; // Kontaktní osoba
  };
  pocetLeadu: number; // Počet přivedených leadů
  datumVytvoreni: string;
  poznamka?: string;
}

// Bankovní sazba
export interface BankRate {
  id: string;
  nazevBanky: string;
  logoBanky: string;
  sazbaOd: number;
  fixace: string;
  aktualizovano: string;
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