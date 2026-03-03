import { Outlet } from 'react-router';
import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TrayIndicator } from '../components/layout/TrayIndicator';
import { getActiveCase, saveCase } from '../lib/storage';
import type { Case } from '../lib/types';

export function Root() {
  const [activeCase, setActiveCase] = useState<Case | null>(null);

  const checkActiveCase = useCallback(() => {
    getActiveCase()
      .then(setActiveCase)
      .catch(() => setActiveCase(null));
  }, []);

  useEffect(() => {
    checkActiveCase();
    const interval = setInterval(checkActiveCase, 2000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Tab' && activeCase?.applicants && activeCase.applicants.length > 1) {
        e.preventDefault();
        const applicants = activeCase.applicants;
        const currentIndex = applicants.findIndex((a) => a.id === activeCase.activeApplicantId);
        const nextIndex = (currentIndex < 0 ? 0 : currentIndex + 1) % applicants.length;
        const next = applicants[nextIndex];
        const updated: Case = { ...activeCase, activeApplicantId: next.id };
        saveCase(updated).then(setActiveCase);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCase, checkActiveCase]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <Outlet />
      <TrayIndicator activeCase={activeCase} />
    </div>
  );
}
