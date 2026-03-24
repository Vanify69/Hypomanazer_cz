import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { apiRequest } from '../lib/api';

const LOAN_LABELS: Record<string, string> = {
  PURCHASE: 'Koupě',
  REFINANCE: 'Refinancování',
  NON_PURPOSE: 'Jiný účel',
};

const VISIBLE_LABELS: Record<string, string> = {
  RECEIVED: 'Přijato',
  CONTACTED: 'Kontaktováno',
  DOCUMENTS_IN: 'Podklady doručeny',
  IN_BANK: 'U banky',
  APPROVED: 'Schváleno',
  SIGNED: 'Podepsáno',
  CLOSED_WON: 'Uzavřeno (úspěch)',
  CLOSED_LOST: 'Uzavřeno (neúspěch)',
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

interface LeadRow {
  id: string;
  loanType: string;
  status: string;
  visibleStatus: string;
  updatedAt: string;
  convertedCaseId?: string;
}

export function ReferrerLeads() {
  const { id } = useParams<{ id: string }>();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [referrerName, setReferrerName] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiRequest<{ displayName: string }>(`/api/referrers/${id}`).then((r) => setReferrerName(r.displayName)).catch(() => {}),
      apiRequest<LeadRow[]>(`/api/referrers/${id}/leads`).then(setLeads).catch(() => setLeads([])),
    ]).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="flex-1 bg-gray-50 app-content-dark overflow-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <Link to="/referrers" className="inline-flex text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-6">
          ← Zpět na tipaře
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Leady od tipaře{referrerName ? `: ${referrerName}` : ''}</h1>
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Načítání…</p>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Lead ID</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Typ úvěru</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Stav (pro tipaře)</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Poslední změna</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Případ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-sm">{l.id.slice(-8)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{LOAN_LABELS[l.loanType] ?? l.loanType}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {VISIBLE_LABELS[l.visibleStatus] ?? l.visibleStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(l.updatedAt)}</td>
                    <td className="px-4 py-3">
                      {l.convertedCaseId ? (
                        <Link to={`/case/${l.convertedCaseId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          Otevřít případ
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">Žádné leady od tohoto tipaře.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
