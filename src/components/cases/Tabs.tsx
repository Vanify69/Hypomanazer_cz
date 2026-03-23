import type { Applicant } from '../../lib/types';

interface TabsProps {
  applicants: Applicant[];
  activeApplicantId: string;
  onTabChange: (applicantId: string) => void;
}

const LABELS: Record<number, string> = {
  1: 'Hlavní žadatel',
  2: 'Spolužadatel 1',
  3: 'Spolužadatel 2',
  4: 'Spolužadatel 3',
};

export function Tabs({ applicants, activeApplicantId, onTabChange }: TabsProps) {
  if (!applicants.length) return null;

  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="flex gap-1 px-6" aria-label="Žadatelé">
        {applicants.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onTabChange(a.id)}
            className={
              `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeApplicantId === a.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`
            }
          >
            {LABELS[a.order] ?? `Žadatel ${a.order}`}
          </button>
        ))}
      </nav>
    </div>
  );
}

