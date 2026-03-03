import { Link, useLocation } from "react-router";
import { Home, Settings, FolderPlus } from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const links = [
    { to: "/", icon: Home, label: "Přehled případů" },
    { to: "/novy-pripad", icon: FolderPlus, label: "Nový případ" },
    { to: "/nastaveni", icon: Settings, label: "Nastavení" },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="font-semibold text-xl text-blue-600">HypoApp</h1>
        <p className="text-sm text-gray-500 mt-1">Správa hypoték</p>
      </div>
      
      <nav className="flex-1 p-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to || 
            (link.to !== "/" && location.pathname.startsWith(link.to));
          
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
        <p>© 2026 HypoApp</p>
        <p className="mt-1">Verze 1.0.0</p>
      </div>
    </aside>
  );
}
