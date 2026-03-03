import React, { useRef, useState, useEffect } from 'react';
import { Upload, FolderOpen } from 'lucide-react';
import type { Applicant } from '../../lib/types';
import { uploadCaseFile } from '../../lib/storage';
import type { Case } from '../../lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';

type FileType = 'op-predni' | 'op-zadni' | 'danove' | 'vypisy';

function inferFileType(file: File): FileType {
  const name = (file.name || '').toLowerCase();
  if (/predni|front|op_|op-/.test(name) && !/zadni|back/.test(name)) return 'op-predni';
  if (/zadni|back/.test(name)) return 'op-zadni';
  if (/danov|dp|priznani|dap/.test(name)) return 'danove';
  return 'vypisy';
}

interface ApplicantUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  caseId: string;
  onUploadComplete: (updatedCase: Case) => void;
}

export function ApplicantUploadModal({
  isOpen,
  onClose,
  applicant,
  caseId,
  onUploadComplete,
}: ApplicantUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderLabel, setFolderLabel] = useState<string>('Nevybrána žádná složka');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<FileType | null>(null);

  const isNewCoApplicant = applicant.role === 'spoluzadatel' && !applicant.extractedData?.jmeno;

  useEffect(() => {
    const el = fileInputRef.current;
    if (el && isOpen && isNewCoApplicant) {
      el.setAttribute('webkitdirectory', '');
    }
    return () => {
      if (el) el.removeAttribute('webkitdirectory');
    };
  }, [isOpen, isNewCoApplicant]);

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
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Nahrání se nezdařilo.');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setSelectedFiles([]);
      setFolderLabel('Nevybrána žádná složka');
      setProgress(0);
      setUploadError(null);
      onClose();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !processing) handleClose();
  };

  const FILE_TYPE_LABELS: Record<FileType, string> = {
    'op-predni': 'OP – přední strana',
    'op-zadni': 'OP – zadní strana',
    'danove': 'Daňové přiznání',
    'vypisy': 'Výpisy z účtu',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = (e.target.dataset.fileType as FileType) ?? 'vypisy';
    if (!file) return;
    setUploadingType(type);
    try {
      const updated = await uploadCaseFile(caseId, file, type, applicant.id);
      onUploadComplete(updated);
    } finally {
      setUploadingType(null);
      e.target.value = '';
    }
  };

  const triggerFileInput = (type: FileType) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.dataset.fileType = type;
    fileInputRef.current.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg z-[100]"
        onPointerDownOutside={(e) => processing && e.preventDefault()}
        onInteractOutside={(e) => processing && e.preventDefault()}
      >
        {isNewCoApplicant ? (
          <>
            <DialogHeader>
              <DialogTitle>Přidat spolužadatele</DialogTitle>
              <DialogDescription>
                Vyberte složku s podklady spolužadatele (OP, daňové přiznání, výpisy z účtu)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
                      Složka by měla obsahovat: OP (přední a zadní strana), daňové přiznání nebo výpisy z účtu
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">Co se stane po nahrání?</h3>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
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
                  <p className="text-base font-medium text-gray-900 mb-1">Vytahujeme data z dokumentů...</p>
                  <p className="text-sm text-gray-500 mb-4">Zpracováváme dokumenty a extrahujeme údaje</p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{progress}%</p>
                </div>
              )}
            </div>
            {!processing && (
              <DialogFooter className="gap-2 sm:gap-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Zrušit
                </button>
                <button
                  type="button"
                  onClick={handleUploadAndAdd}
                  disabled={selectedFiles.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Nahrát a přidat
                </button>
              </DialogFooter>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                Nahrát dokumenty – {applicant.role === 'hlavni' ? 'Hlavní žadatel' : `Spolužadatel ${applicant.order - 1}`}
              </DialogTitle>
              <DialogDescription>
                Vyberte typ dokumentu a nahrajte soubor. Data budou přiřazena tomuto žadateli.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,.gif,.bmp,.webp"
                className="hidden"
                onChange={handleFileSelect}
                aria-label="Nahrát dokument"
              />
              <div className="flex flex-wrap gap-2">
                {(['op-predni', 'op-zadni', 'danove', 'vypisy'] as const).map((ft) => (
                  <button
                    key={ft}
                    type="button"
                    disabled={!!uploadingType}
                    onClick={() => triggerFileInput(ft)}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {uploadingType === ft ? (
                      <span className="animate-pulse">Nahrávám…</span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {FILE_TYPE_LABELS[ft]}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
