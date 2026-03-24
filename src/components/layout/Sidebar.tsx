import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useTheme } from 'next-themes';
import { LayoutDashboard, FileText, Settings, LogOut, Users, UserPlus, Calendar, X, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { Case } from '../../lib/types';

export interface SidebarProps {
  /** V režimu embedded se nevykresluje vnější wrapper (pro Sheet na mobilu). */
  embedded?: boolean;
  /** Zavolá se po navigaci (např. zavření Sheet po kliku na odkaz). */
  onClose?: () => void;
  /** Aktivní případ pro zobrazení indikátoru v sidebaru. */
  activeCase?: Case | null;
}

export function Sidebar({ embedded = false, onClose, activeCase }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/cases', icon: FileText, label: 'Případy' },
    { path: '/leads', icon: Users, label: 'Leady' },
    { path: '/referrers', icon: UserPlus, label: 'Tipaři' },
    { path: '/calendar', icon: Calendar, label: 'Kalendář' },
    { path: '/settings', icon: Settings, label: 'Nastavení' },
  ];

  const content = (
    <>
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-lg">HypoManažer</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Hypoteční CRM</p>
          </div>
          {embedded && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Zavřít menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 space-y-3 shrink-0">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-600 dark:bg-gray-700/50 min-w-0">
          <div className="relative shrink-0">
            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span
              className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-gray-100 dark:ring-gray-700/50 ${
                activeCase ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-500 dark:text-gray-400">Aktivní případ</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {activeCase ? activeCase.jmeno : 'Žádný'}
            </div>
          </div>
        </div>

        {themeMounted && (
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-100 dark:hover:bg-gray-700/80"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 shrink-0 text-amber-500" />
                Světlý režim
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 shrink-0 text-indigo-600" />
                Tmavý režim
              </>
            )}
          </button>
        )}

        <div className="-mx-4 my-1 h-px w-[calc(100%+2rem)] bg-gray-200 dark:bg-gray-700" />

        <div className="pt-1 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
              <User className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user?.name || user?.email?.split('@')[0] || 'Uživatel'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose?.();
              logout();
            }}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-label="Odhlásit se"
            title="Odhlásit se"
          >
            <LogOut className="w-5 h-5 shrink-0" />
          </button>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex h-full w-full flex-col bg-white app-sidebar-dark">{content}</div>;
  }

  return (
    <div className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-[var(--sidebar-border)] app-sidebar-dark">
      {content}
    </div>
  );
}
