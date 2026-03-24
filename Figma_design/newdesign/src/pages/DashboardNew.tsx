import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Plus, 
  TrendingUp, 
  Clock, 
  FileCheck, 
  Calendar,
  Briefcase,
  CheckCircle2,
  Phone,
  Eye,
  Mail,
  ArrowRight,
  ExternalLink,
  Users,
  FileText,
  CalendarClock,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { mockLeads, mockEvents, mockBankRates } from '../lib/mockDashboardData';
import { Lead, Event, Case, LeadStatus } from '../lib/types';

export function DashboardNew() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [cases, setCases] = useState<Case[]>([]);

  useEffect(() => {
    // Načtení dat z localStorage
    const loadedLeads = localStorage.getItem('leads');
    const loadedEvents = localStorage.getItem('events');
    const loadedCases = localStorage.getItem('cases');

    // Pokud leady neexistují, uložíme mock data
    if (!loadedLeads) {
      localStorage.setItem('leads', JSON.stringify(mockLeads));
      setLeads(mockLeads);
    } else {
      setLeads(JSON.parse(loadedLeads));
    }

    // Pokud události neexistují, uložíme mock data
    if (!loadedEvents) {
      localStorage.setItem('events', JSON.stringify(mockEvents));
      setEvents(mockEvents);
    } else {
      setEvents(JSON.parse(loadedEvents));
    }

    setCases(loadedCases ? JSON.parse(loadedCases) : []);
  }, []);

  // Statistiky pro KPI karty
  const stats = {
    noveLeady24h: leads.filter(l => {
      const created = new Date(l.datumVytvoreni);
      const now = new Date();
      const diff = now.getTime() - created.getTime();
      return diff < 24 * 60 * 60 * 1000;
    }).length,
    noveLeady7d: leads.filter(l => {
      const created = new Date(l.datumVytvoreni);
      const now = new Date();
      const diff = now.getTime() - created.getTime();
      return diff < 7 * 24 * 60 * 60 * 1000;
    }).length,
    cekaNaZpracovani: leads.filter(l => 
      ['DRAFT', 'SENT', 'OPENED', 'IN_PROGRESS'].includes(l.status)
    ).length,
    podkladyOdevzdany: leads.filter(l => l.status === 'SUBMITTED').length,
    udalostiDnes: events.filter(e => {
      const eventDate = new Date(e.datum);
      const today = new Date();
      return eventDate.toDateString() === today.toDateString() && !e.splneno;
    }).length,
    pripadyVProcesu: cases.filter(c => 
      c.businessStatus && ['NEW', 'DATA_EXTRACTED', 'SENT_TO_BANK', 'APPROVED', 'SIGNED_BY_CLIENT'].includes(c.businessStatus)
    ).length,
    uzavrenePripady: cases.filter(c => 
      c.businessStatus && ['CLOSED', 'LOST'].includes(c.businessStatus)
    ).length,
  };

  // Pipeline případů
  const pipelineStats = {
    rozpracovane: cases.filter(c => 
      c.businessStatus && ['NEW', 'DATA_EXTRACTED'].includes(c.businessStatus)
    ).length,
    veSchvalovani: cases.filter(c => 
      c.businessStatus && ['SENT_TO_BANK', 'APPROVED', 'SIGNED_BY_CLIENT'].includes(c.businessStatus)
    ).length,
    uzavreneUspesne: cases.filter(c => c.businessStatus === 'CLOSED').length,
    uzavreneZtracene: cases.filter(c => c.businessStatus === 'LOST').length,
  };

  // Leady čekající na zpracování
  const leadsCekajiciNaZpracovani = leads
    .filter(l => ['DRAFT', 'SENT', 'OPENED', 'IN_PROGRESS'].includes(l.status))
    .sort((a, b) => new Date(a.datumVytvoreni).getTime() - new Date(b.datumVytvoreni).getTime())
    .slice(0, 5);

  // Podklady odevzdány
  const leadyPodkladyOdevzdany = leads
    .filter(l => l.status === 'SUBMITTED')
    .sort((a, b) => {
      const dateA = new Date(a.datumOdevzdaniPodkladu || a.datumVytvoreni);
      const dateB = new Date(b.datumOdevzdaniPodkladu || b.datumVytvoreni);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  // Nadcházející události (nejbližší)
  const nadchazejiUdalosti = events
    .filter(e => !e.splneno)
    .sort((a, b) => {
      const dateA = new Date(`${a.datum} ${a.cas}`);
      const dateB = new Date(`${b.datum} ${b.cas}`);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 6);

  const getLeadStatusBadge = (status: LeadStatus) => {
    const variants: Record<LeadStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      DRAFT: { label: 'Koncept', variant: 'outline' },
      SENT: { label: 'Odesláno', variant: 'secondary' },
      OPENED: { label: 'Otevřeno', variant: 'default' },
      IN_PROGRESS: { label: 'Zpracovává se', variant: 'default' },
      SUBMITTED: { label: 'Podklady odevzdány', variant: 'default' },
      CONVERTED: { label: 'Převedeno', variant: 'default' },
    };
    return variants[status];
  };

  const getEventTypeIcon = (type: Event['typ']) => {
    switch (type) {
      case 'MEETING': return <Users className="h-4 w-4 text-blue-500" />;
      case 'CALL': return <Phone className="h-4 w-4 text-green-500" />;
      case 'TASK': return <FileText className="h-4 w-4 text-orange-500" />;
      case 'REMINDER': return <CalendarClock className="h-4 w-4 text-purple-500" />;
    }
  };

  const getEventTypeLabel = (type: Event['typ']) => {
    switch (type) {
      case 'MEETING': return 'Schůzka';
      case 'CALL': return 'Telefonát';
      case 'TASK': return 'Úkol';
      case 'REMINDER': return 'Připomínka';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diff = now.getTime() - created.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `před ${days} ${days === 1 ? 'dnem' : 'dny'}`;
    if (hours > 0) return `před ${hours} ${hours === 1 ? 'hodinou' : 'hodinami'}`;
    return 'před chvílí';
  };

  return (
    <div className="p-8 space-y-6 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Přehled všech leadů, případů a aktivit</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/new-lead')} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            <Plus className="w-4 h-4 mr-2" />
            Nový lead
          </Button>
          <Button onClick={() => navigate('/new-case')} className="dark:bg-blue-600 dark:hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nový případ
          </Button>
        </div>
      </div>

      {/* Rychlé akce - jednoduché tlačítka */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/new-lead')}>
            <Users className="h-4 w-4 mr-2" />
            Nový lead
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/generate-intake-link')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Vygenerovat intake odkaz
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/send-link')}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Odeslat odkaz klientovi
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/new-case')}>
            <Briefcase className="h-4 w-4 mr-2" />
            Nový případ
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/new-event')}>
            <Plus className="h-4 w-4 mr-2" />
            Přidat událost
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/sync-calendar')}>
            <Calendar className="h-4 w-4 mr-2" />
            Synchronizovat kalendář
          </Button>
        </div>
      </div>

      {/* Hlavní layout: Pipeline + KPI boxy + widgety vlevo, Nadcházející události vpravo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Levá část - Pipeline + KPI boxy + widgety */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline případy */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline případů</CardTitle>
              <CardDescription>Přehled stavu všech případů v procesu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 text-sm mb-1">Rozpracované</h4>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{pipelineStats.rozpracovane}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-400">
                    Nové + Data vytažena
                  </div>
                </div>
                
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <h4 className="font-medium text-orange-900 dark:text-orange-300 text-sm mb-1">Ve schvalování</h4>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">{pipelineStats.veSchvalovani}</div>
                  <div className="text-xs text-orange-700 dark:text-orange-400">
                    Odesláno + Schváleno + Podepsáno
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Uzavřené</h4>
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-300 mb-1">{pipelineStats.uzavreneUspesne + pipelineStats.uzavreneZtracene}</div>
                  <div className="text-xs text-gray-700 dark:text-gray-400">
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Úspěšné: {pipelineStats.uzavreneUspesne}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Ztracené: {pipelineStats.uzavreneZtracene}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Lišta */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/leads')}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-medium text-gray-600">Nové leady</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-2xl font-bold">{stats.noveLeady24h}</div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {stats.noveLeady7d} za 7 dní
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/leads?filter=waiting')}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-medium text-gray-600">Čeká na zpracování</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-2xl font-bold text-orange-600">{stats.cekaNaZpracovani}</div>
                <p className="text-xs text-gray-500 mt-0.5">Vyžaduje akci</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/leads?filter=submitted')}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-medium text-gray-600">Podklady odevzdány</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-2xl font-bold text-blue-600">{stats.podkladyOdevzdany}</div>
                <p className="text-xs text-gray-500 mt-0.5">K převedení</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/calendar')}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-medium text-gray-600">Události dnes</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-2xl font-bold text-purple-600">{stats.udalostiDnes}</div>
                <p className="text-xs text-gray-500 mt-0.5">Naplánováno</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cases?filter=active')}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-medium text-gray-600">Případy v procesu</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-2xl font-bold text-green-600">{stats.pripadyVProcesu}</div>
                <p className="text-xs text-gray-500 mt-0.5">Aktivní</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cases?filter=closed')}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-medium text-gray-600">Uzavřené případy</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-2xl font-bold">{stats.uzavrenePripady}</div>
                <p className="text-xs text-gray-500 mt-0.5">Celkem</p>
              </CardContent>
            </Card>
          </div>

          {/* Dolní widgety - Čeká na zpracování a Podklady odevzdány */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Widget A: Čeká na zpracování */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Čeká na zpracování</CardTitle>
                    <CardDescription>Leady vyžadující aktivní práci</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/leads?filter=waiting')}>
                    Zobrazit vše <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {leadsCekajiciNaZpracovani.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm mb-3">Žádné leady čekající na zpracování</p>
                    <Button onClick={() => navigate('/new-lead')} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Vytvořit lead
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leadsCekajiciNaZpracovani.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex flex-col p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors gap-2"
                        onClick={() => navigate(`/lead/${lead.id}`)}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{lead.jmeno} {lead.prijmeni}</h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.telefon}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-400">{getTimeSince(lead.datumVytvoreni)}</div>
                          <Badge variant={getLeadStatusBadge(lead.status).variant} className="text-xs">
                            {getLeadStatusBadge(lead.status).label}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Widget B: Podklady odevzdány klientem */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Podklady odevzdány</CardTitle>
                    <CardDescription>Leady s odevzdanými podklady k převedení</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/leads?filter=submitted')}>
                    Zobrazit vše <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {leadyPodkladyOdevzdany.length === 0 ? (
                  <div className="text-center py-8">
                    <FileCheck className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Žádné odevzdané podklady</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leadyPodkladyOdevzdany.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex flex-col p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors gap-2"
                        onClick={() => navigate(`/lead/${lead.id}`)}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{lead.jmeno} {lead.prijmeni}</h4>
                          <div className="text-xs text-gray-600 mt-1">
                            {formatDateTime(lead.datumOdevzdaniPodkladu || lead.datumVytvoreni)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }} className="flex-1 text-xs">
                            Zkontrolovat
                          </Button>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate('/new-case'); }} className="flex-1 text-xs">
                            Převést
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pravá část - Nadcházející události */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Nadcházející události</CardTitle>
                  <CardDescription>Nejbližší plánované aktivity</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
                  Kalendář <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {nadchazejiUdalosti.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Žádné nadcházející události</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nadchazejiUdalosti.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/event/${event.id}`)}
                    >
                      <div className="mt-0.5">
                        {getEventTypeIcon(event.typ)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-600">
                            {getEventTypeLabel(event.typ)}
                          </span>
                        </div>
                        <h5 className="font-medium text-sm">{event.nazev}</h5>
                        <div className="text-xs text-gray-500 mt-1">
                          {event.datum} {event.cas}
                        </div>
                        {event.klientJmeno && (
                          <p className="text-xs text-gray-500 mt-1">
                            {event.klientJmeno}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}