import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus, Search, Filter, Phone, Mail } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Lead, LeadStatus } from '../lib/types';
import { mockLeads } from '../lib/mockDashboardData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export function Leads() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const loadedLeads = localStorage.getItem('leads');
    setLeads(loadedLeads ? JSON.parse(loadedLeads) : mockLeads);

    // Aplikovat filter z URL parametrů
    const filter = searchParams.get('filter');
    if (filter === 'waiting') {
      setStatusFilter('waiting');
    } else if (filter === 'submitted') {
      setStatusFilter('SUBMITTED');
    }
  }, [searchParams]);

  const getStatusBadge = (status: LeadStatus) => {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.jmeno.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.prijmeni.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.telefon.includes(searchQuery);
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'waiting') {
      return matchesSearch && ['DRAFT', 'SENT', 'OPENED', 'IN_PROGRESS'].includes(lead.status);
    }
    
    return matchesSearch && lead.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Leady</h1>
              <p className="text-gray-600 dark:text-gray-400">Správa potenciálních klientů</p>
            </div>
            <Button onClick={() => navigate('/new-lead')} className="dark:bg-blue-600 dark:hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nový lead
            </Button>
          </div>
        </div>

        {/* Filtry a vyhledávání */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Hledat podle jména, emailu nebo telefonu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[250px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrovat podle statusu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny</SelectItem>
                  <SelectItem value="waiting">Čeká na zpracování</SelectItem>
                  <SelectItem value="DRAFT">Koncept</SelectItem>
                  <SelectItem value="SENT">Odesláno</SelectItem>
                  <SelectItem value="OPENED">Otevřeno</SelectItem>
                  <SelectItem value="IN_PROGRESS">Zpracovává se</SelectItem>
                  <SelectItem value="SUBMITTED">Podklady odevzdány</SelectItem>
                  <SelectItem value="CONVERTED">Převedeno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Seznam leadů */}
        {filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Žádné leady nenalezeny' 
                    : 'Zatím nemáte žádné leady'}
                </p>
                <Button onClick={() => navigate('/new-lead')} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Vytvořit první lead
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <Card 
                key={lead.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/lead/${lead.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{lead.jmeno} {lead.prijmeni}</h3>
                        <Badge variant={getStatusBadge(lead.status).variant}>
                          {getStatusBadge(lead.status).label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.telefon}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                        <span>Zdroj: {lead.zdroj}</span>
                        <span>Vytvořeno: {formatDate(lead.datumVytvoreni)}</span>
                        <span>{getTimeSince(lead.datumVytvoreni)}</span>
                      </div>
                      {lead.poznamka && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{lead.poznamka}</p>
                      )}
                      {lead.datumOdevzdaniPodkladu && (
                        <div className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                          Podklady odevzdány: {formatDate(lead.datumOdevzdaniPodkladu)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          window.location.href = `tel:${lead.telefon}`;
                        }}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Kontaktovat
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          navigate(`/lead/${lead.id}`); 
                        }}
                      >
                        Otevřít detail
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}