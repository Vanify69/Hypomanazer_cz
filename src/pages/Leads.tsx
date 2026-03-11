import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Plus, Copy, Send, Search, Pencil, Trash2, ArchiveRestore } from 'lucide-react';
import { getLeads, regenerateLeadLink, sendLeadLink, createLeadIntake, deleteLead, restoreLead, deleteLeadPermanently, type Lead } from '../lib/api';

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
  const [showTrash, setShowTrash] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [permanentDeletingId, setPermanentDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getLeads({ q: q || undefined, status: statusFilter || undefined, loanType: loanTypeFilter || undefined, source: sourceFilter || undefined, deleted: showTrash })
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, loanTypeFilter, sourceFilter, showTrash]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const handleCopyLink = async (lead: Lead) => {
    if (copyId === lead.id) return;
    try {
      let link: string;
      if (lead.intakeSession?.intakeLink) {
        link = lead.intakeSession.intakeLink;
      } else if (!lead.intakeSession) {
        const res = await createLeadIntake(lead.id);
        link = res.intakeLink;
        load();
      } else {
        const res = await regenerateLeadLink(lead.id);
        link = res.intakeLink;
        load();
      }
      await navigator.clipboard.writeText(link);
      setCopyId(lead.id);
      setTimeout(() => setCopyId(null), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nepodařilo se zkopírovat odkaz.';
      if (msg.includes('nelze vygenerovat') || msg.includes('intake byl odeslán')) {
        alert('U tohoto leadu není odkaz uložen (starší záznam). Odkaz byl již odeslán klientovi – zkontrolujte e-mail nebo SMS. Od nových leadů bude odkaz k dispozici ke zkopírování.');
      } else {
        alert(msg);
      }
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

  const handleDelete = async (lead: Lead) => {
    if (!window.confirm(`Opravdu chcete smazat lead „${displayName(lead)}“? Přesune se do koše a budete ho moci později obnovit.`)) return;
    setDeletingId(lead.id);
    try {
      await deleteLead(lead.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Smazání se nepodařilo.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestore = async (lead: Lead) => {
    setRestoringId(lead.id);
    try {
      await restoreLead(lead.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Obnovení se nepodařilo.');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (lead: Lead) => {
    if (!window.confirm(`Trvale odstranit lead „${displayName(lead)}“? Tuto akci nelze vrátit zpět.`)) return;
    setPermanentDeletingId(lead.id);
    try {
      await deleteLeadPermanently(lead.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Trvalé odstranění se nepodařilo.');
    } finally {
      setPermanentDeletingId(null);
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
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">Leady</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Obchodní příležitosti a odkaz pro nahrání podkladů</p>
          </div>
          <Link
            to="/leads/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shrink-0"
          >
            <Plus className="w-5 h-5" />
            Nový lead
          </Link>
        </div>

        <div className="mb-4 flex items-center gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setShowTrash(false)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${!showTrash ? 'bg-white border border-b-0 border-gray-200 text-gray-900 -mb-px' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Aktivní leady
          </button>
          <button
            type="button"
            onClick={() => setShowTrash(true)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${showTrash ? 'bg-white border border-b-0 border-gray-200 text-gray-900 -mb-px' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Koš
          </button>
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
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Načítání leadů…</div>
        ) : (
          <>
            {/* Mobilní/tablet: karty */}
            <div className="md:hidden space-y-3">
              {leads.map((lead) => {
                const hasIntake = !!lead.intakeSession;
                const canSend = hasIntake && (lead.status === 'DRAFT' || lead.status === 'SENT') && (lead.email || lead.phone);
                const isConceptWithoutIntake = lead.status === 'DRAFT' && !hasIntake;
                const isCopying = copyId === lead.id;
                const isSending = sendingId === lead.id;
                const isProcessing = processingId === lead.id;
                return (
                  <div
                    key={lead.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{displayName(lead)}</h3>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 shrink-0">
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">{displayContact(lead)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                      {LOAN_TYPE_LABELS[lead.loanType] ?? lead.loanType} · {SOURCE_LABELS[lead.source] ?? lead.source} · {formatDate(lead.createdAt)}
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Link
                        to={`/leads/${lead.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 min-h-[44px]"
                      >
                        <Pencil className="w-4 h-4" />
                        Upravit
                      </Link>
                      {showTrash ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRestore(lead)}
                            disabled={restoringId === lead.id || permanentDeletingId === lead.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 min-h-[44px]"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                            {restoringId === lead.id ? 'Obnovuji…' : 'Obnovit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(lead)}
                            disabled={restoringId === lead.id || permanentDeletingId === lead.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 min-h-[44px]"
                          >
                            <Trash2 className="w-4 h-4" />
                            Trvale smazat
                          </button>
                        </>
                      ) : (
                        <>
                          {isConceptWithoutIntake ? (
                            <button
                              type="button"
                              onClick={() => handleProcessLead(lead)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 min-h-[44px]"
                            >
                              {isProcessing ? 'Generuji…' : 'Zpracovat lead'}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(lead)}
                                disabled={lead.status === 'SUBMITTED' || lead.status === 'CONVERTED' || lead.status === 'EXPIRED'}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 min-h-[44px]"
                              >
                                {isCopying ? 'Zkopírováno' : <><Copy className="w-4 h-4" /> Kopírovat</>}
                              </button>
                              {canSend && (
                                <button
                                  type="button"
                                  onClick={() => handleSendLink(lead)}
                                  disabled={isSending}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 min-h-[44px]"
                                >
                                  <Send className="w-4 h-4" />
                                  Poslat
                                </button>
                              )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(lead)}
                            disabled={deletingId === lead.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 min-h-[44px]"
                          >
                            <Trash2 className="w-4 h-4" />
                            Smazat
                          </button>
                          {lead.convertedCaseId && (
                            <Link
                              to={`/case/${lead.convertedCaseId}`}
                              className="inline-flex items-center px-3 py-2 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline min-h-[44px]"
                            >
                              Otevřít případ
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {leads.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  {showTrash ? 'Koš je prázdný.' : 'Žádné leady. Vytvořte první lead tlačítkem Nový lead.'}
                </div>
              )}
            </div>

            {/* Desktop: tabulka */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Jméno</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Kontakt</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Typ úvěru</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Zdroj</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Stav</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Vytvořeno</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 w-32">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {leads.map((lead) => {
                    const hasIntake = !!lead.intakeSession;
                    const canSend = hasIntake && (lead.status === 'DRAFT' || lead.status === 'SENT') && (lead.email || lead.phone);
                    const isConceptWithoutIntake = lead.status === 'DRAFT' && !hasIntake;
                    const isCopying = copyId === lead.id;
                    const isSending = sendingId === lead.id;
                    const isProcessing = processingId === lead.id;
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{displayName(lead)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{displayContact(lead)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{LOAN_TYPE_LABELS[lead.loanType] ?? lead.loanType}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{SOURCE_LABELS[lead.source] ?? lead.source}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {STATUS_LABELS[lead.status] ?? lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(lead.createdAt)}</td>
                        <td className="px-4 py-3 flex flex-wrap gap-2 items-center">
                          {showTrash ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRestore(lead)}
                                disabled={restoringId === lead.id || permanentDeletingId === lead.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
                                title="Obnovit lead z koše"
                              >
                                <ArchiveRestore className="w-4 h-4" />
                                {restoringId === lead.id ? 'Obnovuji…' : 'Obnovit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePermanentDelete(lead)}
                                disabled={restoringId === lead.id || permanentDeletingId === lead.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                                title="Trvale odstranit lead"
                              >
                                <Trash2 className="w-4 h-4" />
                                {permanentDeletingId === lead.id ? 'Odstraňuji…' : 'Trvale odstranit'}
                              </button>
                            </>
                          ) : (
                            <>
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
                                    title="Zkopírovat odkaz"
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
                              <button
                                type="button"
                                onClick={() => handleDelete(lead)}
                                disabled={deletingId === lead.id}
                                className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded disabled:opacity-50"
                                title="Smazat lead (přesunout do koše)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {lead.convertedCaseId && (
                                <Link
                                  to={`/case/${lead.convertedCaseId}`}
                                  className="text-sm text-blue-600 hover:underline"
                                  title="Otevřít případ"
                                >
                                  Případ
                                </Link>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {leads.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {showTrash ? 'Koš je prázdný.' : 'Žádné leady. Vytvořte první lead tlačítkem Nový lead.'}
              </div>
            )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
