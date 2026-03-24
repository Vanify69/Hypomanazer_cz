import { useState } from 'react';
import { X, FolderOpen, Upload, Loader2 } from 'lucide-react';
import { Applicant, ExtractedData, TaxData, BankStatementData } from '../../lib/types';

interface ApplicantUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (applicantData: {
    extractedData: ExtractedData;
    taxData?: TaxData;
    bankStatementData?: BankStatementData;
  }) => void;
}

export function ApplicantUploadModal({ isOpen, onClose, onComplete }: ApplicantUploadModalProps) {
  const [folderPath, setFolderPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  if (!isOpen) return null;
  
  const handleFolderSelect = () => {
    // Simulace výběru složky
    const mockPath = 'C:\\Users\\Zprostředkovatel\\Dokumenty\\Klienti\\Novy_Spoluzadatel_2026';
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
    
    // Simulace vytažení dat z dokumentů
    setTimeout(() => {
      const applicantData = {
        extractedData: {
          jmeno: 'Jana',
          prijmeni: 'Nováková',
          rc: '855612/1234',
          adresa: 'Hlavní 123, 110 00 Praha 1',
          datumNarozeni: '12. 06. 1985',
          mistoNarozeni: 'Praha'
        },
        taxData: {
          rok: 2025,
          hrubePrijmy: 420000,
          zdanitelnyPrijem: 420000,
          danZPrijmu: 63000,
          socialniPojisteni: 29400,
          zdravotniPojisteni: 18900,
          cistePrijmy: 308700
        },
        bankStatementData: {
          obdobi: '01/2026',
          prijmy: 35000,
          vydaje: 14000,
          prumernyZustatek: 52000,
          transakce: [
            { datum: '2026-01-01', popis: 'Mzda', castka: 35000, typ: 'prijem' as const },
            { datum: '2026-01-05', popis: 'Nájem', castka: -8000, typ: 'vydaj' as const },
            { datum: '2026-01-10', popis: 'Nákup', castka: -2800, typ: 'vydaj' as const },
            { datum: '2026-01-15', popis: 'Energie', castka: -3200, typ: 'vydaj' as const }
          ]
        }
      };
      
      onComplete(applicantData);
      
      // Reset stavu
      setIsProcessing(false);
      setProgress(0);
      setFolderPath('');
    }, 2200);
  };
  
  const handleClose = () => {
    if (!isProcessing) {
      setFolderPath('');
      setProgress(0);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Přidat spolužadatele</h2>
          {!isProcessing && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <div className="p-6">
          {!isProcessing ? (
            <div className="space-y-6">
              <p className="text-gray-600">
                Vyberte složku s podklady spolužadatele (OP, daňové přiznání, výpisy z účtu)
              </p>
              
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
                  <li>• Data z daňového přiznání a výpisů budou zpracována</li>
                  <li>• Spolužadatel bude přidán k případu</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Zrušit
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!folderPath}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Upload className="w-5 h-5" />
                  Nahrát a přidat
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Vytahujeme data z dokumentů...
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