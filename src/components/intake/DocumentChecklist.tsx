import { Check, AlertCircle } from 'lucide-react';

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  count?: number;
  target?: number;
}

interface DocumentChecklistProps {
  title: string;
  items: ChecklistItem[];
}

export function DocumentChecklist({ title, items }: DocumentChecklistProps) {
  const allRequired = items.filter((i) => i.required);
  const completedRequired = allRequired.filter((i) => i.completed);
  const progress =
    allRequired.length > 0 ? (completedRequired.length / allRequired.length) * 100 : 100;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {completedRequired.length} z {allRequired.length} povinných dokumentů
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              item.completed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : item.required
                  ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  item.completed
                    ? 'bg-green-100 dark:bg-green-800'
                    : item.required
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {item.completed ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : item.required ? (
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                ) : (
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-sm font-medium ${
                      item.completed
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.required && !item.completed && (
                    <span className="text-xs text-red-600 dark:text-red-400">povinné</span>
                  )}
                </div>
                {item.target != null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.count ?? 0} / {item.target} souborů
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {progress < 100 && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 inline mr-1.5 align-text-bottom" />
            Pro pokračování je třeba nahrát všechny povinné dokumenty
          </p>
        </div>
      )}
    </div>
  );
}
