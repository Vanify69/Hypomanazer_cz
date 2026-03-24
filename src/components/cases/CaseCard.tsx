import { Link } from 'react-router';
import { Case } from '../../lib/types';
import { StatusBadge } from './StatusBadge';
import { Calendar, Banknote, Star, Loader2 } from 'lucide-react';

export interface CaseCardProps {
  case: Case;
  /** Volitelné – z Figmy: nastavení aktivního případu bez vstupu do detailu */
  onSetActive?: (id: string) => void;
}

export function CaseCard({ case: caseData, onSetActive }: CaseCardProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const iso = new Date(dateStr).getTime();
    if (!Number.isNaN(iso)) return new Date(dateStr).toLocaleDateString('cs-CZ');
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr.trim())) return dateStr.trim();
    return dateStr;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600">
      <Link
        to={`/case/${caseData.id}`}
        className="relative block overflow-hidden p-5"
      >
        {caseData.extractionInProgress && (
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-blue-100 dark:bg-blue-950" aria-hidden>
            <div className="h-full min-w-[40%] w-1/3 animate-pulse rounded-r bg-blue-500" />
          </div>
        )}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{caseData.jmeno}</h3>
            {caseData.isActive && (
              <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" aria-label="Aktivní případ" />
            )}
            {caseData.extractionInProgress && (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400"
                title="Zpracovávají se data"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Zpracovávám data…
              </span>
            )}
          </div>
          <StatusBadge status={caseData.status} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{formatDate(caseData.datum)}</span>
          </div>

          {caseData.vyseUveru ? (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Banknote className="h-4 w-4 shrink-0" />
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(caseData.vyseUveru)}</span>
            </div>
          ) : null}

          {caseData.ucel ? (
            <p className="line-clamp-2 text-gray-600 dark:text-gray-400">{caseData.ucel}</p>
          ) : null}
        </div>
      </Link>

      {onSetActive && !caseData.isActive ? (
        <div className="border-t border-gray-200 px-5 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={() => onSetActive(caseData.id)}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Nastavit jako aktivní případ
          </button>
        </div>
      ) : null}
    </div>
  );
}
