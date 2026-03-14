import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Calendar, Phone, CheckSquare, Bell, Clock, ChevronRight } from 'lucide-react';
import { getCalendarEvents, type CalendarEvent } from '../../lib/api';

const TYPE_ICONS: Record<string, typeof Calendar> = {
  meeting: Calendar,
  task: CheckSquare,
  call: Phone,
  reminder: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  meeting: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  task: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
  call: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  reminder: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
};

const TYPE_LABELS: Record<string, string> = {
  meeting: 'Schůzka',
  task: 'Úkol',
  call: 'Telefonát',
  reminder: 'Připomínka',
};

function formatEventTime(ev: CalendarEvent): string {
  const d = new Date(ev.startAt);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeStr = d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

  if (d.toDateString() === now.toDateString()) {
    return ev.allDay ? 'Dnes (celodenní)' : `Dnes ${timeStr}`;
  }
  if (d.toDateString() === tomorrow.toDateString()) {
    return ev.allDay ? 'Zítra (celodenní)' : `Zítra ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
  return ev.allDay ? `${dateStr} (celodenní)` : `${dateStr} ${timeStr}`;
}

export function UpcomingEventsWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const weekLater = new Date(now);
    weekLater.setDate(weekLater.getDate() + 14);

    getCalendarEvents({
      dateFrom: now.toISOString(),
      dateTo: weekLater.toISOString(),
      status: 'active',
    })
      .then((data) => setEvents(data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          Nadcházející události
        </h2>
        <Link
          to="/calendar"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
        >
          Zobrazit vše
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Načítání…</div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center">
            <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Žádné nadcházející události</p>
          </div>
        ) : (
          events.map((ev) => {
            const Icon = TYPE_ICONS[ev.type] ?? Calendar;
            const colorClass = TYPE_COLORS[ev.type] ?? TYPE_COLORS.meeting;
            return (
              <Link
                key={ev.id}
                to="/calendar"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ev.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatEventTime(ev)}</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>{TYPE_LABELS[ev.type] ?? ev.type}</span>
                    {ev.case && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="truncate">{ev.case.jmeno}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
