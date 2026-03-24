'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileUp } from 'lucide-react';
import type { Applicant } from '../../lib/types';
import { uploadCaseFile } from '../../lib/storage';
import type { Case } from '../../lib/types';
import { SimpleModal } from './SimpleModal';

type FileType = 'op-predni' | 'op-zadni' | 'danove' | 'vypisy';

function inferFileType(file: File): FileType {
  const name = (file.name || '').toLowerCase();
  if (/predni|front|op_|op-/.test(name) && !/zadni|back/.test(name)) return 'op-predni';
  if (/zadni|back/.test(name)) return 'op-zadni';
  if (/danov|dp|priznani|dap/.test(name)) return 'danove';
  return 'vypisy';
}

function getFileTypeLabel(type: FileType): string {
  switch (type) {
    case 'op-predni': return 'OP přední strana';
    case 'op-zadni': return 'OP zadní strana';
    case 'danove': return 'Daňové přiznání';
    case 'vypisy': return 'Výpis z účtu';
    default: return type;
  }
}

export interface AddCoApplicantModalProps {
  open: boolean;
  onClose: () => void;
  applicant: Applicant;
  caseId: string;
  onUploadComplete: (updatedCase: Case) => void;
}

/**
 * Modal pro přidání spolužadatele – výběr jednotlivých souborů (OP, DP, výpisy), nahrání jen k tomuto žadateli.
 */
export function AddCoApplicantModal({
  open,
  onClose,
  applicant,
  caseId,
  onUploadComplete,
}: AddCoApplicantModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    setSelectedFiles(list);
    setUploadError(null);
    e.target.value = '';
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndAdd = async () => {
    if (!selectedFiles.length) {
      setUploadError('Vyberte alespoň jeden soubor.');
      return;
    }
    setProcessing(true);
    setProgress(0);
    setUploadError(null);
    let lastCase: Case | null = null;
    const total = selectedFiles.length;
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const type = inferFileType(file);
        lastCase = await uploadCaseFile(caseId, file, type, applicant.id);
        setProgress(Math.round(((i + 1) / total) * 100));
      }
      setProgress(100);
      if (lastCase) onUploadComplete(lastCase);
      setTimeout(onClose, 400);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Nahrání se nezdařilo.');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (processing) return;
    setSelectedFiles([]);
    setProgress(0);
    setUploadError(null);
    onClose();
  };

  return (
    <SimpleModal open={open} onClose={handleClose} title="Přidat spolužadatele">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Vyberte jednotlivé soubory spolužadatele: OP (přední a zadní strana), daňové přiznání, výpisy z účtu.
        </p>
        {!processing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Soubory s podklady
              </label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                  aria-label="Vybrat soubory"
                />
                <button
                  type="button"
                  onClick={triggerBrowse}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FileUp className="w-4 h-4" />
                  Vybrat soubory
                </button>
                {selectedFiles.length > 0 && (
                  <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    {selectedFiles.length} souborů vybráno
                  </span>
                )}
              </div>
              {selectedFiles.length > 0 && (
                <ul className="mt-3 space-y-1.5 max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2">
                  {selectedFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 text-sm text-gray-700 dark:text-gray-200 py-1"
                    >
                      <span className="min-w-0 truncate" title={file.name}>
                        {file.name}
                        <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
                          ({getFileTypeLabel(inferFileType(file))})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0 text-red-600 hover:text-red-700 text-xs font-medium"
                      >
                        Odebrat
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Lze vybrat více souborů najednou (OP přední/zadní, daňové přiznání, výpisy z účtu). Formáty: obrázek nebo PDF.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1 text-blue-900 dark:text-blue-100">Co se stane po nahrání?</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Systém automaticky vytáhne data z občanského průkazu</li>
                <li>Data z daňového přiznání a výpisů budou zpracována</li>
                <li>Spolužadatel bude přidán k případu</li>
              </ul>
            </div>
            {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Vytahujeme data z dokumentů...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Zpracováváme dokumenty a extrahujeme údaje</p>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{progress}%</p>
          </div>
        )}
      </div>
      {!processing && (
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={handleUploadAndAdd}
            disabled={selectedFiles.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Nahrát a přidat
          </button>
        </div>
      )}
    </SimpleModal>
  );
}
