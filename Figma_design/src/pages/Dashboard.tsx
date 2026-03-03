import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { CaseCard } from '../components/cases/CaseCard';
import { getCases, setActiveCase } from '../lib/storage';
import { mockCases } from '../lib/mockData';
import { Case } from '../lib/types';

export function Dashboard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    loadCases();
  }, []);
  
  const loadCases = () => {
    // Verze dat - změňte když se změní struktura dat
    const DATA_VERSION = '2.8';
    const currentVersion = localStorage.getItem('hypo-data-version');
    
    let loadedCases = getCases();
    
    // Inicializace s mock daty, pokud není nic uloženo nebo je stará verze
    if (loadedCases.length === 0 || currentVersion !== DATA_VERSION) {
      loadedCases = mockCases;
      localStorage.setItem('hypo-cases', JSON.stringify(mockCases));
      localStorage.setItem('hypo-data-version', DATA_VERSION);
    }
    
    setCases(loadedCases);
  };
  
  const handleSetActive = (id: string) => {
    setActiveCase(id);
    loadCases(); // Reload cases to update active status
  };
  
  const filteredCases = cases.filter(c =>
    c.jmeno.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Přehled případů</h1>
            <p className="text-gray-600">Spravujte klienty a jejich hypoteční žádosti</p>
          </div>
          
          <Link
            to="/new-case"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nový případ
          </Link>
        </div>
        
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Hledat podle jména..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCases.map((caseData) => (
            <CaseCard key={caseData.id} case={caseData} onSetActive={handleSetActive} />
          ))}
        </div>
        
        {filteredCases.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Žádné případy nenalezeny</p>
          </div>
        )}
      </div>
    </div>
  );
}