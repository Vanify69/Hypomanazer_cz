import { useState } from "react";
import { Keyboard, FolderOpen, Save, Info, FileSpreadsheet } from "lucide-react";
import { mockZkratky } from "../data/mockData";
import { BankCalculatorsSettingsSection } from "./bankCalculators/BankTemplateSettingsCard";

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

        {/* Excelové kalkulačky bank (RB, UCB) – šablony per uživatel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Excelové kalkulačky bank
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Nahrajte si vlastní soubory .xlsm pro každou banku.
            Data se ukládají k vašemu účtu; aplikace nepoužívá sdílené výchozí soubory.
            Plný přepočet maker v Excelu na serveru zatím není – výsledky v případu mohou být v mock režimu.
          </p>

          <BankCalculatorsSettingsSection />
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
