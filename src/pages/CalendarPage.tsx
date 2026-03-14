import { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventInput, EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import csLocale from '@fullcalendar/core/locales/cs';
import { Plus, Calendar, Phone, CheckSquare, Bell, Trash2, Pencil, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  completeCalendarEvent,
  type CalendarEvent,
  type CalendarEventInput,
} from '../lib/api';
import { getCases } from '../lib/storage';
import type { Case } from '../lib/types';
import { EventForm } from '../components/calendar/EventForm';

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  meeting: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
  task: { bg: '#22c55e', border: '#16a34a', text: '#ffffff' },
  call: { bg: '#f97316', border: '#ea580c', text: '#ffffff' },
  reminder: { bg: '#a855f7', border: '#9333ea', text: '#ffffff' },
};

const TYPE_LABELS: Record<string, string> = {
  meeting: 'Schůzka',
  task: 'Úkol',
  call: 'Telefonát',
  reminder: 'Připomínka',
};

const TYPE_ICONS: Record<string, typeof Calendar> = {
  meeting: Calendar,
  task: CheckSquare,
  call: Phone,
  reminder: Bell,
};

function toFcEvent(ev: CalendarEvent): EventInput {
  const colors = TYPE_COLORS[ev.type] ?? TYPE_COLORS.meeting;
  return {
    id: ev.id,
    title: ev.title,
    start: ev.startAt,
    end: ev.endAt ?? undefined,
    allDay: ev.allDay,
    backgroundColor: ev.status === 'completed' ? '#9ca3af' : colors.bg,
    borderColor: ev.status === 'completed' ? '#6b7280' : colors.border,
    textColor: colors.text,
    extendedProps: { ...ev },
    classNames: ev.status === 'completed' ? ['opacity-60', 'line-through'] : [],
  };
}

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cases, setCases] = useState<{ id: string; jmeno: string }[]>([]);
  const [, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>('');
  const [currentView, setCurrentView] = useState<string>('dayGridMonth');
  const [currentTitle, setCurrentTitle] = useState('');
  const calendarRef = useRef<FullCalendar>(null);
  const dateRangeRef = useRef<{ start: string; end: string }>({ start: '', end: '' });

  const loadEvents = useCallback(async (start?: string, end?: string) => {
    try {
      const params: any = {};
      if (start) params.dateFrom = start;
      if (end) params.dateTo = end;
      const data = await getCalendarEvents(params);
      setEvents(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCases()
      .then((data: Case[]) => setCases((data ?? []).map((c) => ({ id: c.id, jmeno: c.jmeno }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDatesSet = useCallback((arg: { startStr: string; endStr: string; view: { type: string; title: string } }) => {
    dateRangeRef.current = { start: arg.startStr, end: arg.endStr };
    setCurrentView(arg.view.type);
    setCurrentTitle(arg.view.title);
    loadEvents(arg.startStr, arg.endStr);
  }, [loadEvents]);

  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    setDefaultDate(arg.startStr);
    setEditingEvent(null);
    setSelectedEvent(null);
    setShowForm(true);
  }, []);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const ev = arg.event.extendedProps as CalendarEvent;
    setSelectedEvent({ ...ev, id: arg.event.id });
    setShowForm(false);
  }, []);

  const handleCreate = async (data: CalendarEventInput) => {
    await createCalendarEvent(data);
    setShowForm(false);
    await loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
  };

  const handleUpdate = async (data: CalendarEventInput) => {
    if (!editingEvent) return;
    await updateCalendarEvent(editingEvent.id, data);
    setShowForm(false);
    setEditingEvent(null);
    setSelectedEvent(null);
    await loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
  };

  const handleDelete = async (id: string) => {
    await deleteCalendarEvent(id);
    setSelectedEvent(null);
    await loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
  };

  const handleComplete = async (id: string) => {
    await completeCalendarEvent(id);
    setSelectedEvent(null);
    await loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
  };

  const handleEventDrop = useCallback(async (arg: EventDropArg) => {
    const evId = arg.event.id;
    const newStart = arg.event.start;
    const newEnd = arg.event.end;
    if (!newStart) { arg.revert(); return; }
    try {
      await updateCalendarEvent(evId, {
        startAt: newStart.toISOString(),
        endAt: newEnd?.toISOString(),
      });
      await loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
    } catch {
      arg.revert();
    }
  }, [loadEvents]);

  const handleEventResize = useCallback(async (arg: EventResizeDoneArg) => {
    const { id } = arg.event;
    const start = arg.event.start;
    const end = arg.event.end;
    if (!start) { arg.revert(); return; }
    try {
      await updateCalendarEvent(id, {
        startAt: start.toISOString(),
        endAt: end?.toISOString(),
      });
      await loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
    } catch {
      arg.revert();
    }
  }, [loadEvents]);

  const handleEditClick = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setSelectedEvent(null);
    setShowForm(true);
  };

  const handleNewClick = () => {
    setDefaultDate('');
    setEditingEvent(null);
    setSelectedEvent(null);
    setShowForm(true);
  };

  const handlePrev = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleToday = () => calendarRef.current?.getApi().today();
  const handleViewChange = (view: string) => calendarRef.current?.getApi().changeView(view);

  const fcEvents = events.map(toFcEvent);

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Kalendář</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Schůzky, úkoly a připomínky</p>
          </div>
          <button
            onClick={handleNewClick}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nová událost
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar area */}
          <div className="flex-1 min-w-0">
            {/* Custom toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button onClick={handlePrev} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <button onClick={handleToday} className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Dnes
                </button>
                <button onClick={handleNext} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-2">{currentTitle}</span>
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                {[
                  { view: 'dayGridMonth', label: 'Měsíc' },
                  { view: 'timeGridWeek', label: 'Týden' },
                  { view: 'timeGridDay', label: 'Den' },
                ].map((v) => (
                  <button
                    key={v.view}
                    onClick={() => handleViewChange(v.view)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      currentView === v.view
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FullCalendar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2 sm:p-4 calendar-wrapper">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locales={[csLocale]}
                locale="cs"
                firstDay={1}
                headerToolbar={false}
                height="auto"
                selectable
                selectMirror
                editable
                eventDurationEditable
                dayMaxEvents={3}
                events={fcEvents}
                select={handleDateSelect}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                datesSet={handleDatesSet}
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDayText="Celý den"
                noEventsText="Žádné události"
                buttonText={{ today: 'Dnes', month: 'Měsíc', week: 'Týden', day: 'Den' }}
              />
            </div>
          </div>

          {/* Side panel: form or event detail */}
          {(showForm || selectedEvent) && (
            <div className="w-full lg:w-96 shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 sticky top-6">
                {showForm ? (
                  <EventForm
                    event={editingEvent}
                    defaultDate={defaultDate}
                    onSubmit={editingEvent ? handleUpdate : handleCreate}
                    onCancel={() => { setShowForm(false); setEditingEvent(null); }}
                    cases={cases}
                  />
                ) : selectedEvent ? (
                  <EventDetail
                    event={selectedEvent}
                    onEdit={() => handleEditClick(selectedEvent)}
                    onDelete={() => handleDelete(selectedEvent.id)}
                    onComplete={() => handleComplete(selectedEvent.id)}
                    onClose={() => setSelectedEvent(null)}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventDetail({
  event,
  onEdit,
  onDelete,
  onComplete,
  onClose,
}: {
  event: CalendarEvent;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const Icon = TYPE_ICONS[event.type] ?? Calendar;
  const colors = TYPE_COLORS[event.type] ?? TYPE_COLORS.meeting;
  const isCompleted = event.status === 'completed';

  const formatDate = (iso: string, allDay: boolean) => {
    const d = new Date(iso);
    if (allDay) return d.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    return d.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{TYPE_LABELS[event.type]}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${isCompleted ? 'line-through opacity-60' : ''}`}>
        {event.title}
      </h3>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p>{formatDate(event.startAt, event.allDay)}</p>
        {event.endAt && <p>do {formatDate(event.endAt, event.allDay)}</p>}
        {event.location && (
          <p className="flex items-center gap-1.5">
            <span className="text-gray-400">Místo:</span> {event.location}
          </p>
        )}
        {event.case && (
          <p className="flex items-center gap-1.5">
            <span className="text-gray-400">Případ:</span> {event.case.jmeno}
          </p>
        )}
        {event.lead && (
          <p className="flex items-center gap-1.5">
            <span className="text-gray-400">Lead:</span> {event.lead.firstName} {event.lead.lastName}
          </p>
        )}
        {event.reminderMinutes != null && (
          <p className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-gray-400" />
            {event.reminderMinutes === 0 ? 'V čas události' :
              event.reminderMinutes < 60 ? `${event.reminderMinutes} min předem` :
              event.reminderMinutes === 60 ? '1 hodinu předem' :
              event.reminderMinutes === 1440 ? '1 den předem' :
              `${event.reminderMinutes} min předem`}
          </p>
        )}
      </div>

      {event.description && (
        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          {event.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        {(event.type === 'task' || event.type === 'call') && (
          <button
            onClick={onComplete}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isCompleted
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50'
            }`}
          >
            <Check className="w-4 h-4" />
            {isCompleted ? 'Obnovit' : 'Splněno'}
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <Pencil className="w-4 h-4" />
          Upravit
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Potvrdit smazání
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
            >
              Ne
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
            Smazat
          </button>
        )}
      </div>
    </div>
  );
}
