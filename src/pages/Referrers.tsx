import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Plus, Copy, Send, Pencil, ExternalLink, Ban, ArchiveRestore, Trash2 } from 'lucide-react';
import {
  getReferrers,
  sendReferrerLink,
  regenerateReferrerLink,
  blockReferrer,
  unblockReferrer,
  destroyReferrerPermanently,
  type Referrer,
} from '../lib/api';

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
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [destroyTarget, setDestroyTarget] = useState<Referrer | null>(null);
  const [destroyPending, setDestroyPending] = useState(false);
  const mountedRef = React.useRef(true);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    getReferrers({ q: q || undefined, type: typeFilter || undefined, blocked: showBlocked })
      .then((data) => {
        if (!mountedRef.current) return;
        setReferrers(Array.isArray(data) ? data : []);
        setLoadError(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setLoadError(true);
        setReferrers((prev) => prev.length ? prev : []);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => {
    load();
  }, [typeFilter, showBlocked]);

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

  const handleBlock = async (r: Referrer) => {
    if (
      !window.confirm(
        `Přesunout tipaře „${r.displayName}“ do blokace?\n\nLeady zůstanou v systému. Veřejný odkaz pro tipaře přestane fungovat, dokud tipaře znovu neobnovíte.`
      )
    ) {
      return;
    }
    setBlockingId(r.id);
    try {
      await blockReferrer(r.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Přesun do blokace se nepodařil.');
    } finally {
      setBlockingId(null);
    }
  };

  const handleUnblock = async (r: Referrer) => {
    setUnblockingId(r.id);
    try {
      await unblockReferrer(r.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Obnovení se nepodařilo.');
    } finally {
      setUnblockingId(null);
    }
  };

  const runDestroy = async (deleteLeads: boolean) => {
    if (!destroyTarget) return;
    setDestroyPending(true);
    try {
      await destroyReferrerPermanently(destroyTarget.id, { deleteLeads });
      setDestroyTarget(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Trvalé smazání se nepodařilo.');
    } finally {
      setDestroyPending(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 app-content-dark overflow-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">Tipaři</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Partneři, kteří vám přivádějí leady</p>
          </div>
          {!showBlocked && (
            <Link
              to="/referrers/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shrink-0"
            >
              <Plus className="w-5 h-5" />
              Nový tipař
            </Link>
          )}
        </div>

        <div className="mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setShowBlocked(false)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${!showBlocked ? 'bg-white dark:bg-gray-800 border border-b-0 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 -mb-px' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
          >
            Aktivní tipaři
          </button>
          <button
            type="button"
            onClick={() => setShowBlocked(true)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${showBlocked ? 'bg-white dark:bg-gray-800 border border-b-0 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 -mb-px' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
          >
            Blokace
          </button>
        </div>

        <div className="agenda-filters-row mb-6 flex flex-col lg:flex-row flex-wrap gap-3 lg:gap-4 items-stretch lg:items-end">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-2 flex-1 min-w-0 w-full lg:max-w-md">
            <input
              type="text"
              placeholder="Hledat (název, kontakt…)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              aria-label="Hledat tipaře"
            />
            <button type="submit" className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 min-h-[44px] lg:min-h-0 shrink-0">
              Hledat
            </button>
          </form>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full lg:w-auto min-w-0 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            aria-label="Typ tipaře"
          >
            <option value="">Všechny typy</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {loadError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-amber-800 dark:text-amber-200 text-sm">
              Nepodařilo se načíst data. Zkontrolujte připojení a že běží backend. V DevTools (záložka Síť) vypněte režim „Offline“.
            </p>
            <button
              type="button"
              onClick={() => load()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700"
            >
              Zkusit znovu
            </button>
          </div>
        )}
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Načítání tipařů…</div>
        ) : (
          <>
            {/* Mobilní/tablet: karty (skryté od 768px) */}
            <div className="agenda-cards-only space-y-3">
              {referrers.map((r) => (
                <div
                  key={r.id}
                  className="agenda-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0 overflow-hidden"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">{r.displayName}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{TYPE_LABELS[r.type] ?? r.type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-3 truncate">{displayContact(r)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                    {r.leadCount ?? 0} leadů · {formatDate(r.createdAt)}
                  </p>
                  <div className="agenda-card-actions flex flex-wrap gap-2 items-center min-w-0">
                    {!showBlocked ? (
                      <>
                        <Link
                          to={`/referrers/${r.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 min-h-[44px]"
                        >
                          <Pencil className="w-4 h-4" />
                          Upravit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 min-h-[44px]"
                        >
                          {copyId === r.id ? 'Zkopírováno' : <><Copy className="w-4 h-4" /> Kopírovat odkaz</>}
                        </button>
                        <Link
                          to={`/referrers/${r.id}/leads`}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline min-h-[44px]"
                        >
                          Leady
                        </Link>
                        {(r.email || r.phone) && (
                          <button
                            type="button"
                            onClick={() => handleSendLink(r)}
                            disabled={sendingId === r.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 min-h-[44px]"
                          >
                            <Send className="w-4 h-4" />
                            Poslat link
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleBlock(r)}
                          disabled={blockingId === r.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 disabled:opacity-50 min-h-[44px]"
                        >
                          <Ban className="w-4 h-4" />
                          Do blokace
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUnblock(r)}
                          disabled={unblockingId === r.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 min-h-[44px]"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                          Obnovit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDestroyTarget(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4" />
                          Trvale smazat
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {referrers.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  {showBlocked ? 'V blokaci zatím nic není.' : 'Žádní tipaři. Přidejte prvního tlačítkem Nový tipař.'}
                </div>
              )}
            </div>

            {/* Desktop: tabulka (zobrazit od 768px) */}
            <div className="agenda-table-only bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Název / jméno</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Typ</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Reg. číslo</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Kontakt</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Počet leadů</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Vytvořeno</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 w-44">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {referrers.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{r.displayName}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{TYPE_LABELS[r.type] ?? r.type}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.registrationNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{displayContact(r)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.leadCount ?? 0}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {!showBlocked ? (
                          <>
                            <Link
                              to={`/referrers/${r.id}/edit`}
                              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Upravit tipaře"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(r)}
                              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Regenerovat a zkopírovat tipařský odkaz"
                            >
                              {copyId === r.id ? 'Zkopírováno' : <Copy className="w-4 h-4" />}
                            </button>
                            <Link
                              to={`/referrers/${r.id}/leads`}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                              title="Zobrazit leady tipaře"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            {(r.email || r.phone) && (
                              <button
                                type="button"
                                onClick={() => handleSendLink(r)}
                                disabled={sendingId === r.id}
                                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                                title="Poslat tipařský link"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleBlock(r)}
                              disabled={blockingId === r.id}
                              className="p-2 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded disabled:opacity-50"
                              title="Přesunout do blokace"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUnblock(r)}
                              disabled={unblockingId === r.id}
                              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                              title="Obnovit z blokace"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDestroyTarget(r)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                              title="Trvale smazat"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {referrers.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {showBlocked ? 'V blokaci zatím nic není.' : 'Žádní tipaři. Přidejte prvního tlačítkem Nový tipař.'}
              </div>
            )}
            </div>
          </>
        )}

        {destroyTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="destroy-referrer-title"
            onClick={() => !destroyPending && setDestroyTarget(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-600"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="destroy-referrer-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Trvale smazat tipaře
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                „{destroyTarget.displayName}“ – tato akce je nevratná. Zvolte, zda mají zůstat leady v systému (bez vazby na tipaře), nebo se mají smazat i všechny jeho leady ({destroyTarget.leadCount ?? 0}).
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={destroyPending}
                  onClick={() => runDestroy(false)}
                  className="w-full px-4 py-3 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Smazat jen tipaře (leady ponechat, odpojené)
                </button>
                <button
                  type="button"
                  disabled={destroyPending || (destroyTarget.leadCount ?? 0) === 0}
                  onClick={() => {
                    if (
                      (destroyTarget.leadCount ?? 0) > 0 &&
                      !window.confirm(
                        `Opravdu trvale smazat tipaře i všech ${destroyTarget.leadCount} leadů? Tuto akci nelze vrátit.`
                      )
                    ) {
                      return;
                    }
                    runDestroy(true);
                  }}
                  className="w-full px-4 py-3 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {destroyPending
                    ? 'Mažu…'
                    : (destroyTarget.leadCount ?? 0) === 0
                      ? 'Smazat tipaře (žádné leady)'
                      : `Smazat tipaře včetně ${destroyTarget.leadCount} leadů`}
                </button>
                <button
                  type="button"
                  disabled={destroyPending}
                  onClick={() => setDestroyTarget(null)}
                  className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  Zrušit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
