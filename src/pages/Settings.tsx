import { Keyboard, FolderOpen, FileSpreadsheet } from 'lucide-react';
import { shortcuts } from '../lib/mockData';

export function Settings() {
  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Nastavení</h1>
        <p className="text-gray-600 mb-8">Konfigurace aplikace a klávesových zkratek</p>
        
        <div className="space-y-6">
          {/* Klávesové zkratky */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Klávesové zkratky
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Zkratky pro rychlé vkládání dat do bankovních formulářů
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Zkratka</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Pole</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Popis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {shortcuts.map((shortcut) => (
                    <tr key={shortcut.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-900">
                          {shortcut.key}
                        </kbd>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {shortcut.field}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {shortcut.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-blue-50 border-t border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Označte případ jako „Aktivní" na jeho detailu. Poté můžete použít zkratky pro 
                vkládání dat přímo do formulářů KB, ČSOB nebo jiných bank.
              </p>
            </div>
          </div>
          
          {/* Úložiště */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <FolderOpen className="w-5 h-5" />
              Úložiště dokumentů
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="storage-path" className="block text-sm font-medium text-gray-700 mb-2">
                  Výchozí cesta pro ukládání podkladů
                </label>
                <div className="flex gap-3">
                  <input
                    id="storage-path"
                    type="text"
                    value="C:\Users\Zprostředkovatel\Dokumenty\HypoManager\Klienti"
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    Změnit
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Excelové šablony */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5" />
              Excelové kalkulačky bank
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Komerční banka (KB)</p>
                  <p className="text-sm text-gray-600">Kalkulačka_KB_2026.xlsx</p>
                </div>
                <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Změnit šablonu
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">ČSOB</p>
                  <p className="text-sm text-gray-600">Kalkulacka_CSOB_2026.xlsx</p>
                </div>
                <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Změnit šablonu
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              Šablony se automaticky vyplní daty z aktivního případu a propočítají se
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
