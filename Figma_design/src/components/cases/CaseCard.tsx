import { Link } from 'react-router';
import { Case } from '../../lib/types';
import { StatusBadge } from './StatusBadge';
import { Calendar, Banknote, Star } from 'lucide-react';

interface CaseCardProps {
  case: Case;
  onSetActive?: (id: string) => void;
}

export function CaseCard({ case: caseData, onSetActive }: CaseCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ');
  };
  
  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  const handleSetActive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSetActive) {
      onSetActive(caseData.id);
    }
  };
  
  return (
    <Link
      to={`/case/${caseData.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all relative"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg text-gray-900">{caseData.jmeno}</h3>
          {caseData.isActive && (
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={caseData.status} />
          {!caseData.isActive && (
            <button
              onClick={handleSetActive}
              className="p-2 hover:bg-yellow-50 rounded-lg transition-colors group"
              title="Nastavit jako aktivní případ"
            >
              <Star className="w-4 h-4 text-gray-400 group-hover:text-yellow-500 group-hover:fill-yellow-500 transition-colors" />
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(caseData.datum)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">{formatCurrency(caseData.vyseUveru)}</span>
        </div>
        
        <p className="text-gray-600 line-clamp-1">
          {caseData.ucel || <span className="text-gray-400 italic">Účel úvěru neuvedeno</span>}
        </p>
      </div>
    </Link>
  );
}