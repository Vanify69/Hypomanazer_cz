import { useState } from "react";
import { useNavigate } from "react-router";
import { FolderOpen, Upload, Loader2, CheckCircle2 } from "lucide-react";

type FazeNahravani = "vyber" | "nahravani" | "zpracovani" | "hotovo";

export default function NovyPripad() {
  const navigate = useNavigate();
  const [faze, setFaze] = useState<FazeNahravani>("vyber");
  const [vybranaSlozka, setVybranaSlozka] = useState("");

  const handleVyberSlozku = () => {
    // V reálné desktopové aplikaci by zde byl dialog pro výběr složky
    // V prohlížeči simulujeme výběr
    setVybranaSlozka("C:\\Dokumenty\\Klienti\\Jan_Novak_2026");
  };

  const handleNahrat = () => {
    setFaze("nahravani");
    
    // Simulace nahrávání
    setTimeout(() => {
      setFaze("zpracovani");
      
      // Simulace zpracování OCR a AI
      setTimeout(() => {
        setFaze("hotovo");
        
        // Po dokončení přesměrujeme na detail prvního případu
        setTimeout(() => {
          navigate("/pripad/1");
        }, 1500);
      }, 3000);
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Nový případ
        </h1>
        <p className="text-gray-500 mb-8">
          Nahrajte složku s podklady klienta pro automatické vytažení dat
        </p>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {faze === "vyber" && (
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FolderOpen className="w-10 h-10 text-blue-600" />
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Vyberte složku s podklady
              </h2>
              <p className="text-gray-500 mb-6">
                Složka by měla obsahovat občanský průkaz (přední a zadní strana),
                daňové přiznání nebo výpisy z účtu
              </p>

              {vybranaSlozka ? (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-mono break-all">
                    {vybranaSlozka}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleVyberSlozku}
                  className="mb-6 px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  Procházet...
                </button>
              )}

              {vybranaSlozka && (
                <div className="space-y-3">
                  <button
                    onClick={handleNahrat}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Nahrát a zpracovat
                  </button>
                  <button
                    onClick={() => setVybranaSlozka("")}
                    className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Zrušit výběr
                  </button>
                </div>
              )}
            </div>
          )}

          {faze === "nahravani" && (
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Nahrávání souborů...
              </h2>
              <p className="text-gray-500">Kopírujeme dokumenty do systému</p>
              <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full w-1/3 transition-all duration-500"></div>
              </div>
            </div>
          )}

          {faze === "zpracovani" && (
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Vytahujeme data z dokumentů...
              </h2>
              <p className="text-gray-500 mb-4">
                Zpracováváme občanský průkaz a další podklady pomocí OCR a AI
              </p>
              <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full w-2/3 transition-all duration-500"></div>
              </div>
              <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Načteno jméno a příjmení
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Načteno rodné číslo
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Načtena adresa
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Zpracování příjmů a výdajů...
                </div>
              </div>
            </div>
          )}

          {faze === "hotovo" && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Případ úspěšně vytvořen!
              </h2>
              <p className="text-gray-500 mb-4">
                Data byla automaticky vytažena z dokumentů
              </p>
              <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full w-full transition-all duration-500"></div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Přesměrování na detail případu...
              </p>
            </div>
          )}
        </div>

        {faze === "vyber" && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Doporučená struktura složky:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• OP_predni.jpg nebo .png</li>
              <li>• OP_zadni.jpg nebo .png</li>
              <li>• danova_2025.pdf (volitelně)</li>
              <li>• vypisy_ucet.pdf (volitelně)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
