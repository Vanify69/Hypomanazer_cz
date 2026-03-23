import { useCallback, useEffect, useState } from 'react';
import { Calculator, Download, RefreshCw } from 'lucide-react';
import type { BankCode, BankSummaryRowDto } from '../../lib/bankCalculatorsApi';
import {
  fetchCaseBankSummary,
  runBankCalculations,
  downloadBankRunFile,
  calculationStatusLabel,
} from '../../lib/bankCalculatorsApi';

function formatMoney(n?: number): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatRatio(n?: number): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(1)} %`;
}

export function CaseBankCalculatorsPanel({ caseId }: { caseId: string }) {
  const [rows, setRows] = useState<BankSummaryRowDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyBank, setBusyBank] = useState<BankCode | 'ALL' | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchCaseBankSummary(caseId);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Načtení se nezdařilo.');
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runOne = async (code: BankCode) => {
    setBusyBank(code);
    setError(null);
    try {
      await runBankCalculations(caseId, code);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Přepočet selhal.');
    } finally {
      setBusyBank(null);
    }
  };

  const runAll = async () => {
    setBusyBank('ALL');
    setError(null);
    try {
      await runBankCalculations(caseId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Přepočet selhal.');
    } finally {
      setBusyBank(null);
    }
  };

  const download = async (runId: string, bankLabel: string) => {
    try {
      await downloadBankRunFile(runId, `${bankLabel.replace(/\s+/g, '_')}_vypocet`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stažení selhalo.');
    }
  };

  if (loading && !rows) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        Načítání bankovních kalkulaček…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <h2 className="text-lg font-semibold">Bankovní kalkulačky</h2>
        </div>
        <button
          type="button"
          onClick={() => void runAll()}
          disabled={busyBank !== null}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${busyBank === 'ALL' ? 'animate-spin' : ''}`} />
          Přepočítat všechny banky
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/80 text-left text-gray-700 dark:text-gray-300">
              <th className="py-3 px-3 font-medium">Banka</th>
              <th className="py-3 px-3 font-medium">Stav</th>
              <th className="py-3 px-3 font-medium text-right">Max. úvěr</th>
              <th className="py-3 px-3 font-medium text-right">Splátka</th>
              <th className="py-3 px-3 font-medium text-right">DSTI</th>
              <th className="py-3 px-3 font-medium text-right">DTI</th>
              <th className="py-3 px-3 font-medium text-right">PDSTI</th>
              <th className="py-3 px-3 font-medium">Výsledek</th>
              <th className="py-3 px-3 font-medium text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((row) => {
              const run = row.lastRun;
              const canDownload =
                run &&
                (run.status === 'MOCK' || run.status === 'SUCCESS') &&
                !row.missingTemplateMessage;
              const statusText = row.missingTemplateMessage
                ? row.missingTemplateMessage
                : run
                  ? calculationStatusLabel(run.status)
                  : 'Ještě nepřepočítáno';
              return (
                <tr
                  key={row.bankCode}
                  className="border-t border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <td className="py-3 px-3 font-medium">{row.bankLabel}</td>
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-400 max-w-[14rem]">
                    {statusText}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {row.missingTemplateMessage ? '—' : formatMoney(run?.maxLoanAmount)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {row.missingTemplateMessage ? '—' : formatMoney(run?.monthlyPayment)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {row.missingTemplateMessage ? '—' : formatRatio(run?.dsti)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {row.missingTemplateMessage ? '—' : formatRatio(run?.dti)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {row.missingTemplateMessage ? '—' : formatRatio(run?.pdsti)}
                  </td>
                  <td className="py-3 px-3">
                    {row.missingTemplateMessage
                      ? '—'
                      : run?.outcomeLabel ?? run?.passFail ?? '—'}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => void runOne(row.bankCode)}
                      disabled={busyBank !== null}
                      className="inline-flex items-center gap-1 px-2 py-1 mr-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${busyBank === row.bankCode ? 'animate-spin' : ''}`}
                      />
                      Přepočítat
                    </button>
                    <button
                      type="button"
                      onClick={() => run && void download(run.runId, row.bankLabel)}
                      disabled={!canDownload || busyBank !== null}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Excel
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Výpočty používají vaše šablony z Nastavení. Bez nahraného .xlsm se příslušná banka nezpracuje.
        Aktuálně může běžet mock výstup – skutečný přepočet Excelu doplníme později.
      </p>
    </div>
  );
}
