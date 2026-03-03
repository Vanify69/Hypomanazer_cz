import { Outlet } from 'react-router';
import { useEffect, useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TrayIndicator } from '../components/layout/TrayIndicator';
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <Outlet />
      <TrayIndicator activeCase={activeCase} />
    </div>
  );
}
