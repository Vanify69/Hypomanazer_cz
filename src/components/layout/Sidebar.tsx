import { Link, useLocation } from 'react-router';
import { LayoutDashboard, FileText, Settings, LogOut, Users, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Přehled případů' },
    { path: '/leads', icon: Users, label: 'Leady' },
    { path: '/referrers', icon: UserPlus, label: 'Tipaři' },
    { path: '/settings', icon: Settings, label: 'Nastavení' },
  ];
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">HypoManager</h1>
            <p className="text-xs text-gray-500">Zprostředkování hypoték</p>
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
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
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
      
      <div className="p-4 border-t border-gray-200 space-y-2">
        {user?.email && (
          <p className="text-xs text-gray-500 truncate px-2" title={user.email}>
            {user.email}
          </p>
        )}
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Odhlásit se
        </button>
      </div>
    </div>
  );
}
