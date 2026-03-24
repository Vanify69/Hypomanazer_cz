import { Link, useLocation } from 'react-router';
import { LayoutDashboard, FileText, Settings, Minimize2, Users, Briefcase, Calendar, Circle, LogOut, User, Moon, Sun, UserCheck } from 'lucide-react';
import { Case } from '../../lib/types';
import { Button } from '../ui/button';
import { useTheme } from '../../lib/theme-context';

interface SidebarProps {
  activeCase: Case | null;
}

export function Sidebar({ activeCase }: SidebarProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/leads', icon: Users, label: 'Leady' },
    { path: '/cases', icon: Briefcase, label: 'Případy' },
    { path: '/partners', icon: UserCheck, label: 'Tipaři' },
    { path: '/calendar', icon: Calendar, label: 'Kalendář' },
    { path: '/settings', icon: Settings, label: 'Nastavení' },
  ];
  
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg dark:text-white">HypoManažer</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Zprostředkování hypoték</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Aktivní případ */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="relative">
            <FileText className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            {activeCase && (
              <Circle className="w-2 h-2 text-green-500 fill-green-500 absolute -top-0.5 -right-0.5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Aktivní případ</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {activeCase ? activeCase.jmeno : 'Žádný'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Dark mode toggle */}
      <div className="px-4 pb-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 mr-2" />
              Světlý režim
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 mr-2" />
              Tmavý režim
            </>
          )}
        </Button>
      </div>
      
      {/* Přihlášený uživatel a odhlášení */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">Jan Novák</div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 h-8 w-8 p-0"
            onClick={() => {
              // Odhlášení - zde můžete přidat logiku
              console.log('Odhlášení');
            }}
            title="Odhlásit se"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}