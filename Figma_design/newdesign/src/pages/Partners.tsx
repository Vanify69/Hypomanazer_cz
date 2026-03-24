import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, MoreVertical, Edit, Trash2, Phone, Mail, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Partner, PartnerType } from '../lib/types';
import { mockPartners } from '../lib/mockPartnerData';

export function Partners() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    // Načtení z localStorage nebo mock data
    const stored = localStorage.getItem('partners');
    if (stored) {
      setPartners(JSON.parse(stored));
    } else {
      localStorage.setItem('partners', JSON.stringify(mockPartners));
      setPartners(mockPartners);
    }
  }, []);

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = 
      partner.nazev.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.kontakt.telefon?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.kontakt.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || partner.typ === filterType;
    
    return matchesSearch && matchesType;
  });

  const getPartnerTypeBadge = (typ: PartnerType) => {
    const variants: Record<PartnerType, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      REALITKA: { label: 'Realitka', variant: 'default' },
      DEVELOPER: { label: 'Developer', variant: 'secondary' },
      POJISTOVAK: { label: 'Pojišťovák', variant: 'outline' },
      FINANCNI_PORADCE: { label: 'Fin. poradce', variant: 'outline' },
      'JINÝ': { label: 'Jiný', variant: 'outline' },
    };
    return variants[typ];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const handleDelete = (id: string) => {
    if (confirm('Opravdu chcete smazat tohoto tipaře?')) {
      const updated = partners.filter(p => p.id !== id);
      setPartners(updated);
      localStorage.setItem('partners', JSON.stringify(updated));
    }
  };

  return (
    <div className="p-8 space-y-6 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tipaři</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Partneři, kteří vám přivádějí leady</p>
        </div>
        <Button onClick={() => navigate('/new-partner')} className="dark:bg-blue-600 dark:hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nový tipař
        </Button>
      </div>

      {/* Filtry a vyhledávání */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Hledat (název, kontakt...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px] dark:bg-gray-800 dark:border-gray-700 dark:text-white">
            <SelectValue placeholder="Všechny typy" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            <SelectItem value="all">Všechny typy</SelectItem>
            <SelectItem value="REALITKA">Realitka</SelectItem>
            <SelectItem value="DEVELOPER">Developer</SelectItem>
            <SelectItem value="POJISTOVAK">Pojišťovák</SelectItem>
            <SelectItem value="FINANCNI_PORADCE">Finanční poradce</SelectItem>
            <SelectItem value="JINÝ">Jiný</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabulka */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredPartners.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery || filterType !== 'all' 
                ? 'Žádní tipaři nenalezeni' 
                : 'Žádní tipaři. Přidejte prvního tlačítkem Nový tipař.'}
            </p>
            {!searchQuery && filterType === 'all' && (
              <Button onClick={() => navigate('/new-partner')}>
                <Plus className="w-4 h-4 mr-2" />
                Nový tipař
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Název / Jméno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Typ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reg. číslo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Kontakt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Počet leadů
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Vytvořeno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPartners.map((partner) => (
                <tr 
                  key={partner.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/partner/${partner.id}`)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {partner.nazev}
                      </div>
                      {partner.kontakt.osoba && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          {partner.kontakt.osoba}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getPartnerTypeBadge(partner.typ).variant} className="dark:text-gray-300">
                      {getPartnerTypeBadge(partner.typ).label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                    {partner.regCislo || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 text-sm">
                      {partner.kontakt.telefon && (
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Phone className="w-3.5 h-3.5" />
                          {partner.kontakt.telefon}
                        </div>
                      )}
                      {partner.kontakt.email && (
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Mail className="w-3.5 h-3.5" />
                          {partner.kontakt.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {partner.pocetLeadu}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(partner.datumVytvoreni)}
                  </td>
                  <td className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/partner/${partner.id}/edit`);
                          }}
                          className="dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Upravit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(partner.id);
                          }}
                          className="text-red-600 dark:text-red-400 dark:hover:bg-gray-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Smazat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
