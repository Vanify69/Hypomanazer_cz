import { useState } from "react";
import { Keyboard, FolderOpen, Save, Info } from "lucide-react";
import { mockZkratky } from "../data/mockData";

export default function Nastaveni() {
  const [cestaUloziste, setCestaUloziste] = useState(
    "C:\\HypoApp\\Data"
  );

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Nastavení
        </h1>
        <p className="text-gray-500 mb-8">
          Konfigurace aplikace a klávesových zkratek
        </p>

        {/* Klávesové zkratky */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Klávesové zkratky
          </h2>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium">
                  Jak používat zkratky
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Nejprve nastavte případ jako "Aktivní" v detailu případu. Poté
                  můžete použít klávesové zkratky k vložení dat do libovolného
                  formuláře (např. bankovního).
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Klávesová zkratka
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Pole
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Popis
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockZkratky.map((zkratka, index) => (
                  <tr
                    key={index}
                    className={index !== mockZkratky.length - 1 ? "border-b border-gray-100" : ""}
                  >
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-gray-100 text-gray-900 text-sm rounded font-mono">
                        {zkratka.klavesa}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                      {zkratka.pole}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {zkratka.popis}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cesta k úložišti */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Cesta k úložišti
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Zde jsou ukládány všechny dokumenty a data případů.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              value={cestaUloziste}
              onChange={(e) => setCestaUloziste(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              aria-label="Cesta k úložišti dokumentů"
            />
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              Procházet...
            </button>
          </div>
        </div>

        {/* Excelové šablony bank */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Excelové šablony bank
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Automatické vyplňování kalkulaček bank (vyžaduje nainstalovaný Microsoft Excel).
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Komerční banka
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  KB_kalkulacka_hypoteky_2026.xlsx
                </p>
              </div>
              <button className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
                Změnit
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">ČSOB</p>
                <p className="text-xs text-gray-500 mt-1">
                  CSOB_hypoteka_formular_2026.xlsx
                </p>
              </div>
              <button className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
                Změnit
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Česká spořitelna
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  CS_hypotecni_kalkulacka.xlsx
                </p>
              </div>
              <button className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
                Změnit
              </button>
            </div>
          </div>
        </div>

        {/* Uložit nastavení */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => alert("Nastavení uloženo")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Uložit nastavení
          </button>
        </div>
      </div>
    </div>
  );
}
