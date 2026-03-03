import { CaseStatus } from '../../lib/types';
import { FileQuestion, FileCheck, FileText } from 'lucide-react';

interface StatusBadgeProps {
  status: CaseStatus;
}

const statusConfig = {
  'novy': {
    label: 'Nový',
    color: 'bg-gray-100 text-gray-700',
    icon: FileQuestion
  },
  'data-vytazena': {
    label: 'Data vytažena',
    color: 'bg-blue-100 text-blue-700',
    icon: FileText
  },
  'doplneno': {
    label: 'Doplněno',
    color: 'bg-green-100 text-green-700',
    icon: FileCheck
  }
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {config.label}
    </span>
  );
}
