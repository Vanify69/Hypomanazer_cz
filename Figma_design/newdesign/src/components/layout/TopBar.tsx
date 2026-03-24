import { Case } from '../../lib/types';
import { mockBankRates } from '../../lib/mockDashboardData';

interface TopBarProps {
  activeCase: Case | null;
}

export function TopBar({ activeCase }: TopBarProps) {
  return (
    <div className="fixed top-0 right-0 left-64 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-14 flex items-center justify-end px-6 gap-4 z-40">
      {/* Aktuální sazby bank */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Aktuální sazby:</span>
        {mockBankRates.map((rate) => (
          <div
            key={rate.id}
            className="flex flex-col items-center justify-center min-w-[60px] p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-sm dark:hover:bg-gray-600 transition-shadow cursor-pointer"
            title={`${rate.nazevBanky} - ${rate.fixace}`}
          >
            <div className="text-xl mb-1">{rate.logoBanky}</div>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{rate.sazbaOd.toFixed(2)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}