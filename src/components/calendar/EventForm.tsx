import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Calendar, Phone, CheckSquare, Bell, MapPin, Clock, X } from 'lucide-react';
import type { CalendarEvent, CalendarEventInput } from '../../lib/api';

const EVENT_TYPES = [
  { value: 'meeting' as const, label: 'Schůzka', icon: Calendar, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'task' as const, label: 'Úkol', icon: CheckSquare, color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'call' as const, label: 'Telefonát', icon: Phone, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { value: 'reminder' as const, label: 'Připomínka', icon: Bell, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
];

const REMINDER_OPTIONS = [
  { value: 0, label: 'V čas události' },
  { value: 5, label: '5 minut předem' },
  { value: 15, label: '15 minut předem' },
  { value: 30, label: '30 minut předem' },
  { value: 60, label: '1 hodinu předem' },
  { value: 1440, label: '1 den předem' },
];

interface EventFormProps {
  event?: CalendarEvent | null;
  defaultDate?: string;
  onSubmit: (data: CalendarEventInput) => Promise<void>;
  onCancel: () => void;
  cases?: { id: string; jmeno: string }[];
}

function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EventForm({ event, defaultDate, onSubmit, onCancel, cases }: EventFormProps) {
  const isEdit = !!event;
  const now = new Date();
  const defaultStart = defaultDate
    ? new Date(defaultDate)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);

  const [type, setType] = useState<CalendarEventInput['type']>(event?.type ?? 'meeting');
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startAt, setStartAt] = useState(
    event?.startAt
      ? (event.allDay ? toLocalDateString(new Date(event.startAt)) : toLocalDatetimeString(new Date(event.startAt)))
      : toLocalDatetimeString(defaultStart)
  );
  const [endAt, setEndAt] = useState(
    event?.endAt
      ? (event.allDay ? toLocalDateString(new Date(event.endAt)) : toLocalDatetimeString(new Date(event.endAt)))
      : ''
  );
  const [location, setLocation] = useState(event?.location ?? '');
  const [caseId, setCaseId] = useState(event?.caseId ?? '');
  const [reminderMinutes, setReminderMinutes] = useState<number | undefined>(event?.reminderMinutes ?? 15);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) { setError('Vyplňte název.'); return; }
    if (!startAt) { setError('Vyplňte datum začátku.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        type,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        allDay,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        caseId: caseId || undefined,
        reminderMinutes,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Nepodařilo se uložit událost.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {isEdit ? 'Upravit událost' : 'Nová událost'}
        </h2>
        <button type="button" onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Typ události */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {EVENT_TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                active
                  ? `${t.color} border-current`
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Název */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Název *</label>
        <input
          type="text"
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder={type === 'call' ? 'Zavolat klientovi Novák' : type === 'task' ? 'Připravit dokumenty' : 'Schůzka s klientem'}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>

      {/* Celý den */}
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setAllDay(e.target.checked);
            if (e.target.checked && startAt.includes('T')) {
              setStartAt(startAt.split('T')[0]);
              if (endAt.includes('T')) setEndAt(endAt.split('T')[0]);
            } else if (!e.target.checked && !startAt.includes('T')) {
              setStartAt(startAt + 'T09:00');
              if (endAt && !endAt.includes('T')) setEndAt(endAt + 'T10:00');
            }
          }}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Celodenní
      </label>

      {/* Datum a čas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Clock className="inline w-4 h-4 mr-1" />Začátek *
          </label>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={startAt}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setStartAt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konec</label>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={endAt}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEndAt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Místo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <MapPin className="inline w-4 h-4 mr-1" />Místo
        </label>
        <input
          type="text"
          value={location}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
          placeholder="Kancelář, adresa klienta..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Připomínka */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <Bell className="inline w-4 h-4 mr-1" />Připomínka
        </label>
        <select
          value={reminderMinutes ?? ''}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setReminderMinutes(e.target.value === '' ? undefined : Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Bez připomínky</option>
          {REMINDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Případ */}
      {cases && cases.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Případ</label>
          <select
            value={caseId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setCaseId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">— bez případ —</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.jmeno}</option>
            ))}
          </select>
        </div>
      )}

      {/* Popis */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Poznámka</label>
        <textarea
          value={description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          rows={3}
          placeholder="Detaily, poznámky..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Zrušit
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Ukládám...' : isEdit ? 'Uložit změny' : 'Vytvořit'}
        </button>
      </div>
    </form>
  );
}
