import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Plus, Copy, Send, Pencil } from 'lucide-react';
import { getReferrers, sendReferrerLink, regenerateReferrerLink, type Referrer } from '../lib/api';

const TYPE_LABELS: Record<string, string> = {
  ALLIANZ: 'Allianz',
  REAL_ESTATE: 'Realitní kancelář',
  DEVELOPER: 'Developer',
  INTERNAL: 'Interní',
  OTHER: 'Jiné',
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function displayContact(r: Referrer) {
  if (r.email && r.phone) return `${r.email} / ${r.phone}`;
  return r.email ?? r.phone ?? '—';
}

export function Referrers() {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getReferrers({ q: q || undefined, type: typeFilter || undefined })
      .then(setReferrers)
      .catch(() => setReferrers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const handleCopyLink = async (r: Referrer) => {
    if (copyId === r.id) return;
    try {
      const { referrerLink } = await regenerateReferrerLink(r.id);
      await navigator.clipboard.writeText(referrerLink);
      setCopyId(r.id);
      setTimeout(() => setCopyId(null), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nepodařilo se zkopírovat odkaz.');
    }
  };

  const handleSendLink = async (r: Referrer) => {
    if (sendingId === r.id) return;
    const channels: ('sms' | 'email')[] = [];
    if (r.phone) channels.push('sms');
    if (r.email) channels.push('email');
    if (channels.length === 0) {
      alert('U tipaře chybí e-mail i telefon.');
      return;
    }
    setSendingId(r.id);
    try {
      await sendReferrerLink(r.id, channels);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Odeslání se nepodařilo.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Tipaři</h1>
            <p className="text-gray-600">Partneři, kteří vám přivádějí leady</p>
          </div>
          <Link
            to="/referrers/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nový tipař
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-md">
            <input
              type="text"
              placeholder="Hledat (název, kontakt…)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Hledat
            </button>
          </form>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Typ tipaře"
          >
            <option value="">Všechny typy</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Načítání tipařů…</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">Název / jméno</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Typ</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Reg. číslo</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Kontakt</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Počet leadů</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Vytvořeno</th>
                    <th className="px-4 py-3 font-medium text-gray-700 w-32">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {referrers.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{r.displayName}</td>
                      <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[r.type] ?? r.type}</td>
                      <td className="px-4 py-3 text-gray-600">{r.registrationNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{displayContact(r)}</td>
                      <td className="px-4 py-3 text-gray-600">{r.leadCount ?? 0}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3 flex flex-wrap gap-2 items-center">
                        <Link
                          to={`/referrers/${r.id}/edit`}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                          title="Upravit tipaře"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(r)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                          title="Regenerovat a zkopírovat tipařský odkaz"
                        >
                          {copyId === r.id ? 'Zkopírováno' : <Copy className="w-4 h-4" />}
                        </button>
                        <Link
                          to={`/referrers/${r.id}/leads`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Leady
                        </Link>
                        {(r.email || r.phone) && (
                          <button
                            type="button"
                            onClick={() => handleSendLink(r)}
                            disabled={sendingId === r.id}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-50"
                            title="Poslat tipařský link"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {referrers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Žádní tipaři. Přidejte prvního tlačítkem Nový tipař.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
