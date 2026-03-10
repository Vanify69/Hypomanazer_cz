import { Link } from 'react-router';
import { Case } from '../../lib/types';
import { StatusBadge } from './StatusBadge';
import { Calendar, Banknote, Star, Loader2 } from 'lucide-react';

interface CaseCardProps {
  case: Case;
}

export function CaseCard({ case: caseData }: CaseCardProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    // Backend ukládá datum jako "13.2.2025" (cs-CZ) – new Date() to neumí
    const iso = new Date(dateStr).getTime();
    if (!Number.isNaN(iso)) return new Date(dateStr).toLocaleDateString('cs-CZ');
    // Už je ve formátu d.m.yyyy
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr.trim())) return dateStr.trim();
    return dateStr;
  };
  
  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  return (
    <Link
      to={`/case/${caseData.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden"
    >
      {caseData.extractionInProgress && (
        <div className="absolute inset-x-0 top-0 h-1 bg-blue-100 overflow-hidden" aria-hidden>
          <div className="h-full min-w-[40%] w-1/3 animate-pulse bg-blue-500 rounded-r" />
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg text-gray-900">{caseData.jmeno}</h3>
          {caseData.isActive && (
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          )}
          {caseData.extractionInProgress && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium" title="Zpracovávají se data">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Zpracovávám data…
            </span>
          )}
        </div>
        <StatusBadge status={caseData.status} />
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(caseData.datum)}</span>
        </div>
        
        {caseData.vyseUveru && (
          <div className="flex items-center gap-2 text-gray-600">
            <Banknote className="w-4 h-4" />
            <span className="font-medium text-gray-900">{formatCurrency(caseData.vyseUveru)}</span>
          </div>
        )}
        
        {caseData.ucel && (
          <p className="text-gray-600 line-clamp-1">{caseData.ucel}</p>
        )}
      </div>
    </Link>
  );
}
