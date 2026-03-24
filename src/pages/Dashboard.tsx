import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router';
import { Calendar, ChevronRight, Link2, Plus, RefreshCw, Send } from 'lucide-react';
import { getCases } from '../lib/storage';
import { getCalendarEvents, getLeads, type CalendarEvent, type Lead } from '../lib/api';
import type { Case } from '../lib/types';

const WAITING_LEAD_STATUSES = new Set(['DRAFT', 'SENT', 'OPENED', 'IN_PROGRESS']);

const LEAD_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Koncept',
  SENT: 'Odesláno',
  OPENED: 'Otevřeno',
  IN_PROGRESS: 'Zpracovává se',
  SUBMITTED: 'Odesláno klientem',
  CONVERTED: 'Převedeno na případ',
  EXPIRED: 'Vypršelo',
  DISQUALIFIED: 'Vyřazeno',
};

const EVENT_TYPE_META: Record<
  CalendarEvent['type'],
  { label: string; className: string }
> = {
  call: {
    label: 'Telefonát',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-200',
  },
  meeting: {
    label: 'Schůzka',
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-200',
  },
  task: {
    label: 'Úkol',
    className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200',
  },
  reminder: {
    label: 'Připomínka',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200',
  },
};

function formatRelativeCs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return 'právě teď';
  if (min < 60) return `před ${min} min`;
  if (hr < 24) return `před ${hr} h`;
  if (day === 1) return 'před 1 dnem';
  if (day < 7) return `před ${day} dny`;
  if (day < 30) {
    const w = Math.floor(day / 7);
    return w === 1 ? 'před týdnem' : `před ${w} týdny`;
  }
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

function leadFullName(l: Lead): string {
  return `${l.firstName} ${l.lastName}`.trim() || 'Bez jména';
}

function eventContactLine(ev: CalendarEvent): string | null {
  if (ev.case?.jmeno) return ev.case.jmeno;
  if (ev.lead) return `${ev.lead.firstName} ${ev.lead.lastName}`.trim();
  return null;
}

/**
 * Dashboard podle Figma prototypu (HypoManažer): akce, pipeline, KPI, fronty leadů, případy, události.
 */
export function Dashboard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const mountedRef = useRef(true);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    const now = new Date();
    const fromStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const horizonEnd = new Date(now);
    horizonEnd.setDate(horizonEnd.getDate() + 56);

    Promise.all([
      getCases().catch(() => [] as Case[]),
      getLeads().catch(() => [] as Lead[]),
      getCalendarEvents({
        dateFrom: fromStartOfDay.toISOString(),
        dateTo: horizonEnd.toISOString(),
        status: 'active',
      }).catch(() => [] as CalendarEvent[]),
    ])
      .then(([casesData, leadsData, eventsData]) => {
        if (!mountedRef.current) return;
        setCases(Array.isArray(casesData) ? casesData : []);
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setLoadError(false);
      })
      .catch(() => {
        if (mountedRef.current) {
          setCases([]);
          setLeads([]);
          setEvents([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const pipelineDetail = useMemo(() => {
    const d = {
      new: 0,
      dataExtracted: 0,
      sentToBank: 0,
      approved: 0,
      signed: 0,
      closedWon: 0,
      closedLost: 0,
    };
    for (const c of cases) {
      const st = c.dealStatus ?? 'NEW';
      switch (st) {
        case 'NEW':
          d.new += 1;
          break;
        case 'DATA_EXTRACTED':
          d.dataExtracted += 1;
          break;
        case 'SENT_TO_BANK':
          d.sentToBank += 1;
          break;
        case 'APPROVED':
          d.approved += 1;
          break;
        case 'SIGNED_BY_CLIENT':
          d.signed += 1;
          break;
        case 'CLOSED':
          d.closedWon += 1;
          break;
        case 'LOST':
          d.closedLost += 1;
          break;
        default:
          break;
      }
    }
    const active = d.new + d.dataExtracted;
    const inBank = d.sentToBank + d.approved + d.signed;
    const closed = d.closedWon + d.closedLost;
    return { ...d, active, inBank, closed };
  }, [cases]);

  const leadStats = useMemo(() => {
    const waiting = leads.filter((l) => WAITING_LEAD_STATUSES.has(l.status));
    const submitted = leads.filter((l) => l.status === 'SUBMITTED');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newLeads = leads.filter((l) => new Date(l.createdAt) >= sevenDaysAgo);
    return { waiting, submitted, newLeads };
  }, [leads]);

  const waitingSorted = useMemo(
    () =>
      [...leadStats.waiting].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [leadStats.waiting]
  );
  const submittedSorted = useMemo(
    () =>
      [...leadStats.submitted].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [leadStats.submitted]
  );

  const today = new Date();
  const eventsToday = events.filter((e) => new Date(e.startAt).toDateString() === today.toDateString());
  const upcomingEvents = [...events]
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 8);

  const formatEventDate = (d: string) => {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const inProcessCases = cases.filter((c) => {
    const st = c.dealStatus ?? 'NEW';
    return st === 'SENT_TO_BANK' || st === 'APPROVED' || st === 'SIGNED_BY_CLIENT';
  });
  const closedCases = cases.filter((c) => ['CLOSED', 'LOST'].includes(c.dealStatus ?? 'NEW'));

  const quickActionClass =
    'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800';

  return (
    <div className="min-h-full w-full bg-gray-50 app-content-dark">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Hlavička jako ve Figmě */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 sm:text-base">
              Přehled všech leadů, případů a aktivit
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/leads/new"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Nový lead
            </Link>
            <Link
              to="/new-case"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 dark:hover:bg-blue-500 sm:px-6 sm:py-3"
            >
              <Plus className="h-5 w-5 shrink-0" />
              Nový případ
            </Link>
          </div>
        </div>

        {/* Rychlé akce (Figma) */}
        <div className="dash-card mb-6 px-3 py-3 sm:px-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Rychlé akce
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/leads/new" className={quickActionClass}>
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Nový lead
            </Link>
            <Link to="/leads" className={quickActionClass}>
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              Vygenerovat intake odkaz
            </Link>
            <Link to="/leads" className={quickActionClass}>
              <Send className="h-3.5 w-3.5 shrink-0" />
              Odeslat odkaz klientovi
            </Link>
            <Link to="/new-case" className={quickActionClass}>
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Nový případ
            </Link>
            <Link to="/calendar" className={quickActionClass}>
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Přidat událost
            </Link>
            <Link to="/settings" className={quickActionClass}>
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
              Synchronizovat kalendář
            </Link>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Část dat se nepodařila načíst. Zkuste obnovit stránku nebo zkontrolujte backend.
            </p>
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Zkusit znovu
            </button>
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-gray-500 dark:text-gray-400">Načítání…</p>
        ) : (
          <>
            {/* Figma layout: vlevo 2/3 (pipeline+KPI+leady), vpravo 1/3 události */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start xl:gap-8">
              <div className="min-w-0 space-y-6 xl:col-span-8">
                {/* Pipeline případů */}
                <section className="dash-card overflow-hidden p-0" aria-labelledby="dash-pipeline-heading">
                  <div className="border-b px-4 py-3" style={{ borderColor: 'var(--dash-card-border)' }}>
                    <h2 id="dash-pipeline-heading" className="text-base font-semibold text-gray-900 dark:text-white">
                      Pipeline případů
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Přehled stavu všech případů v procesu</p>
                  </div>
                  <div className="grid grid-cols-1 divide-y divide-gray-200 dark:divide-gray-700/80 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <div className="px-4 py-4 text-center sm:py-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                        Rozpracované
                      </p>
                      <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                        {pipelineDetail.active}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Nové + Data vytažena</p>
                    </div>
                    <div className="px-4 py-4 text-center sm:py-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                        Ve schvalování
                      </p>
                      <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                        {pipelineDetail.inBank}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Odesláno + Schváleno + Podepsáno</p>
                    </div>
                    <div className="px-4 py-4 text-center sm:py-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Uzavřené
                      </p>
                      <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                        {pipelineDetail.closed}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Úspěšné: {pipelineDetail.closedWon}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ztracené: {pipelineDetail.closedLost}</p>
                    </div>
                  </div>
                </section>

                {/* KPI */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4">
                  {[
                    {
                      label: 'Nové leady',
                      value: leadStats.newLeads.length,
                      sub: 'Za posledních 7 dní',
                      color: 'text-gray-900 dark:text-white',
                    },
                    {
                      label: 'Čeká na zpracování',
                      value: leadStats.waiting.length,
                      sub: 'Vyžaduje akci',
                      color: 'text-orange-600 dark:text-orange-400',
                    },
                    {
                      label: 'Podklady odevzdány',
                      value: leadStats.submitted.length,
                      sub: 'K převedení',
                      color: 'text-sky-600 dark:text-sky-400',
                    },
                    {
                      label: 'Události dnes',
                      value: eventsToday.length,
                      sub: 'Naplánováno',
                      color: 'text-purple-600 dark:text-purple-400',
                    },
                    {
                      label: 'Případy v procesu',
                      value: inProcessCases.length,
                      sub: 'Aktivní',
                      color: 'text-emerald-600 dark:text-emerald-400',
                    },
                    {
                      label: 'Uzavřené případy',
                      value: closedCases.length,
                      sub: 'Celkem',
                      color: 'text-gray-900 dark:text-white',
                    },
                  ].map((k) => (
                    <div key={k.label} className="dash-card px-3 py-3 sm:px-4 sm:py-4">
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{k.label}</p>
                      <p className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${k.color}`}>{k.value}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{k.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Spodní dvojice karet */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <section className="dash-card overflow-hidden p-0" aria-labelledby="dash-waiting-heading">
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
                    style={{ borderColor: 'var(--dash-card-border)' }}
                  >
                    <div>
                      <h3 id="dash-waiting-heading" className="text-sm font-semibold text-gray-900 dark:text-white">
                        Čeká na zpracování
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Leady vyžadující aktivní práci</p>
                    </div>
                    <Link
                      to="/leads"
                      className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Zobrazit vše
                    </Link>
                  </div>
                  <ul className="divide-y dark:divide-gray-700/60">
                    {waitingSorted.length === 0 ? (
                      <li className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Žádné leady ve frontě.
                      </li>
                    ) : (
                      waitingSorted.slice(0, 5).map((l) => (
                        <li key={l.id}>
                          <Link
                            to={`/leads/${l.id}/edit`}
                            className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100">{leadFullName(l)}</p>
                              {l.phone ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{l.phone}</p>
                              ) : l.email ? (
                                <p className="truncate text-sm text-gray-500 dark:text-gray-400">{l.email}</p>
                              ) : null}
                              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                {formatRelativeCs(l.updatedAt)}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                              {LEAD_STATUS_LABELS[l.status] ?? l.status}
                            </span>
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                  </section>

                  <section className="dash-card overflow-hidden p-0" aria-labelledby="dash-submitted-heading">
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
                    style={{ borderColor: 'var(--dash-card-border)' }}
                  >
                    <div>
                      <h3 id="dash-submitted-heading" className="text-sm font-semibold text-gray-900 dark:text-white">
                        Podklady odevzdány
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Leady s odevzdanými podklady k převedení</p>
                    </div>
                    <Link
                      to="/leads"
                      className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Zobrazit vše
                    </Link>
                  </div>
                  <ul className="divide-y dark:divide-gray-700/60">
                    {submittedSorted.length === 0 ? (
                      <li className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Žádné leady s odevzdanými podklady.
                      </li>
                    ) : (
                      submittedSorted.slice(0, 4).map((l) => (
                        <li key={l.id} className="px-4 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100">{leadFullName(l)}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(l.updatedAt).toLocaleString('cs-CZ', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <Link
                                to={`/leads/${l.id}/edit`}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                              >
                                Zkontrolovat
                              </Link>
                              <Link
                                to={`/leads/${l.id}/edit`}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-500"
                              >
                                Převést
                              </Link>
                            </div>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                  </section>
                </div>
              </div>

              {/* Nadcházející události */}
              <aside className="min-w-0 xl:col-span-4" aria-label="Nadcházející události">
                <div className="dash-card flex max-h-[min(32rem,60vh)] flex-col overflow-hidden p-0 xl:sticky xl:top-4">
                  <div
                    className="flex shrink-0 items-center justify-between border-b px-4 py-3"
                    style={{ borderColor: 'var(--dash-card-border)' }}
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Nadcházející události</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Nejbližší plánované aktivity</p>
                    </div>
                    <Link
                      to="/calendar"
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 dark:text-blue-400"
                    >
                      Kalendář
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="min-h-0 flex-1 divide-y overflow-y-auto dark:divide-gray-700/60">
                    {upcomingEvents.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Žádné naplánované události.
                      </p>
                    ) : (
                      upcomingEvents.map((ev) => {
                        const typeMeta = EVENT_TYPE_META[ev.type] ?? EVENT_TYPE_META.task;
                        const contact = eventContactLine(ev);
                        return (
                          <Link
                            key={ev.id}
                            to="/calendar"
                            className="block px-4 py-3 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                          >
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeMeta.className}`}
                            >
                              {typeMeta.label}
                            </span>
                            <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{ev.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatEventDate(ev.startAt)}</p>
                            {contact ? (
                              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">{contact}</p>
                            ) : null}
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
