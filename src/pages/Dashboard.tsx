import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { CaseCard } from '../components/cases/CaseCard';
import { getCases } from '../lib/storage';
import { Case } from '../lib/types';

export function Dashboard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCases()
      .then(setCases)
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);
  
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
              aria-label="Hledat podle jména"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12 text-gray-500">Načítání případů…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCases.map((caseData) => (
                <CaseCard key={caseData.id} case={caseData} />
              ))}
            </div>
            {filteredCases.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Žádné případy. Vytvořte první případ tlačítkem Nový případ.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
