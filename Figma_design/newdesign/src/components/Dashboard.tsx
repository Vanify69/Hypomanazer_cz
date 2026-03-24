import { useState } from "react";
import { Link } from "react-router";
import { Search, Plus, CheckCircle2, Clock, FileText } from "lucide-react";
import { mockPripady } from "../data/mockData";
import { StavPripadu } from "../types";

const stavConfig: Record<StavPripadu, { label: string; color: string; icon: any }> = {
  novy: { label: "Nový", color: "bg-gray-100 text-gray-700", icon: FileText },
  "data-vytazena": { label: "Data vytažena", color: "bg-blue-100 text-blue-700", icon: Clock },
  doplneno: { label: "Doplněno", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

export default function Dashboard() {
  const [hledat, setHledat] = useState("");

  const filtrovanePripady = mockPripady.filter((p) =>
    p.jmeno.toLowerCase().includes(hledat.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Přehled případů</h1>
            <p className="text-gray-500 mt-1">
              Celkem {mockPripady.length} {mockPripady.length === 1 ? "případ" : "případů"}
            </p>
          </div>
          
          <Link
            to="/novy-pripad"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nový případ
          </Link>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Hledat podle jména..."
              value={hledat}
              onChange={(e) => setHledat(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrovanePripady.map((pripad) => {
            const stavInfo = stavConfig[pripad.stav];
            const StavIcon = stavInfo.icon;

            return (
              <Link
                key={pripad.id}
                to={`/pripad/${pripad.id}`}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all relative"
              >
                {pripad.aktivni && (
                  <div className="absolute top-4 right-4">
                    <div className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                      Aktivní
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${stavInfo.color}`}>
                    <StavIcon className="w-4 h-4" />
                    {stavInfo.label}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {pripad.jmeno}
                </h3>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    Vytvořeno:{" "}
                    {new Date(pripad.datumVytvoreni).toLocaleDateString("cs-CZ")}
                  </p>
                  
                  {pripad.vyseUveru && (
                    <p className="font-medium text-gray-900">
                      {pripad.vyseUveru.toLocaleString("cs-CZ")} Kč
                    </p>
                  )}
                  
                  {pripad.ucel && (
                    <p className="text-gray-500 line-clamp-2">{pripad.ucel}</p>
                  )}

                  <p className="text-gray-400">
                    {pripad.soubory.length} {pripad.soubory.length === 1 ? "soubor" : "souborů"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {filtrovanePripady.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Žádné případy nenalezeny</p>
          </div>
        )}
      </div>
    </div>
  );
}
