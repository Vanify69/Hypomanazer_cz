import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Phone, Users, FileText, CalendarClock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Event, EventType } from '../lib/types';
import { mockEvents } from '../lib/mockDashboardData';

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    typ: 'MEETING',
    nazev: '',
    popis: '',
    datum: '',
    cas: '',
    konec: '',
    misto: '',
    celoDenni: false,
    splneno: false
  });

  useEffect(() => {
    const stored = localStorage.getItem('events');
    if (stored) {
      setEvents(JSON.parse(stored));
    } else {
      localStorage.setItem('events', JSON.stringify(mockEvents));
      setEvents(mockEvents);
    }
  }, []);

  const monthNames = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
  ];

  const dayNames = ['PO', 'ÚT', 'ST', 'ČT', 'PÁ', 'SO', 'NE'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Získat den v týdnu (0 = neděle, upravíme na 1 = pondělí)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Neděle

    const days: (Date | null)[] = [];
    
    // Přidat prázdná místa pro dny před začátkem měsíce
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -(startDayOfWeek - i - 1));
      days.push(prevMonthDay);
    }
    
    // Přidat dny aktuálního měsíce
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    // Doplnit do 42 (6 týdnů * 7 dní)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.datum === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date | null) => {
    if (!date) return false;
    return date.getMonth() === currentDate.getMonth();
  };

  const handleCreateEvent = () => {
    if (!newEvent.nazev || !newEvent.datum) {
      alert('Vyplňte povinná pole');
      return;
    }

    const event: Event = {
      id: `event-${Date.now()}`,
      typ: newEvent.typ as EventType,
      nazev: newEvent.nazev!,
      popis: newEvent.popis,
      datum: newEvent.datum!,
      cas: newEvent.cas || '09:00',
      konec: newEvent.konec,
      misto: newEvent.misto,
      celoDenni: newEvent.celoDenni || false,
      splneno: false
    };

    const updatedEvents = [...events, event];
    setEvents(updatedEvents);
    localStorage.setItem('events', JSON.stringify(updatedEvents));
    
    setIsDialogOpen(false);
    setNewEvent({
      typ: 'MEETING',
      nazev: '',
      popis: '',
      datum: '',
      cas: '',
      konec: '',
      misto: '',
      celoDenni: false,
      splneno: false
    });
  };

  const handleDateClick = (date: Date | null) => {
    if (!date) return;
    setSelectedDate(date);
    setNewEvent({
      ...newEvent,
      datum: date.toISOString().split('T')[0]
    });
    setIsDialogOpen(true);
  };

  const getEventTypeIcon = (type: EventType) => {
    switch (type) {
      case 'MEETING': return <Users className="h-3 w-3" />;
      case 'CALL': return <Phone className="h-3 w-3" />;
      case 'TASK': return <FileText className="h-3 w-3" />;
      case 'REMINDER': return <CalendarClock className="h-3 w-3" />;
    }
  };

  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case 'MEETING': return 'bg-blue-500';
      case 'CALL': return 'bg-green-500';
      case 'TASK': return 'bg-orange-500';
      case 'REMINDER': return 'bg-purple-500';
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="p-8 space-y-6 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kalendář</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Schůzky, úkoly a připomínky</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="dark:bg-blue-600 dark:hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nová událost
        </Button>
      </div>

      {/* Navigace */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth} className="dark:border-gray-600 dark:hover:bg-gray-700">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-lg font-semibold dark:text-white min-w-[180px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <Button variant="outline" size="sm" onClick={nextMonth} className="dark:border-gray-600 dark:hover:bg-gray-700">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="dark:border-gray-600 dark:hover:bg-gray-700">
            Dnes
          </Button>
        </div>

        <div className="flex gap-2">
          <Button 
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('month')}
            className="dark:border-gray-600"
          >
            Měsíc
          </Button>
          <Button 
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
            className="dark:border-gray-600"
          >
            Týden
          </Button>
          <Button 
            variant={view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('day')}
            className="dark:border-gray-600"
          >
            Den
          </Button>
        </div>
      </div>

      {/* Kalendář */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Názvy dnů */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {dayNames.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Dny měsíce */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isTodayDate = isToday(day);
            const isCurrentMonthDate = isCurrentMonth(day);

            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  !isCurrentMonthDate ? 'bg-gray-50 dark:bg-gray-900/50' : ''
                }`}
                onClick={() => handleDateClick(day)}
              >
                <div className={`text-sm mb-1 ${
                  isTodayDate 
                    ? 'w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full font-bold' 
                    : isCurrentMonthDate
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {day?.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs px-1.5 py-0.5 rounded ${getEventTypeColor(event.typ)} bg-opacity-20 dark:bg-opacity-30 flex items-center gap-1 truncate`}
                    >
                      {getEventTypeIcon(event.typ)}
                      <span className="truncate">{event.nazev}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-1.5">
                      +{dayEvents.length - 3} další
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog pro novou událost */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Nová událost</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Typ události */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={newEvent.typ === 'MEETING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewEvent({ ...newEvent, typ: 'MEETING' })}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-1" />
                Schůzka
              </Button>
              <Button
                type="button"
                variant={newEvent.typ === 'CALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewEvent({ ...newEvent, typ: 'CALL' })}
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-1" />
                Telefonát
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={newEvent.typ === 'TASK' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewEvent({ ...newEvent, typ: 'TASK' })}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-1" />
                Úkol
              </Button>
              <Button
                type="button"
                variant={newEvent.typ === 'REMINDER' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewEvent({ ...newEvent, typ: 'REMINDER' })}
                className="flex-1"
              >
                <CalendarClock className="w-4 h-4 mr-1" />
                Připomínka
              </Button>
            </div>

            {/* Název */}
            <div>
              <Label htmlFor="nazev" className="dark:text-gray-300">Název *</Label>
              <Input
                id="nazev"
                value={newEvent.nazev}
                onChange={(e) => setNewEvent({ ...newEvent, nazev: e.target.value })}
                placeholder="Schůzka s klientem"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Celodenní */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="celoDenni"
                checked={newEvent.celoDenni}
                onChange={(e) => setNewEvent({ ...newEvent, celoDenni: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="celoDenni" className="dark:text-gray-300 cursor-pointer">
                Celodenní
              </Label>
            </div>

            {/* Datum a čas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="datum" className="dark:text-gray-300">Začátek *</Label>
                <Input
                  id="datum"
                  type="date"
                  value={newEvent.datum}
                  onChange={(e) => setNewEvent({ ...newEvent, datum: e.target.value })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              {!newEvent.celoDenni && (
                <div>
                  <Label htmlFor="cas" className="dark:text-gray-300">&nbsp;</Label>
                  <Input
                    id="cas"
                    type="time"
                    value={newEvent.cas}
                    onChange={(e) => setNewEvent({ ...newEvent, cas: e.target.value })}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Konec */}
            {!newEvent.celoDenni && (
              <div>
                <Label htmlFor="konec" className="dark:text-gray-300">Konec</Label>
                <Input
                  id="konec"
                  type="time"
                  value={newEvent.konec}
                  onChange={(e) => setNewEvent({ ...newEvent, konec: e.target.value })}
                  placeholder="dd. mm. rrrr --:--"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}

            {/* Místo */}
            {newEvent.typ === 'MEETING' && (
              <div>
                <Label htmlFor="misto" className="dark:text-gray-300">Místo</Label>
                <Input
                  id="misto"
                  value={newEvent.misto}
                  onChange={(e) => setNewEvent({ ...newEvent, misto: e.target.value })}
                  placeholder="Adresa nebo online link"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}

            {/* Popis */}
            <div>
              <Label htmlFor="popis" className="dark:text-gray-300">Poznámka</Label>
              <Textarea
                id="popis"
                value={newEvent.popis}
                onChange={(e) => setNewEvent({ ...newEvent, popis: e.target.value })}
                placeholder="Doplňující informace..."
                rows={3}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Tlačítka */}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 dark:border-gray-600 dark:hover:bg-gray-700">
                Zrušit
              </Button>
              <Button onClick={handleCreateEvent} className="flex-1 dark:bg-blue-600 dark:hover:bg-blue-700">
                Vytvořit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}