import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowLeft, FolderOpen, Upload, Loader2 } from 'lucide-react';
import { saveCase } from '../lib/storage';
import { Case } from '../lib/types';

export function NewCase() {
  const navigate = useNavigate();
  const [folderPath, setFolderPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleFolderSelect = () => {
    // Simulace výběru složky (v reálné desktop aplikaci by zde byl systémový dialog)
    const mockPath = 'C:\\Users\\Zprostředkovatel\\Dokumenty\\Klienti\\Jan_Novak_2026';
    setFolderPath(mockPath);
  };
  
  const handleUpload = async () => {
    if (!folderPath) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    // Simulace zpracování
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    
    // Simulace vytažení dat z OP
    setTimeout(() => {
      const newCase: Case = {
        id: Date.now().toString(),
        jmeno: 'Nový klient',
        datum: new Date().toISOString().split('T')[0],
        status: 'data-vytazena',
        isActive: false,
        extractedData: {
          jmeno: 'Pavel',
          prijmeni: 'Novotný',
          rc: '900215/1357',
          adresa: 'Polní 789, 301 00 Plzeň',
          datumNarozeni: '15. 02. 1990',
          mistoNarozeni: 'Plzeň'
        },
        taxData: {
          rok: 2025,
          hrubePrijmy: 504000,
          zdanitelnyPrijem: 504000,
          danZPrijmu: 75600,
          socialniPojisteni: 35280,
          zdravotniPojisteni: 22680,
          cistePrijmy: 370440
        },
        bankStatementData: {
          obdobi: '01/2026',
          prijmy: 42000,
          vydaje: 16500,
          prumernyZustatek: 72100,
          transakce: [
            { datum: '2026-01-01', popis: 'Mzda', castka: 42000, typ: 'prijem' },
            { datum: '2026-01-05', popis: 'Nájem', castka: -10000, typ: 'vydaj' },
            { datum: '2026-01-10', popis: 'Nákup', castka: -3200, typ: 'vydaj' },
            { datum: '2026-01-15', popis: 'Energie', castka: -3300, typ: 'vydaj' }
          ]
        },
        soubory: [
          { name: 'OP_predni.jpg', type: 'op-predni' },
          { name: 'OP_zadni.jpg', type: 'op-zadni' },
          { name: 'danove_priznani.pdf', type: 'danove' },
          { name: 'vypis_uctu.pdf', type: 'vypisy' }
        ]
      };
      
      newCase.jmeno = `${newCase.extractedData.jmeno} ${newCase.extractedData.prijmeni}`;
      
      saveCase(newCase);
      navigate(`/case/${newCase.id}`);
    }, 2200);
  };
  
  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="max-w-3xl mx-auto p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na přehled
        </Link>
        
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Nový případ</h1>
          <p className="text-gray-600 mb-8">
            Vyberte složku s podklady klienta (OP, daňové přiznání, výpisy z účtu)
          </p>
          
          {!isProcessing ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Složka s podklady
                </label>
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={folderPath}
                    readOnly
                    placeholder="Nevybrána žádná složka"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                  <button
                    onClick={handleFolderSelect}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Procházet
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  Složka by měla obsahovat: OP (přední a zadní strana), daňové přiznání nebo výpisy z účtu
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Co se stane po nahrání?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Systém automaticky vytáhne data z občanského průkazu</li>
                  <li>• Data budou zpracována a ověřena</li>
                  <li>• Vytvoří se nový případ připravený k doplnění</li>
                </ul>
              </div>
              
              <button
                onClick={handleUpload}
                disabled={!folderPath}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Upload className="w-5 h-5" />
                Nahrát a vytvořit případ
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Vytahujeme data z OP...
                </h3>
                <p className="text-gray-600 mb-6">
                  Zpracováváme dokumenty a extrahujeme údaje
                </p>
                
                <div className="max-w-md mx-auto">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{progress}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}