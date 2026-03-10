import { Outlet } from 'react-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TrayIndicator } from '../components/layout/TrayIndicator';
import { getActiveCase, saveCase } from '../lib/storage';
import type { Case } from '../lib/types';

const POLL_INTERVAL_MS = 2000;
const POLL_BACKOFF_MS = 15000;

export function Root() {
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleNextRef = useRef<(delay: number) => void>(() => {});

  const checkActiveCase = useCallback(() => {
    getActiveCase()
      .then((c) => {
        setActiveCase(c);
        scheduleNextRef.current(POLL_INTERVAL_MS);
      })
      .catch(() => {
        setActiveCase(null);
        scheduleNextRef.current(POLL_BACKOFF_MS);
      });
  }, []);

  useEffect(() => {
    scheduleNextRef.current = (delay: number) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        checkActiveCase();
      }, delay);
    };
  }, [checkActiveCase]);

  useEffect(() => {
    checkActiveCase();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [checkActiveCase]);

  useEffect(() => {
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCase]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <Outlet />
      <TrayIndicator activeCase={activeCase} />
    </div>
  );
}
