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
    extractedData: [{
      personIndex: 0,
      jmeno: 'Jan',
      prijmeni: 'Novák',
      rc: '850615/1234',
      adresa: 'Hlavní 123, 150 00 Praha 5',
      prijmy: 45000,
      vydaje: 18000
    }],
    soubory: [
      { name: 'OP_predni.jpg', type: 'op-predni' },
      { name: 'OP_zadni.jpg', type: 'op-zadni' },
      { name: 'danove_prizani_2025.pdf', type: 'danove' },
      { name: 'vypis_uctu_11_2025.pdf', type: 'vypisy' }
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
    extractedData: [{
      personIndex: 0,
      jmeno: 'Marie',
      prijmeni: 'Svobodová',
      rc: '755428/9876',
      adresa: 'Zahradní 45, 602 00 Brno',
      prijmy: 38000,
      vydaje: 15000
    }],
    soubory: [
      { name: 'OP_predni.jpg', type: 'op-predni' },
      { name: 'OP_zadni.jpg', type: 'op-zadni' },
      { name: 'vypis_uctu.pdf', type: 'vypisy' }
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
