import { Partner } from './types';

export const mockPartners: Partner[] = [
  {
    id: 'partner-1',
    nazev: 'RE/MAX Prague',
    typ: 'REALITKA',
    regCislo: '12345678',
    kontakt: {
      telefon: '+420 777 123 456',
      email: 'info@remaxprague.cz',
      osoba: 'Jana Nováková'
    },
    pocetLeadu: 24,
    datumVytvoreni: '2024-01-15T10:00:00.000Z',
    poznamka: 'Dlouholetý partner, kvalitní leady'
  },
  {
    id: 'partner-2',
    nazev: 'Development Group s.r.o.',
    typ: 'DEVELOPER',
    regCislo: '87654321',
    kontakt: {
      telefon: '+420 777 987 654',
      email: 'obchod@devgroup.cz',
      osoba: 'Petr Svoboda'
    },
    pocetLeadu: 18,
    datumVytvoreni: '2024-03-20T14:30:00.000Z',
    poznamka: 'Spolupráce na projektu Nová Čtvrt'
  },
  {
    id: 'partner-3',
    nazev: 'Martin Černý',
    typ: 'POJISTOVAK',
    kontakt: {
      telefon: '+420 603 123 789',
      email: 'martin.cerny@pojistovna.cz'
    },
    pocetLeadu: 12,
    datumVytvoreni: '2024-06-10T09:15:00.000Z'
  },
  {
    id: 'partner-4',
    nazev: 'Finanční Poradna ABC',
    typ: 'FINANCNI_PORADCE',
    regCislo: '45678912',
    kontakt: {
      telefon: '+420 724 555 666',
      email: 'info@poradna-abc.cz',
      osoba: 'Lucie Dvořáková'
    },
    pocetLeadu: 8,
    datumVytvoreni: '2024-08-05T11:00:00.000Z',
    poznamka: 'Nový partner, zatím testovací spolupráce'
  },
  {
    id: 'partner-5',
    nazev: 'City Reality',
    typ: 'REALITKA',
    regCislo: '78945612',
    kontakt: {
      telefon: '+420 777 222 333',
      email: 'kontakt@cityreality.cz',
      osoba: 'Tomáš Král'
    },
    pocetLeadu: 15,
    datumVytvoreni: '2024-02-28T16:45:00.000Z'
  }
];
