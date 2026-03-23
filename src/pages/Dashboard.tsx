import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Calendar, CheckCircle2, ChevronRight, Clock3, FileText, Phone, Plus, Send, UserCheck, Users } from 'lucide-react';
import { getCases } from '../lib/storage';
import { getCalendarEvents, getLeads, type CalendarEvent, type Lead } from '../lib/api';
import type { Case } from '../lib/types';

type PipelineGroup = {
  title: string;
  count: number;
  subtitle: string;
  className: string;
};

const WAITING_LEAD_STATUSES = new Set(['DRAFT', 'SENT', 'OPENED', 'IN_PROGRESS']);

const EVENT_ICON_BY_TYPE: Record<string, typeof Calendar> = {
  meeting: Calendar,
  call: Phone,
  task: CheckCircle2,
  reminder: Clock3,
};

function displayLeadName(lead: Lead): string {
  const full = `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim();
  return full || 'Neznámý lead';
}

function formatEventDate(d: string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Dashboard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const now = new Date();
        const twoWeeks = new Date(now);
        twoWeeks.setDate(twoWeeks.getDate() + 14);
        const [casesData, leadsData, eventsData] = await Promise.all([
          getCases(),
          getLeads(),
          getCalendarEvents({
            dateFrom: now.toISOString(),
            dateTo: twoWeeks.toISOString(),
            status: 'active',
          }),
        ]);
        if (!active) return;
        setCases(Array.isArray(casesData) ? casesData : []);
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      } catch {
        if (!active) return;
        setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const leadStats = useMemo(() => {
    const waiting = leads.filter((l) => WAITING_LEAD_STATUSES.has(l.status));
    const submitted = leads.filter((l) => l.status === 'SUBMITTED');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newLeads = leads.filter((l) => new Date(l.createdAt) >= sevenDaysAgo);
    return { waiting, submitted, newLeads };
  }, [leads]);

  const pipeline = useMemo(() => {
    const byGroup = {
      active: 0,
      inBank: 0,
      closed: 0,
      won: 0,
      lost: 0,
    };
    for (const c of cases) {
      const st = c.dealStatus ?? 'NEW';
      if (st === 'NEW' || st === 'DATA_EXTRACTED') byGroup.active += 1;
      else if (st === 'SENT_TO_BANK' || st === 'APPROVED' || st === 'SIGNED_BY_CLIENT') byGroup.inBank += 1;
      else if (st === 'CLOSED' || st === 'LOST') {
        byGroup.closed += 1;
        if (st === 'CLOSED') byGroup.won += 1;
        if (st === 'LOST') byGroup.lost += 1;
      }
    }
    const cards: PipelineGroup[] = [
      {
        title: 'Rozpracované',
        count: byGroup.active,
        subtitle: 'Nové + Data vytěžena',
        className: 'bg-blue-50 border-blue-100',
      },
      {
        title: 'Ve schvalování',
        count: byGroup.inBank,
        subtitle: 'Odesláno + Schváleno + Podepsáno',
        className: 'bg-amber-50 border-amber-100',
      },
      {
        title: 'Uzavřené',
        count: byGroup.closed,
        subtitle: `Úspěšné: ${byGroup.won} | Ztracené: ${byGroup.lost}`,
        className: 'bg-gray-50 border-gray-200',
      },
    ];
    return cards;
  }, [cases]);

  const today = new Date();

  const eventsToday = events.filter((e) => new Date(e.startAt).toDateString() === today.toDateString());
  const inProcessCases = cases.filter((c) => {
    const st = c.dealStatus ?? 'NEW';
    return st === 'SENT_TO_BANK' || st === 'APPROVED' || st === 'SIGNED_BY_CLIENT';
  });
  const closedCases = cases.filter((c) => ['CLOSED', 'LOST'].includes(c.dealStatus ?? 'NEW'));

  const waitingLeadsPreview = leadStats.waiting.slice(0, 5);
  const submittedLeadsPreview = leadStats.submitted.slice(0, 5);
  const upcomingEvents = [...events]
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 7);

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <section className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Přehled dne a priorit</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/leads/new" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50">
              <Users className="w-4 h-4" />
              Nový lead
            </Link>
            <Link to="/new-case" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50">
              <Plus className="w-4 h-4" />
              Nový případ
            </Link>
            <Link to="/calendar" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50">
              <Calendar className="w-4 h-4" />
              Přidat událost
            </Link>
          </div>
        </section>

        {loadError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
            Nepodařilo se načíst dashboard data. Zkontrolujte backend/API.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pipeline případů</h2>
              <p className="text-xs text-gray-500 mt-1">Přehled stavu všech případů v procesu</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {pipeline.map((item) => (
                  <div key={item.title} className={`rounded-lg border p-3 ${item.className}`}>
                    <p className="text-xs text-gray-600">{item.title}</p>
                    <p className="text-2xl font-semibold mt-1 text-gray-900">{item.count}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Nové leady</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{leadStats.newLeads.length}</p>
                <p className="text-xs text-gray-500 mt-1">Za 7 dní</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Čeká na zpracování</p>
                <p className="text-2xl font-semibold text-orange-600 mt-1">{leadStats.waiting.length}</p>
                <p className="text-xs text-gray-500 mt-1">Vyžaduje akci</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Podklady odevzdány</p>
                <p className="text-2xl font-semibold text-indigo-600 mt-1">{leadStats.submitted.length}</p>
                <p className="text-xs text-gray-500 mt-1">K převedení</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Události dnes</p>
                <p className="text-2xl font-semibold text-purple-600 mt-1">{eventsToday.length}</p>
                <p className="text-xs text-gray-500 mt-1">Naplánováno</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Případy v procesu</p>
                <p className="text-2xl font-semibold text-emerald-600 mt-1">{inProcessCases.length}</p>
                <p className="text-xs text-gray-500 mt-1">Aktivní</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Uzavřené případy</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{closedCases.length}</p>
                <p className="text-xs text-gray-500 mt-1">Celkem</p>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Čeká na zpracování</h3>
                    <p className="text-xs text-gray-500">Leady vyžadující aktivní práci</p>
                  </div>
                  <Link to="/leads" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">Zobrazit vše <ChevronRight className="w-3 h-3" /></Link>
                </header>
                <div className="divide-y divide-gray-100">
                  {loading ? (
                    <p className="px-4 py-5 text-sm text-gray-500">Načítání…</p>
                  ) : waitingLeadsPreview.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-gray-500">Žádné leady nečekají na akci.</p>
                  ) : waitingLeadsPreview.map((lead) => (
                    <div key={lead.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{displayLeadName(lead)}</p>
                      <p className="text-xs text-gray-500 mt-1">{lead.email ?? lead.phone ?? 'Bez kontaktu'}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{lead.status}</span>
                        <Link to="/leads" className="text-xs text-blue-600 hover:underline">Zpracovat</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Podklady odevzdány</h3>
                    <p className="text-xs text-gray-500">Leady s odevzdanými podklady</p>
                  </div>
                  <Link to="/leads" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">Zobrazit vše <ChevronRight className="w-3 h-3" /></Link>
                </header>
                <div className="divide-y divide-gray-100">
                  {loading ? (
                    <p className="px-4 py-5 text-sm text-gray-500">Načítání…</p>
                  ) : submittedLeadsPreview.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-gray-500">Žádné leady s odevzdanými podklady.</p>
                  ) : submittedLeadsPreview.map((lead) => (
                    <div key={lead.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{displayLeadName(lead)}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(lead.updatedAt).toLocaleDateString('cs-CZ')}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <button type="button" className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Zkontrolovat</button>
                        <button type="button" className="text-xs px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Převést</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nadcházející události</h3>
                  <p className="text-xs text-gray-500">Nejbližší plánované aktivity</p>
                </div>
                <Link to="/calendar" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">Kalendář <ChevronRight className="w-3 h-3" /></Link>
              </header>
              <div className="divide-y divide-gray-100">
                {loading ? (
                  <p className="px-4 py-5 text-sm text-gray-500">Načítání…</p>
                ) : upcomingEvents.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-gray-500">Žádné plánované události.</p>
                ) : upcomingEvents.map((event) => {
                  const Icon = EVENT_ICON_BY_TYPE[event.type] ?? Calendar;
                  return (
                    <Link key={event.id} to="/calendar" className="block px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-start gap-2">
                        <Icon className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatEventDate(event.startAt)}</p>
                          {event.case?.jmeno && <p className="text-xs text-gray-400 truncate mt-0.5">{event.case.jmeno}</p>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Rychlé akce</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/leads/new" className="inline-flex items-center justify-center gap-1 px-2 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50">
                  <Users className="w-3.5 h-3.5" />
                  Nový lead
                </Link>
                <Link to="/new-case" className="inline-flex items-center justify-center gap-1 px-2 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50">
                  <FileText className="w-3.5 h-3.5" />
                  Nový případ
                </Link>
                <Link to="/leads" className="inline-flex items-center justify-center gap-1 px-2 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50">
                  <Send className="w-3.5 h-3.5" />
                  Intake odkaz
                </Link>
                <Link to="/calendar" className="inline-flex items-center justify-center gap-1 px-2 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50">
                  <UserCheck className="w-3.5 h-3.5" />
                  Událost
                </Link>
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Aktuální sazby bank</h3>
              <p className="text-xs text-gray-500 mt-1 mb-3">Marketingový orientační přehled</p>
              <div className="space-y-2">
                {[
                  { bank: 'ČSOB', rate: '4.89%' },
                  { bank: 'Česká spořitelna', rate: '4.95%' },
                  { bank: 'Komerční banka', rate: '4.79%' },
                  { bank: 'Moneta', rate: '4.99%' },
                ].map((r) => (
                  <div key={r.bank} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                    <span className="text-sm text-gray-700">{r.bank}</span>
                    <span className="text-sm font-semibold text-blue-700">{r.rate}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                Sazby jsou orientační a mohou se lišit dle bonity, LTV a podmínek banky.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
