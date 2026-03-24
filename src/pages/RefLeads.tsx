import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { apiRequestPublic } from '../lib/api';
import { useForceLightThemeForPublicPage } from '../hooks/useForceLightThemeForPublicPage';

const LOAN_LABELS: Record<string, string> = {
  PURCHASE: 'Koupě',
  REFINANCE: 'Refinancování',
  NON_PURPOSE: 'Jiný účel',
};

const STATUS_LABELS: Record<string, string> = {
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

interface LeadItem {
  id: string;
  displayId: string;
  loanType: string;
  visibleStatus: string;
  updatedAt: string;
}

export function RefLeads() {
  useForceLightThemeForPublicPage();
  const { token } = useParams<{ token: string }>();
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Chybí odkaz.');
      setLoading(false);
      return;
    }
    apiRequestPublic<{ leads: LeadItem[] }>(`/api/ref/${token}/leads`)
      .then((d) => setLeads(d.leads ?? []))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Načtení se nepodařilo.');
        setLeads([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Načítání…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Neplatný odkaz</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Přehled vašich leadů</h1>
          <p className="text-gray-600 mb-6">Stav obchodů, které jste odeslali (bez osobních údajů).</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Lead</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Typ úvěru</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Stav</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Poslední změna</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{l.displayId}</td>
                    <td className="px-4 py-3 text-gray-600">{LOAN_LABELS[l.loanType] ?? l.loanType}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {STATUS_LABELS[l.visibleStatus] ?? l.visibleStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(l.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {leads.length === 0 && (
            <div className="text-center py-12 text-gray-500">Zatím nemáte žádné odeslané leady.</div>
          )}
          <p className="mt-6 text-sm text-gray-500">
            <Link to={`/ref/${token}`} className="text-blue-600 hover:underline">
              Zadat nový lead →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
