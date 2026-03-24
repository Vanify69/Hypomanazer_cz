import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowLeft, Upload, Loader2, FileText, X } from 'lucide-react';
import { createCaseFromFiles } from '../lib/storage';

export function NewCase() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setSelected((prev) => [...prev, ...files]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (index: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selected.length === 0) return;
    setError('');
    setIsProcessing(true);
    setProgress(10);

    try {
      setProgress(30);
      const created = await createCaseFromFiles(selected);
      setProgress(100);
      navigate(`/case/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se vytvořit případ.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 app-content-dark overflow-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na přehled
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Nový případ</h1>
          <p className="text-gray-600 mb-6">
            Vyberte soubory s podklady klienta. Systém sám pozná typ dokumentu (OP přední/zadní,
            daňové, výpisy) a z OP vytáhne jméno, rodné číslo a adresu.
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm mb-4">{error}</div>
          )}

          {!isProcessing ? (
            <div className="space-y-6">
              <div>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,.gif,.bmp,.webp"
                  onChange={onFileChange}
                  className="hidden"
                  aria-label="Vybrat soubory (OP, daňové přiznání, výpisy)"
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  Vybrat soubory (OP, daňové přiznání, výpisy)
                </button>
              </div>

              {selected.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Vybrané soubory</h3>
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                    {selected.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-3 p-3 bg-gray-50"
                      >
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="flex-1 truncate text-sm text-gray-900">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          aria-label="Odebrat"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Co se stane po nahrání?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Systém sám rozpozná typ dokumentu (OP přední/zadní, daňové, výpisy)</li>
                  <li>• Z obrázků OP se automaticky vytáhnou jméno, RČ a adresa</li>
                  <li>• Vytvoří se nový případ s nahranými soubory</li>
                  <li>• Doplníte výši úvěru a účel v detailu případu</li>
                </ul>
              </div>

              <button
                onClick={handleUpload}
                disabled={selected.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Upload className="w-5 h-5" />
                Nahrát a vytvořit případ
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Zpracováváme soubory…
              </h3>
              <p className="text-gray-600 mb-6">
                Nahrávám a vytahuji data z OP
              </p>
              <div className="max-w-md mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
