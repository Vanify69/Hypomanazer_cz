import { Lead, Event, BankRate } from './types';

// Mock data pro leady
export const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    jmeno: 'Jan',
    prijmeni: 'Novák',
    telefon: '+420 777 123 456',
    email: 'jan.novak@email.cz',
    status: 'IN_PROGRESS',
    zdroj: 'Web',
    datumVytvoreni: '2026-03-21T09:15:00',
    poznamka: 'Zájem o hypotéku na byt 3+1'
  },
  {
    id: 'lead-2',
    jmeno: 'Marie',
    prijmeni: 'Svobodová',
    telefon: '+420 603 456 789',
    email: 'marie.svobodova@email.cz',
    status: 'SUBMITTED',
    zdroj: 'Doporučení',
    datumVytvoreni: '2026-03-20T14:30:00',
    datumOdevzdaniPodkladu: '2026-03-22T10:00:00',
    poznamka: 'Refinancování stávající hypotéky'
  },
  {
    id: 'lead-3',
    jmeno: 'Petr',
    prijmeni: 'Dvořák',
    telefon: '+420 724 987 654',
    email: 'petr.dvorak@email.cz',
    status: 'IN_PROGRESS',
    zdroj: 'Reklama - Facebook',
    datumVytvoreni: '2026-03-22T11:00:00',
    poznamka: 'První hypotéka, zájem o kompletní poradenství'
  },
  {
    id: 'lead-4',
    jmeno: 'Jana',
    prijmeni: 'Procházková',
    telefon: '+420 605 111 222',
    email: 'jana.prochazková@email.cz',
    status: 'SENT',
    zdroj: 'Web',
    datumVytvoreni: '2026-03-19T16:45:00',
    poznamka: 'Hypotéka na výstavbu RD'
  },
  {
    id: 'lead-5',
    jmeno: 'Tomáš',
    prijmeni: 'Černý',
    telefon: '+420 777 333 444',
    email: 'tomas.cerny@email.cz',
    status: 'SUBMITTED',
    zdroj: 'Doporučení',
    datumVytvoreni: '2026-03-18T10:20:00',
    datumOdevzdaniPodkladu: '2026-03-21T15:30:00',
    poznamka: 'Druhá hypotéka na investiční nemovitost'
  },
  {
    id: 'lead-6',
    jmeno: 'Lucie',
    prijmeni: 'Veselá',
    telefon: '+420 608 555 666',
    email: 'lucie.vesela@email.cz',
    status: 'OPENED',
    zdroj: 'Web',
    datumVytvoreni: '2026-03-23T08:00:00',
    poznamka: 'Refinancování + navýšení'
  }
];

// Mock data pro události
export const mockEvents: Event[] = [
  {
    id: 'event-1',
    typ: 'MEETING',
    nazev: 'Schůzka s Janem Novákem',
    popis: 'Konzultace k hypotéce na byt 3+1',
    datum: '2026-03-23',
    cas: '14:00',
    klientId: 'lead-1',
    klientJmeno: 'Jan Novák',
    klientTyp: 'lead',
    splneno: false
  },
  {
    id: 'event-2',
    typ: 'CALL',
    nazev: 'Telefonát - Marie Svobodová',
    popis: 'Projednání podmínek refinancování',
    datum: '2026-03-23',
    cas: '10:30',
    klientId: 'lead-2',
    klientJmeno: 'Marie Svobodová',
    klientTyp: 'lead',
    splneno: false
  },
  {
    id: 'event-3',
    typ: 'TASK',
    nazev: 'Příprava nabídky - Petr Dvořák',
    popis: 'Sestavit cenovou nabídku od 3 bank',
    datum: '2026-03-23',
    cas: '16:00',
    klientId: 'lead-3',
    klientJmeno: 'Petr Dvořák',
    klientTyp: 'lead',
    splneno: false
  },
  {
    id: 'event-4',
    typ: 'REMINDER',
    nazev: 'Follow-up - Jana Procházková',
    popis: 'Ověřit, zda obdržela dokumenty',
    datum: '2026-03-24',
    cas: '09:00',
    klientId: 'lead-4',
    klientJmeno: 'Jana Procházková',
    klientTyp: 'lead',
    splneno: false
  },
  {
    id: 'event-5',
    typ: 'MEETING',
    nazev: 'Schůzka - kontrola podkladů',
    popis: 'Zkontrolovat dokumenty od Tomáše Černého',
    datum: '2026-03-24',
    cas: '11:00',
    klientId: 'lead-5',
    klientJmeno: 'Tomáš Černý',
    klientTyp: 'lead',
    splneno: false
  },
  {
    id: 'event-6',
    typ: 'CALL',
    nazev: 'Úvodní telefonát',
    popis: 'Představení služeb a zjištění požadavků',
    datum: '2026-03-24',
    cas: '15:00',
    klientId: 'lead-6',
    klientJmeno: 'Lucie Veselá',
    klientTyp: 'lead',
    splneno: false
  },
  {
    id: 'event-7',
    typ: 'TASK',
    nazev: 'Odevzdání návrhu do banky',
    popis: 'Odeslat kompletní dokumentaci do ČSOB',
    datum: '2026-03-25',
    cas: '10:00',
    splneno: false
  },
  {
    id: 'event-8',
    typ: 'MEETING',
    nazev: 'Podpis smlouvy',
    popis: 'Sraz na pobočce KB',
    datum: '2026-03-26',
    cas: '13:30',
    splneno: false
  }
];

// Mock data pro bankovní sazby
export const mockBankRates: BankRate[] = [
  {
    id: 'rate-1',
    nazevBanky: 'Česká spořitelna',
    logoBanky: '🏦',
    sazbaOd: 4.89,
    fixace: 'Fixace 3 roky, orientačně',
    aktualizovano: '20.03.2026'
  },
  {
    id: 'rate-2',
    nazevBanky: 'Komerční banka',
    logoBanky: '🏦',
    sazbaOd: 4.95,
    fixace: 'Fixace 5 let, orientačně',
    aktualizovano: '20.03.2026'
  },
  {
    id: 'rate-3',
    nazevBanky: 'ČSOB',
    logoBanky: '🏦',
    sazbaOd: 4.79,
    fixace: 'Fixace 3 roky, orientačně',
    aktualizovano: '21.03.2026'
  },
  {
    id: 'rate-4',
    nazevBanky: 'Raiffeisenbank',
    logoBanky: '🏦',
    sazbaOd: 5.09,
    fixace: 'Fixace 5 let, orientačně',
    aktualizovano: '19.03.2026'
  },
  {
    id: 'rate-5',
    nazevBanky: 'UniCredit Bank',
    logoBanky: '🏦',
    sazbaOd: 4.99,
    fixace: 'Fixace 3 roky, orientačně',
    aktualizovano: '20.03.2026'
  },
  {
    id: 'rate-6',
    nazevBanky: 'mBank',
    logoBanky: '🏦',
    sazbaOd: 4.69,
    fixace: 'Fixace 5 let, orientačně',
    aktualizovano: '22.03.2026'
  }
];
