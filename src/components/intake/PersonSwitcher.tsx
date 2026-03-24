import { Check, FileText } from 'lucide-react';

export interface IntakePersonTab {
  id: string;
  label: string;
  isComplete: boolean;
  missingCount: number;
}

interface PersonSwitcherProps {
  persons: IntakePersonTab[];
  currentPersonId: string;
  onSelectPerson: (personId: string) => void;
}

export function PersonSwitcher({ persons, currentPersonId, onSelectPerson }: PersonSwitcherProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 flex-1 overflow-x-auto py-1">
        {persons.map((person) => {
          const isActive = person.id === currentPersonId;
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelectPerson(person.id)}
              className={`
                  relative px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0
                  ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{person.label}</span>
                {person.isComplete ? (
                  <Check className="w-4 h-4 text-green-300" aria-hidden />
                ) : (
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4 text-amber-300" aria-hidden />
                    <span className="text-xs text-amber-200">{person.missingCount}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
