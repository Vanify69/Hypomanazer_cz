import { Outlet } from 'react-router';
import { useEffect, useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { getActiveCase } from '../lib/storage';
import { Case } from '../lib/types';

export function Root() {
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  
  useEffect(() => {
    // Kontrola aktivního případu při načtení a změnách
    const checkActiveCase = () => {
      setActiveCase(getActiveCase());
    };
    
    checkActiveCase();
    
    // Kontrola každou sekundu (pro detekci změn)
    const interval = setInterval(checkActiveCase, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar activeCase={activeCase} />
      <TopBar activeCase={activeCase} />
      <div className="flex-1 mt-14 ml-64">
        <Outlet />
      </div>
    </div>
  );
}