import { Link, useLocation } from 'react-router';
import { LayoutDashboard, FileText, Settings, LogOut, Users, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export interface SidebarProps {
  /** V režimu embedded se nevykresluje vnější wrapper (pro Sheet na mobilu). */
  embedded?: boolean;
  /** Zavolá se po navigaci (např. zavření Sheet po kliku na odkaz). */
  onClose?: () => void;
  /** Volitelný obsah nad odhlášením (např. systémová lišta na tabletu). */
  traySlot?: React.ReactNode;
}

export function Sidebar({ embedded = false, onClose, traySlot }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Přehled případů' },
    { path: '/leads', icon: Users, label: 'Leady' },
    { path: '/referrers', icon: UserPlus, label: 'Tipaři' },
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
            <h1 className="font-semibold text-lg">HypoManager</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Zprostředkování hypoték</p>
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

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2 shrink-0">
        {traySlot && <div className="mb-3">{traySlot}</div>}
        {user?.email && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate px-2" title={user.email}>
            {user.email}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            onClose?.();
            logout();
          }}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Odhlásit se
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex h-full w-full flex-col bg-white dark:bg-gray-800">{content}</div>;
  }

  return (
    <div className="w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen flex flex-col">
      {content}
    </div>
  );
}
