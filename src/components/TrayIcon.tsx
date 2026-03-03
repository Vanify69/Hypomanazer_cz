import { useState } from "react";
import { Menu, X, Keyboard, Power } from "lucide-react";
import { mockPripady } from "../data/mockData";
import { Link } from "react-router";

export default function TrayIcon() {
  const [menuOpen, setMenuOpen] = useState(false);
  const aktivniPripad = mockPripady.find((p) => p.aktivni);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {menuOpen && (
          <div className="absolute bottom-16 right-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <p className="text-sm font-medium text-gray-900">
                Aktivní případ:
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {aktivniPripad?.jmeno || "Žádný"}
              </p>
            </div>
            
            <div className="p-2">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-sm text-gray-700"
              >
                <Menu className="w-4 h-4" />
                Otevřít aplikaci
              </Link>
              
              <Link
                to="/nastaveni"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-sm text-gray-700"
              >
                <Keyboard className="w-4 h-4" />
                Klávesové zkratky
              </Link>
              
              <button
                onClick={() => {
                  setMenuOpen(false);
                  alert("Aplikace by se nyní ukončila");
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-sm text-red-600"
              >
                <Power className="w-4 h-4" />
                Ukončit
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
            aktivniPripad
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-700 hover:bg-gray-800"
          }`}
          title={aktivniPripad ? `Aktivní: ${aktivniPripad.jmeno}` : "HypoApp"}
        >
          {menuOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </button>

        {aktivniPripad && !menuOpen && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>
    </div>
  );
}
