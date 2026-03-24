import { FileText, Circle } from 'lucide-react';
import { Case } from '../../lib/types';

interface TrayIndicatorProps {
  activeCase: Case | null;
}

export function TrayIndicator({ activeCase }: TrayIndicatorProps) {
  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex items-center gap-3 z-50">
      <div className="relative">
        <FileText className="w-5 h-5 text-gray-700" />
        {activeCase && (
          <Circle className="w-2 h-2 text-green-500 fill-green-500 absolute -top-1 -right-1" />
        )}
      </div>
      <div className="text-sm">
        <div className="font-medium text-gray-900">
          {activeCase ? `Aktivní: ${activeCase.jmeno}` : 'Žádný aktivní případ'}
        </div>
        <div className="text-xs text-gray-500">Systémová lišta</div>
      </div>
    </div>
  );
}
