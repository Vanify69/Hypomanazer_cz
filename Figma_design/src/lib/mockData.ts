import { Case, ShortcutMapping } from './types';

export const mockCases: Case[] = [
  {
    id: '1',
    jmeno: 'Jan Novák',
    datum: '2026-02-10',
    status: 'doplneno',
    vyseUveru: 3500000,
    ucel: 'Koupě bytu 3+kk, Praha 5',
    isActive: true,
    extractedData: {
      jmeno: 'Jan',
      prijmeni: 'Novák',
      rc: '850615/1234',
      adresa: 'Hlavní 123, 150 00 Praha 5',
      datumNarozeni: '15. 06. 1985',
      mistoNarozeni: 'Praha',
      cisloDokladu: '123456789',
      pohlavi: 'M',
      narodnost: 'Česká republika',
      datumVydani: '10. 01. 2020',
      platnostDo: '10. 01. 2030',
      rodinnyStav: 'ženatý',
      vydavajiciUrad: 'Magistrát města Prahy'
    },
    taxData: {
      rok: 2025,
      hrubePrijmy: 540000,
      zdanitelnyPrijem: 540000,
      danZPrijmu: 81000,
      socialniPojisteni: 37800,
      zdravotniPojisteni: 24300,
      cistePrijmy: 396900,
      ic: '12345678',
      dic: 'CZ8506151234',
      czNace: '62010 - Programování',
      zpusobUplatneniVydaju: 'pausalniVydaje',
      vydajovyPausal: 60,
      kompletniData: {
        // 1. ODDÍL - Údaje o poplatníkovi
        radek06: 'Novák',
        radek07: '',
        radek08: 'Jan',
        radek09: '',
        radek10: 'ČR',
        radek11: '',
        radek12: 'Praha 5',
        radek13: 'Hlavní',
        radek14: '123',
        radek15: '15000',
        radek16: '',
        radek17: '',
        radek18: 'ČR',
        radek30: false, // Transakce se zahraničními spojenými osobami: NE
        
        // 2. ODDÍL - Výpočet dílčího základu daně z příjmů fyzických osob ze závislé činnosti (§ 6 zákona)
        radek31: 0, // Úhrn příjmů od všech zaměstnavatelů
        radek33: 0, // Daň zaplacená v zahraničí podle § 6 odst. 13 zákona
        radek34: 0, // Dílčí základ daně podle § 6 zákona (ř. 31 – ř. 33)
        radek35: 0, // Úhrn příjmů plynoucí ze zahraničí podle § 6 zákona
        
        // 3. ODDÍL - Dílčí základy daně z příjmů fyzických osob podle § 6, § 7, § 8, § 9 a § 10 zákona
        radek36: 0, // Dílčí základ daně ze závislé činnosti podle § 6 zákona (ř. 34)
        radek37: 685315, // Dílčí základ daně nebo ztráta ze samostatné činnosti podle § 7 zákona (ř. 113 přílohy č. 1 DAP)
        radek38: 0, // Dílčí základ daně z kapitálového majetku podle § 8 zákona
        radek39: 0, // Dílčí základ daně nebo ztráta z nájmu podle § 9 zákona (ř. 206 přílohy č. 2 DAP)
        radek40: 0, // Dílčí základ daně z ostatních příjmů podle § 10 zákona (ř. 209 přílohy č. 2 DAP)
        radek41: 685315, // Úhrn řádků (ř. 37 + ř. 38 + ř. 39 + ř. 40)
        radek42: 685315, // Základ daně (36 + kladná hodnota z ř. 41)
        radek44: 0, // Uplatňovaná výše pravomocně stanovené ztráty (maximálně do výše ř. 41)
        radek45: 685315, // Základ daně po odečtení ztráty (ř. 42 – ř. 44)
        
        // 4. ODDÍL - Nezdanitelné části základu daně, odčitatelné položky a daň celkem
        radek46: 0, // § 15 odst. 1 zákona (hodnota bezúplatného plnění – daru/darů)
        radek47: 0, // § 15 odst. 3 a 4 zákona (odečet úroků)
        radek48: 0, // § 15a odst. 1 písm. a), b) a c) zákona (penzijní připojištění, doplňkové penzijní spoření a penzijní pojištění)
        radek49: 0, // § 15a odst. 1 písm. d) zákona (soukromé životní pojištění)
        radek50: 0, // § 15a odst. 1 písm. e) zákona (dlouhodobý investiční produkt)
        radek51: 0, // § 15c zákona (pojištění dlouhodobé péče)
        radek52: 0, // § 34 odst. 4 zákona (výzkum a vývoj)
        radek53: 0, // § 34 odst. 4 (odpočet na podporu odborného vzdělávání)
        radek54: 0, // Úhrn nezdanitelných částí základu daně a položek odčitatelných od základu daně
        radek55: 685315, // Základ daně snížený o nezdanitelné části základu daně a položky odčitatelné od základu daně (ř. 45 – ř. 54)
        radek56: 685300, // Základ daně zaokrouhlený na celá sta Kč dolů
        radek57: 102795, // Daň podle § 16 zákona
        
        // 5. ODDÍL - Daň celkem, ztráta
        radek58: 102795, // Daň podle § 16 zákona (ř. 57) nebo částka ř. 339 přílohy č. 3 DAP
        radek60: 102795, // Daň zaokrouhlená na celé Kč nahoru
        radek61: 0, // Daňová ztráta
        
        // 6. ODDÍL - Slevy na dani a daňové zvýhodnění
        radek64: 30840, // § 35ba odst. 1 písm. a) zákona (základní sleva na poplatníka - celkem)
        radek65a: 0, // § 35ba odst. 1 písm. b) zákona (sleva na manželku/manžela)
        radek65b: 0, // § 35ba odst. 1 písm. b) zákona (sleva na manželku/manžela ZTP/P)
        radek66: 0, // § 35ba odst. 1 písm. c) zákona (sleva na invaliditu 1-2 stupně)
        radek67: 0, // § 35ba odst. 1 písm. d) zákona (sleva na invaliditu 3. stupně)
        radek68: 0, // § 35ba odst. 1 písm. e) zákona (sleva na držitele ZTP/P)
        radek69: 0, // § 35ba odst. 1 písm. f) zákona (sleva na studenta)
        radek69a: 0, // § 35bb zákona (sleva na umístění dítěte)
        radek69b: 0, // § 35bc zákona (sleva na evidenci tržeb)
        radek70: 30840, // Úhrn slev na dani
        radek71: 71955, // Daň po uplatnění slev (ř. 60 – ř. 70)
        radek72: 0, // Daňové zvýhodnění na dítě
        radek73: 0, // Sleva na dani podle § 35c zákona
        radek74: 71955, // Daň po uplatnění slevy podle § 35c (ř. 71 – ř. 73)
        radek75: 71955, // Daň celkem (ř. 74 – ř. 72)
        radek76: 0, // Daňový bonus (pokud je rozdíl ř. 74 – ř. 72 záporný)
        radek77: 71955, // Daň celkem po úpravě o daňový bonus
        radek77a: 0, // Daňový bonus po odpočtu daně
        
        // Příloha č. 1 - Přehled příjmů a výdajů podle § 7 zákona
        radek101: 758538, // Příjmy podle § 7
        radek102: 455123, // Výdaje podle § 7
        radek103: 0, // Daňová ztráta podle § 7
        radek104: 303415, // Rozdíl mezi příjmy a výdaji (§ 7)
        radek106: 0, // Úhrn částek snižujících rozdíl mezi příjmy a výdaji
        radek107: 0, // Část příjmů rozdělená na spolupracující osobu
        radek108: 0, // Část výdajů rozdělená na spolupracující osobu
        radek109: 0, // Část příjmů jako spolupracující osoba
        radek110: 0, // Část výdajů jako spolupracující osoba
        radek113: 685315, // Dílčí základ daně ze samostatné činnosti nebo ztráta
        
        // Vyúčtování daně
        radek91: 71955, // Zbývá doplatit
        radek92: 0, // Přeplatek
      }
    },
    bankStatementData: {
      obdobi: '01/2025 - 06/2025',
      zamestnavatel: 'TechSoft s.r.o.',
      zamestnavatelIco: '12345678',
      prumernaMzda: 44833,
      prijmyZeZamestnani: [
        { datum: '2025-01-15', castka: 45000, popis: 'Mzda - TechSoft s.r.o.' },
        { datum: '2025-02-15', castka: 43800, popis: 'Mzda - TechSoft s.r.o.' },
        { datum: '2025-03-15', castka: 45200, popis: 'Mzda - TechSoft s.r.o.' },
        { datum: '2025-04-15', castka: 44500, popis: 'Mzda - TechSoft s.r.o.' },
        { datum: '2025-05-15', castka: 46000, popis: 'Mzda - TechSoft s.r.o.' },
        { datum: '2025-06-15', castka: 44500, popis: 'Mzda - TechSoft s.r.o.' },
      ],
      pravidelneOstatniPrijmy: [
        { typ: 'Invalidní důchod', castka: 8500, pravidelnost: 'mesicne' }
      ],
      ostatniPrijmy: [
        { datum: '2025-01-05', castka: 8500, popis: 'Invalidní důchod' },
        { datum: '2025-02-05', castka: 8500, popis: 'Invalidní důchod' },
        { datum: '2025-03-05', castka: 8500, popis: 'Invalidní důchod' },
        { datum: '2025-04-05', castka: 8500, popis: 'Invalidní důchod' },
        { datum: '2025-05-05', castka: 8500, popis: 'Invalidní důchod' },
        { datum: '2025-06-05', castka: 8500, popis: 'Invalidní důchod' },
      ]
    },
    soubory: [
      { name: 'OP_predni.jpg', type: 'op-predni', url: 'https://images.unsplash.com/photo-1620887110499-d54ecf17cefb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2lhbCUyMElEJTIwY2FyZCUyMGRvY3VtZW50fGVufDF8fHx8MTc3MTc4MTQwMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { name: 'OP_zadni.jpg', type: 'op-zadni', url: 'https://images.unsplash.com/photo-1620887110499-d54ecf17cefb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2lhbCUyMElEJTIwY2FyZCUyMGRvY3VtZW50fGVufDF8fHx8MTc3MTc4MTQwMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { name: 'danove_prizani_2025.pdf', type: 'danove', url: '#mock-pdf' },
      { name: 'vypis_uctu_11_2025.pdf', type: 'vypisy', url: '#mock-pdf' }
    ]
  },
  {
    id: '2',
    jmeno: 'Marie Svobodová',
    datum: '2026-02-11',
    status: 'data-vytazena',
    vyseUveru: 2800000,
    ucel: 'Rekonstrukce rodinného domu',
    isActive: false,
    activeApplicantId: 'a1',
    applicants: [
      {
        id: 'a1',
        role: 'hlavni',
        order: 1,
        extractedData: {
          jmeno: 'Marie',
          prijmeni: 'Svobodová',
          rc: '755428/9876',
          adresa: 'Zahradní 45, 602 00 Brno',
          datumNarozeni: '28. 04. 1975',
          mistoNarozeni: 'Brno'
        },
        bankStatementData: {
          obdobi: '08/2025 - 01/2026',
          zamestnavatel: 'FinServ a.s.',
          zamestnavatelIco: '87654321',
          prumernaMzda: 37750,
          prijmyZeZamestnani: [
            { datum: '2025-08-15', castka: 38000, popis: 'Mzda - FinServ a.s.' },
            { datum: '2025-09-15', castka: 36500, popis: 'Mzda - FinServ a.s.' },
            { datum: '2025-10-15', castka: 38000, popis: 'Mzda - FinServ a.s.' },
            { datum: '2025-11-15', castka: 38200, popis: 'Mzda - FinServ a.s.' },
            { datum: '2025-12-15', castka: 37800, popis: 'Mzda - FinServ a.s.' },
            { datum: '2026-01-15', castka: 38000, popis: 'Mzda - FinServ a.s.' },
          ],
          pravidelneOstatniPrijmy: [
            { typ: 'Výživné', castka: 5000, pravidelnost: 'nepravidelne' }
          ],
          ostatniPrijmy: [
            { datum: '2025-08-10', castka: 5000, popis: 'Výživné' },
            { datum: '2025-10-12', castka: 5000, popis: 'Výživné' },
            { datum: '2025-11-08', castka: 5000, popis: 'Výživné' },
            { datum: '2026-01-10', castka: 5000, popis: 'Výživné' },
          ]
        }
      },
      {
        id: 'a2',
        role: 'spoluzadatel',
        order: 2,
        extractedData: {
          jmeno: 'Pavel',
          prijmeni: 'Svoboda',
          rc: '801215/3456',
          adresa: 'Zahradní 45, 602 00 Brno',
          datumNarozeni: '15. 12. 1980',
          mistoNarozeni: 'Ostrava'
        },
        taxData: {
          rok: 2025,
          hrubePrijmy: 480000,
          zdanitelnyPrijem: 480000,
          danZPrijmu: 72000,
          socialniPojisteni: 33600,
          zdravotniPojisteni: 21600,
          cistePrijmy: 352800,
          dic: 'CZ8012153456',
          czNace: '66190 - Ostatní pomocné činnosti k finančním činnostem, kromě pojišťování a penzijního financování',
          zpusobUplatneniVydaju: 'danovaEvidence'
        }
      },
      {
        id: 'a3',
        role: 'spoluzadatel',
        order: 3,
        extractedData: {
          jmeno: 'Jana',
          prijmeni: 'Nová',
          rc: '925628/7812',
          adresa: 'Lipová 12, 602 00 Brno',
          datumNarozeni: '28. 06. 1992',
          mistoNarozeni: 'Brno'
        }
      }
    ],
    soubory: [
      { name: 'OP_MS_predni.jpg', type: 'op-predni', applicantId: 'a1' },
      { name: 'OP_MS_zadni.jpg', type: 'op-zadni', applicantId: 'a1' },
      { name: 'vypis_uctu_MS.pdf', type: 'vypisy', applicantId: 'a1' },
      { name: 'OP_PS_predni.jpg', type: 'op-predni', applicantId: 'a2' },
      { name: 'OP_PS_zadni.jpg', type: 'op-zadni', applicantId: 'a2' },
      { name: 'danove_PS_2025.pdf', type: 'danove', applicantId: 'a2' },
      { name: 'OP_JN_predni.jpg', type: 'op-predni', applicantId: 'a3' },
      { name: 'OP_JN_zadni.jpg', type: 'op-zadni', applicantId: 'a3' }
    ]
  },
  {
    id: '3',
    jmeno: 'Petr Dvořák',
    datum: '2026-02-13',
    status: 'novy',
    isActive: false,
    soubory: []
  }
];

export const shortcuts: ShortcutMapping[] = [
  { key: 'Ctrl+Shift+1', field: 'Jméno', description: 'Vloží jméno klienta' },
  { key: 'Ctrl+Shift+2', field: 'Příjmení', description: 'Vloží příjmení klienta' },
  { key: 'Ctrl+Shift+3', field: 'Rodné číslo', description: 'Vloží rodné číslo' },
  { key: 'Ctrl+Shift+4', field: 'Adresa', description: 'Vloží adresu trvalého bydliště' },
  { key: 'Ctrl+Shift+5', field: 'Příjmy', description: 'Vloží měsíční příjmy' },
  { key: 'Ctrl+Shift+6', field: 'Výdaje', description: 'Vloží měsíční výdaje' },
  { key: 'Ctrl+Shift+7', field: 'Výše úvěru', description: 'Vloží požadovanou výši úvěru' },
  { key: 'Ctrl+Shift+8', field: 'Účel', description: 'Vloží účel úvěru' },
  { key: 'Ctrl+Shift+A', field: 'Aktivní případ', description: 'Přepne aktivní případ' },
];