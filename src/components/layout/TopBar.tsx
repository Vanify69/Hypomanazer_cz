import { MARKETING_BANK_RATES } from './bankRates';

/**
 * Sazby v horní liště – vždy viditelné (včetně mobilu), horizontální scroll.
 * Pozadí řeší rodič (.app-layout-sticky-topbar), ne Tailwind bg-white (kvůli dark-mode.css).
 */
export function TopBar() {
  return (
    <div className="px-3 py-2 sm:px-4 sm:py-2.5">
      <div className="mx-auto flex w-full max-w-7xl justify-end">
        <div className="flex min-w-0 flex-col items-end gap-1">
          <div className="flex min-w-0 items-center gap-4">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              Aktuální sazby
            </span>
            <div className="flex min-w-0 shrink-0 items-center gap-2.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:thin]">
              {MARKETING_BANK_RATES.map((rate) => (
                <div key={rate.bank} className="flex shrink-0 flex-col items-center gap-0.5" title={rate.bank}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white shadow-md ring-2 ring-black/5 dark:ring-white/10 sm:h-9 sm:w-9 ${rate.initials.length > 2 ? 'text-[7px] leading-tight px-0.5 sm:text-[8px]' : rate.initials.length > 1 ? 'text-[9px] sm:text-[10px]' : 'text-xs sm:text-sm'} ${rate.circleClass}`}
                  >
                    {rate.initials}
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums text-blue-600 dark:text-blue-400 sm:text-[11px]">
                    {rate.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-right text-[10px] leading-snug text-gray-500 dark:text-gray-500">
            Orientační přehled – sazby se mohou lišit dle bonity, LTV a podmínek banky.
          </p>
        </div>
      </div>
    </div>
  );
}
