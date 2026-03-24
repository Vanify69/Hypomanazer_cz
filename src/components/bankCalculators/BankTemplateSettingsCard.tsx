import { useEffect, useRef, useState } from 'react';
import type { BankCode, BankTemplateDto } from '../../lib/bankCalculatorsApi';
import {
  fetchBankTemplates,
  uploadBankTemplate,
  validateBankTemplate,
  mappingStatusLabel,
} from '../../lib/bankCalculatorsApi';

const BANK_META: Record<BankCode, { title: string }> = {
  RB: { title: 'Raiffeisenbank (RB)' },
  UCB: { title: 'UniCredit Bank (UCB)' },
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('cs-CZ', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function BankTemplateSettingsCard({
  bankCode,
  templates,
  onTemplatesChange,
}: {
  bankCode: BankCode;
  templates: BankTemplateDto[] | null;
  onTemplatesChange: (list: BankTemplateDto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tpl = templates?.find((t) => t.bankCode === bankCode);
  const loading = templates === null;

  const openPicker = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const updated = await uploadBankTemplate(bankCode, file);
      onTemplatesChange(
        templates
          ? [...templates.filter((t) => t.bankCode !== bankCode), updated]
          : [updated]
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Nahrání selhalo.');
    } finally {
      setBusy(false);
    }
  };

  const onTest = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await validateBankTemplate(bankCode);
      setMessage(r.message);
      const list = await fetchBankTemplates();
      onTemplatesChange(list);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Test selhal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800/50">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {BANK_META[bankCode].title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Nahrajte vlastní soubor .xlsm nebo .xlsx (žádný sdílený default – pouze váš účet).
          </p>
          {loading ? (
            <p className="text-sm text-gray-500 mt-2">Načítání…</p>
          ) : tpl ? (
            <ul className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>
                <span className="text-gray-500">Soubor:</span>{' '}
                <span className="font-mono text-xs break-all">{tpl.originalFileName}</span>
              </li>
              <li>
                <span className="text-gray-500">Nahráno:</span> {formatDate(tpl.createdAt)}
              </li>
              <li>
                <span className="text-gray-500">Stav mapování:</span>{' '}
                <span className="font-medium">{mappingStatusLabel(tpl.mappingStatus)}</span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
              Zatím není nahraná šablona.
            </p>
          )}
          {message && (
            <p className="text-sm mt-2 text-gray-700 dark:text-gray-300" role="status">
              {message}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsm,.xlsx,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onFile}
          />
          <button
            type="button"
            onClick={openPicker}
            disabled={busy || loading}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {tpl ? 'Změnit šablonu' : 'Nahrát šablonu'}
          </button>
          <button
            type="button"
            onClick={() => void onTest()}
            disabled={busy || !tpl || loading}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Otestovat šablonu
          </button>
        </div>
      </div>
    </div>
  );
}

export function BankCalculatorsSettingsSection() {
  const [templates, setTemplates] = useState<BankTemplateDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoadError(null);
    setTemplates(null);
    void (async () => {
      try {
        const list = await fetchBankTemplates();
        if (alive) setTemplates(list);
      } catch (e) {
        if (alive) {
          setLoadError(e instanceof Error ? e.message : 'Nepodařilo se načíst šablony.');
          setTemplates([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      {loadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      )}
      <BankTemplateSettingsCard
        bankCode="RB"
        templates={templates}
        onTemplatesChange={setTemplates}
      />
      <BankTemplateSettingsCard
        bankCode="UCB"
        templates={templates}
        onTemplatesChange={setTemplates}
      />
    </div>
  );
}
