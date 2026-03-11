import { Outlet } from 'react-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { TrayIndicator } from '../components/layout/TrayIndicator';
import { Sheet, SheetContent } from '../components/ui/sheet';
import { useIsDesktop, useIsMobile } from '../components/ui/use-mobile';
import { getActiveCase, saveCase } from '../lib/storage';
import type { Case } from '../lib/types';

const POLL_INTERVAL_MS = 2000;
const POLL_BACKOFF_MS = 15000;

export function Root() {
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const isTablet = !isMobile && !isDesktop;
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar jen na desktopu (lg 1024px+) – na mobilu i tabletu skrytý, menu v burgeru */}
      <div className="sidebar-desktop-only shrink-0">
        <Sidebar traySlot={isTablet ? <TrayIndicator activeCase={activeCase} variant="embedded" /> : undefined} />
      </div>

      {/* Mobilní menu – Sheet zleva */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 max-w-[85vw] p-0 gap-0">
          <Sidebar embedded onClose={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Hlavní oblast: mobilní hlavička + obsah */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobilní hlavička s burgerem – zobrazit do 1024px, nad tím skrýt */}
        <header className="sidebar-mobile-header shrink-0 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 app-safe-area-padding">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Otevřít menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">HypoManager</span>
          {isMobile && (
            <div className="shrink-0">
              <TrayIndicator activeCase={activeCase} variant="embedded" />
            </div>
          )}
        </header>

        <main className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Plovoucí systémová lišta jen na desktopu (lg+) */}
      {isDesktop && <TrayIndicator activeCase={activeCase} variant="floating" />}
    </div>
  );
}
