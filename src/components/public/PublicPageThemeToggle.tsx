import { Moon, Sun } from 'lucide-react';

export type PublicPageAppearance = 'light' | 'dark';

export function PublicPageThemeToggle({
  appearance,
  onToggle,
}: {
  appearance: PublicPageAppearance;
  onToggle: () => void;
}) {
  const isDark = appearance === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed top-4 right-4 z-[100] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      aria-label={isDark ? 'Přepnout na světlý vzhled' : 'Přepnout na tmavý vzhled'}
      title={isDark ? 'Světlý režim' : 'Tmavý režim'}
    >
      {isDark ? <Sun className="h-5 w-5" strokeWidth={2} /> : <Moon className="h-5 w-5" strokeWidth={2} />}
    </button>
  );
}
