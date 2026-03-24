import { useRef, useState } from 'react';
import { Upload, X, Check } from 'lucide-react';

export interface DocumentUploadProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  /** Jedna položka – už je na serveru ve slotu */
  serverComplete?: boolean;
  /** Např. 6 výpisů – kolik slotů je UPLOADED */
  multiProgress?: { uploaded: number; total: number };
  onPickFiles: (files: FileList) => void;
  /** Zrušit / nahradit (jeden soubor nebo všechny výpisy) */
  onClear?: () => void;
}

export function DocumentUpload({
  label,
  accept = 'image/*,.pdf',
  multiple = false,
  hint,
  required = false,
  disabled = false,
  uploading = false,
  serverComplete = false,
  multiProgress,
  onPickFiles,
  onClear,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files?.length) {
      onPickFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onPickFiles(e.target.files);
    }
    e.target.value = '';
  };

  const multiMode = !!multiProgress;
  const multiFull = multiMode && multiProgress.uploaded >= multiProgress.total;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {!multiMode && !serverComplete && (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            disabled || uploading
              ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
              : dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" aria-hidden />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {uploading ? (
              'Nahrávám…'
            ) : (
              <>
                <span className="text-blue-600 dark:text-blue-400 font-medium">Klikněte pro výběr</span>{' '}
                nebo přetáhněte soubor
              </>
            )}
          </p>
          {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
        </div>
      )}

      {!multiMode && serverComplete && (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Soubor byl nahrán</p>
          </div>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled || uploading}
              className="flex-shrink-0 ml-2 p-1.5 hover:bg-green-100 dark:hover:bg-green-800 rounded transition-colors disabled:opacity-50"
              title="Nahradit soubor"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      )}

      {multiMode && (
        <div className="space-y-2">
          <div
            className={`flex items-center justify-between p-3 rounded-lg border ${
              multiFull
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              {multiFull ? (
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Upload className="w-5 h-5 text-gray-400" />
              )}
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Nahráno {multiProgress.uploaded} / {multiProgress.total}
              </p>
            </div>
            {multiFull && onClear && (
              <button
                type="button"
                onClick={onClear}
                disabled={disabled || uploading}
                className="text-sm font-medium text-gray-700 dark:text-gray-200 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Změnit vše
              </button>
            )}
          </div>
          {!multiFull && (
            <button
              type="button"
              onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {uploading ? 'Nahrávám…' : '+ Nahrát soubor(y)'}
            </button>
          )}
          {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled || uploading}
        onChange={handleChange}
      />
    </div>
  );
}
