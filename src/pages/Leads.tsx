import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Plus, Copy, Send, Search, Pencil } from 'lucide-react';
import { getLeads, regenerateLeadLink, sendLeadLink, createLeadIntake, type Lead } from '../lib/api';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Koncept',
  SENT: 'Odesláno',
  OPENED: 'Otevřeno',
  IN_PROGRESS: 'Rozpracováno',
  SUBMITTED: 'Odesláno klientem',
  CONVERTED: 'Převedeno na případ',
  EXPIRED: 'Vypršelo',
  DISQUALIFIED: 'Vyřazeno',
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Koupě',
  REFINANCE: 'Refinancování',
  NON_PURPOSE: 'Jiný účel',
};

const SOURCE_LABELS: Record<string, string> = {
  OWN: 'Vlastní',
  REFERRER: 'Tipař',
  MARKETPLACE: 'Marketplace',
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function displayContact(lead: Lead) {
  if (lead.email && lead.phone) return `${lead.email} / ${lead.phone}`;
  return lead.email ?? lead.phone ?? '—';
}

function displayName(lead: Lead) {
  const a = lead.firstName?.charAt(0) ?? '';
  const b = lead.lastName?.charAt(0) ?? '';
  return `${lead.firstName} ${lead.lastName}`.trim() || `Lead ${a}${b}`.toUpperCase() || '—';
}

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [copyId, setCopyId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getLeads({ q: q || undefined, status: statusFilter || undefined, loanType: loanTypeFilter || undefined, source: sourceFilter || undefined })
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, loanTypeFilter, sourceFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const handleCopyLink = async (lead: Lead) => {
    if (copyId === lead.id) return;
    try {
      const { intakeLink } = await regenerateLeadLink(lead.id);
      await navigator.clipboard.writeText(intakeLink);
      setCopyId(lead.id);
      setTimeout(() => setCopyId(null), 2000);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nepodařilo se zkopírovat odkaz.');
    }
  };

  const handleProcessLead = async (lead: Lead) => {
    if (processingId === lead.id) return;
    if (!lead.email && !lead.phone) {
      alert('U leadu chybí e-mail i telefon. Nejprve lead upravte a doplňte kontakt.');
      return;
    }
    if (
      !window.confirm(
        'Klient byl kontaktován a chci vygenerovat odkaz na nahrání podkladů. Pokračovat?'
      )
    ) {
      return;
    }
    setProcessingId(lead.id);
    try {
      const res = await createLeadIntake(lead.id);
      await navigator.clipboard.writeText(res.intakeLink);
      load();
      alert(
        'Odkaz byl vygenerován a zkopírován do schránky. Nyní můžete odkaz poslat klientovi tlačítkem pro odeslání.'
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Vygenerování odkazu se nepodařilo.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendLink = async (lead: Lead) => {
    if (sendingId === lead.id) return;
    const channels: ('sms' | 'email')[] = [];
    if (lead.phone) channels.push('sms');
    if (lead.email) channels.push('email');
    if (channels.length === 0) {
      alert('U leadu chybí e-mail i telefon.');
      return;
    }
    setSendingId(lead.id);
    try {
      await sendLeadLink(lead.id, channels);
      load();
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
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Leady</h1>
            <p className="text-gray-600">Obchodní příležitosti a odkaz pro nahrání podkladů</p>
          </div>
          <Link
            to="/leads/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nový lead
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-md">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Hledat (jméno, kontakt…)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Hledat"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Hledat
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Stav"
          >
            <option value="">Všechny stavy</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={loanTypeFilter}
            onChange={(e) => setLoanTypeFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Typ úvěru"
          >
            <option value="">Všechny typy</option>
            {Object.entries(LOAN_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Zdroj"
          >
            <option value="">Všechny zdroje</option>
            {Object.entries(SOURCE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Načítání leadů…</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">Jméno</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Kontakt</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Typ úvěru</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Zdroj</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Stav</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Vytvořeno</th>
                    <th className="px-4 py-3 font-medium text-gray-700 w-32">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.map((lead) => {
                    const hasIntake = !!lead.intakeSession;
                    const canSend = hasIntake && (lead.status === 'DRAFT' || lead.status === 'SENT') && (lead.email || lead.phone);
                    const isConceptWithoutIntake = lead.status === 'DRAFT' && !hasIntake;
                    const isCopying = copyId === lead.id;
                    const isSending = sendingId === lead.id;
                    const isProcessing = processingId === lead.id;
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{displayName(lead)}</td>
                        <td className="px-4 py-3 text-gray-600">{displayContact(lead)}</td>
                        <td className="px-4 py-3 text-gray-600">{LOAN_TYPE_LABELS[lead.loanType] ?? lead.loanType}</td>
                        <td className="px-4 py-3 text-gray-600">{SOURCE_LABELS[lead.source] ?? lead.source}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            {STATUS_LABELS[lead.status] ?? lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(lead.createdAt)}</td>
                        <td className="px-4 py-3 flex flex-wrap gap-2 items-center">
                          <Link
                            to={`/leads/${lead.id}/edit`}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                            title="Upravit lead"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          {isConceptWithoutIntake ? (
                            <button
                              type="button"
                              onClick={() => handleProcessLead(lead)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                              title="Zpracovat lead a odeslat link na podklady"
                            >
                              {isProcessing ? 'Generuji…' : 'Zpracovat lead'}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(lead)}
                                disabled={lead.status === 'SUBMITTED' || lead.status === 'CONVERTED' || lead.status === 'EXPIRED'}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-50"
                                title="Regenerovat a zkopírovat odkaz"
                              >
                                {isCopying ? 'Zkopírováno' : <Copy className="w-4 h-4" />}
                              </button>
                              {canSend && (
                                <button
                                  type="button"
                                  onClick={() => handleSendLink(lead)}
                                  disabled={isSending}
                                  className="p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-50"
                                  title="Poslat link (SMS / e-mail)"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                          {lead.convertedCaseId && (
                            <Link
                              to={`/case/${lead.convertedCaseId}`}
                              className="text-sm text-blue-600 hover:underline"
                              title="Otevřít případ"
                            >
                              Případ
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {leads.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Žádné leady. Vytvořte první lead tlačítkem Nový lead.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
