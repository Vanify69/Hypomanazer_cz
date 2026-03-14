import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { Calendar, Phone, CheckSquare, Bell, Plus, Check, Trash2, ExternalLink } from 'lucide-react';
import {
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  completeCalendarEvent,
  type CalendarEvent,
  type CalendarEventInput,
} from '../../lib/api';

const TYPE_ICONS: Record<string, typeof Calendar> = {
  meeting: Calendar,
  task: CheckSquare,
  call: Phone,
  reminder: Bell,
};

const TYPE_LABELS: Record<string, string> = {
  meeting: 'Schůzka',
  task: 'Úkol',
  call: 'Telefonát',
  reminder: 'Připomínka',
};

const TYPE_COLORS: Record<string, string> = {
  meeting: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  task: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  call: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  reminder: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

interface Props {
  caseId: string;
  caseName: string;
}

export function CaseCalendarTab({ caseId, caseName }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Quick-add state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CalendarEventInput['type']>('task');
  const [startAt, setStartAt] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const data = await getCalendarEvents({ caseId });
      setEvents(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function handleQuickAdd() {
    if (!title.trim() || !startAt) return;
    setSaving(true);
    try {
      await createCalendarEvent({
        title: title.trim(),
        type,
        startAt: new Date(startAt).toISOString(),
        caseId,
      });
      setTitle('');
      setStartAt('');
      setShowQuickAdd(false);
      await loadEvents();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(id: string) {
    try {
      await completeCalendarEvent(id);
      await loadEvents();
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm('Smazat tuto událost?')) return;
    try {
      await deleteCalendarEvent(id);
      await loadEvents();
    } catch {}
  }

  const activeEvents = events.filter((e) => e.status === 'active');
  const completedEvents = events.filter((e) => e.status === 'completed');

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Kalendář — {caseName}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Přidat
          </button>
          <Link
            to="/calendar"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Kalendář
          </Link>
        </div>
      </div>

      {/* Quick Add Form */}
      {showQuickAdd && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Název události…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CalendarEventInput['type'])}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="task">Úkol</option>
              <option value="meeting">Schůzka</option>
              <option value="call">Telefonát</option>
              <option value="reminder">Připomínka</option>
            </select>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={saving || !title.trim() || !startAt}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {saving ? 'Ukládám…' : 'Uložit'}
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Zrušit
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      {loading ? (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">Načítání…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Pro tento případ nejsou žádné události.</p>
          <button
            type="button"
            onClick={() => setShowQuickAdd(true)}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Přidat první událost
          </button>
        </div>
      ) : (
        <>
          {/* Active */}
          {activeEvents.length > 0 && (
            <div className="space-y-2">
              {activeEvents.map((ev) => {
                const Icon = TYPE_ICONS[ev.type] ?? Calendar;
                const colorClass = TYPE_COLORS[ev.type] ?? TYPE_COLORS.meeting;
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ev.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(ev.startAt)} · {TYPE_LABELS[ev.type]}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleComplete(ev.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        title="Dokončit"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ev.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Smazat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed */}
          {completedEvents.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Dokončené ({completedEvents.length})
              </p>
              <div className="space-y-1">
                {completedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 p-2 opacity-60"
                  >
                    <CheckSquare className="w-4 h-4 text-gray-400 shrink-0" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-through truncate">{ev.title}</p>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatDate(ev.startAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
