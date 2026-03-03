'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Upload, FolderOpen } from 'lucide-react';
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

export interface AddCoApplicantModalProps {
  open: boolean;
  onClose: () => void;
  applicant: Applicant;
  caseId: string;
  onUploadComplete: (updatedCase: Case) => void;
}

/**
 * Modal pro přidání spolužadatele – výběr složky, nahrání OP/DP/výpisů.
 * Používá SimpleModal (bez Radix), aby se okno vždy zobrazilo.
 */
export function AddCoApplicantModal({
  open,
  onClose,
  applicant,
  caseId,
  onUploadComplete,
}: AddCoApplicantModalProps) {
  console.log('[AddCoApplicantModal] render', { open, applicantId: applicant.id });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderLabel, setFolderLabel] = useState<string>('Nevybrána žádná složka');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const el = fileInputRef.current;
    if (el && open) {
      el.setAttribute('webkitdirectory', '');
      el.setAttribute('directory', '');
    }
    return () => {
      if (el) {
        el.removeAttribute('webkitdirectory');
        el.removeAttribute('directory');
      }
    };
  }, [open]);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    setSelectedFiles(list);
    const first = list[0] as File & { webkitRelativePath?: string };
    const path = first.webkitRelativePath
      ? first.webkitRelativePath.split('/').slice(0, -1).join('/')
      : list.length === 1
        ? first.name
        : null;
    setFolderLabel(path || `${list.length} souborů vybráno`);
    setUploadError(null);
    e.target.value = '';
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleUploadAndAdd = async () => {
    if (!selectedFiles.length) {
      setUploadError('Vyberte složku s dokumenty.');
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
    setFolderLabel('Nevybrána žádná složka');
    setProgress(0);
    setUploadError(null);
    onClose();
  };

  return (
    <SimpleModal open={open} onClose={handleClose} title="Přidat spolužadatele">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Vyberte složku s podklady spolužadatele (OP, daňové přiznání, výpisy z účtu).
        </p>
        {!processing ? (
          <>
            <div>
              <label htmlFor="folder-display" className="block text-sm font-medium text-gray-700 mb-2">
                Složka s podklady
              </label>
              <div className="flex gap-2">
                <input
                  id="folder-display"
                  type="text"
                  readOnly
                  value={folderLabel}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  placeholder="Nevybrána žádná složka"
                />
                <button
                  type="button"
                  onClick={triggerBrowse}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <FolderOpen className="w-4 h-4" />
                  Procházet
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFolderSelect}
                aria-label="Vybrat složku s podklady"
              />
              <p className="text-xs text-gray-500 mt-2">
                Složka by měla obsahovat: OP (přední a zadní strana), daňové přiznání nebo výpisy z účtu.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-800">
              <p className="font-semibold mb-1">Co se stane po nahrání?</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Systém automaticky vytáhne data z občanského průkazu</li>
                <li>Data z daňového přiznání a výpisů budou zpracována</li>
                <li>Spolužadatel bude přidán k případu</li>
              </ul>
            </div>
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-1">Vytahujeme data z dokumentů...</p>
            <p className="text-sm text-gray-500 mb-4">Zpracováváme dokumenty a extrahujeme údaje</p>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm font-medium text-gray-700">{progress}%</p>
          </div>
        )}
      </div>
      {!processing && (
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
