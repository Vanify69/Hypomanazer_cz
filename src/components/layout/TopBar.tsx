export function TopBar() {
  const rates = [
    { bank: 'ČSOB', value: '4.89%' },
    { bank: 'Česká spořitelna', value: '4.95%' },
    { bank: 'KB', value: '4.79%' },
    { bank: 'Moneta', value: '5.0%' },
    { bank: 'UniCredit', value: '4.99%' },
    { bank: 'Air Bank', value: '4.69%' },
  ];

  return (
    <div className="hidden lg:flex items-center justify-end gap-4 px-6 py-2 border-b border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <span className="text-xs text-gray-500 dark:text-gray-400">Aktuální sazby:</span>
      {rates.map((rate) => (
        <div key={rate.bank} className="text-right">
          <div className="text-[11px] text-gray-400 dark:text-gray-500">{rate.bank}</div>
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">{rate.value}</div>
        </div>
      ))}
    </div>
  );
}

