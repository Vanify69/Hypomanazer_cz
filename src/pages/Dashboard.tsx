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
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">Přehled případů</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Spravujte klienty a jejich hypoteční žádosti</p>
          </div>
          <Link
            to="/new-case"
            className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors font-medium shrink-0"
          >
            <Plus className="w-5 h-5" />
            Nový případ
          </Link>
        </div>
        
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Hledat podle jména..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Hledat podle jména"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Načítání případů…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCases.map((caseData) => (
                <CaseCard key={caseData.id} case={caseData} />
              ))}
            </div>
            {filteredCases.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Žádné případy. Vytvořte první případ tlačítkem Nový případ.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
