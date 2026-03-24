/** Orientační marketingové sazby – sdílené pro TopBar / dashboard. */
export const MARKETING_BANK_RATES = [
  { bank: 'ČSOB', short: 'ČSOB', initials: 'ČO', value: '4.89%', circleClass: 'bg-sky-600 shadow-sky-500/30' },
  { bank: 'Česká spořitelna', short: 'ČS', initials: 'ČS', value: '4.95%', circleClass: 'bg-red-600 shadow-red-500/30' },
  { bank: 'Komerční banka', short: 'KB', initials: 'KB', value: '4.79%', circleClass: 'bg-gray-700 dark:bg-gray-600 shadow-gray-500/20' },
  { bank: 'Moneta', short: 'Moneta', initials: 'MO', value: '4.99%', circleClass: 'bg-violet-600 shadow-violet-500/30' },
  { bank: 'UniCredit', short: 'UCB', initials: 'UC', value: '4.99%', circleClass: 'bg-red-700 shadow-red-600/30' },
  { bank: 'Air Bank', short: 'Air', initials: 'AB', value: '4.69%', circleClass: 'bg-cyan-500 shadow-cyan-400/30' },
] as const;
