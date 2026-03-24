import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Case, CaseBusinessStatus } from '../lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export function Cases() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cases, setCases] = useState<Case[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const loadedCases = localStorage.getItem('cases');
    setCases(loadedCases ? JSON.parse(loadedCases) : []);

    // Aplikovat filter z URL parametrů
    const filter = searchParams.get('filter');
    if (filter === 'active') {
      setStatusFilter('active');
    } else if (filter === 'closed') {
      setStatusFilter('closed');
    }
  }, [searchParams]);

  const getStatusBadge = (status?: CaseBusinessStatus) => {
    if (!status) return { label: 'Neznámý', variant: 'outline' as const };

    const variants: Record<CaseBusinessStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      NEW: { label: 'Nový', variant: 'default' },
      DATA_EXTRACTED: { label: 'Data vytažena', variant: 'default' },
      SENT_TO_BANK: { label: 'Odesláno do banky', variant: 'secondary' },
      APPROVED: { label: 'Schváleno', variant: 'default' },
      SIGNED_BY_CLIENT: { label: 'Podepsáno klientem', variant: 'default' },
      CLOSED: { label: 'Uzavřeno', variant: 'default' },
      LOST: { label: 'Ztraceno', variant: 'destructive' },
    };
    return variants[status];
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Neuvedeno';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.jmeno.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') {
      return matchesSearch && c.businessStatus && 
        ['NEW', 'DATA_EXTRACTED', 'SENT_TO_BANK', 'APPROVED', 'SIGNED_BY_CLIENT'].includes(c.businessStatus);
    }
    if (statusFilter === 'closed') {
      return matchesSearch && c.businessStatus && ['CLOSED', 'LOST'].includes(c.businessStatus);
    }
    
    return matchesSearch && c.businessStatus === statusFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Případy</h1>
              <p className="text-gray-600 dark:text-gray-400">Správa všech hypotečních případů</p>
            </div>
            <Button onClick={() => navigate('/new-case')} className="dark:bg-blue-600 dark:hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nový případ
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
                  placeholder="Hledat podle jména..."
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
                  <SelectItem value="active">Aktivní případy</SelectItem>
                  <SelectItem value="NEW">Nové</SelectItem>
                  <SelectItem value="DATA_EXTRACTED">Data vytažena</SelectItem>
                  <SelectItem value="SENT_TO_BANK">Odesláno do banky</SelectItem>
                  <SelectItem value="APPROVED">Schváleno</SelectItem>
                  <SelectItem value="SIGNED_BY_CLIENT">Podepsáno klientem</SelectItem>
                  <SelectItem value="closed">Uzavřené</SelectItem>
                  <SelectItem value="LOST">Ztracené</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Seznam případů */}
        {filteredCases.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Žádné případy nenalezeny' 
                    : 'Zatím nemáte žádné případy'}
                </p>
                <Button onClick={() => navigate('/new-case')} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Vytvořit první případ
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCases.map((caseItem) => (
              <Card 
                key={caseItem.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/case/${caseItem.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{caseItem.jmeno}</h3>
                        <Badge variant={getStatusBadge(caseItem.businessStatus).variant}>
                          {getStatusBadge(caseItem.businessStatus).label}
                        </Badge>
                        {caseItem.isActive && (
                          <Badge variant="default">Aktivní</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        <span>Vytvořeno: {formatDate(caseItem.datum)}</span>
                        <span>Výše úvěru: {formatCurrency(caseItem.vyseUveru)}</span>
                        {caseItem.ucel && <span>Účel: {caseItem.ucel}</span>}
                      </div>
                      {caseItem.applicants && caseItem.applicants.length > 0 && (
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Počet žadatelů: {caseItem.applicants.length}
                        </div>
                      )}
                    </div>
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/case/${caseItem.id}`); }}>
                      Detail
                    </Button>
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