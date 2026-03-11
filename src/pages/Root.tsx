import { Outlet } from 'react-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { FileText, Menu } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { TrayIndicator } from '../components/layout/TrayIndicator';
import { useIsDesktop, useIsMobile } from '../components/ui/use-mobile';
import { getActiveCase, saveCase } from '../lib/storage';
import type { Case } from '../lib/types';

const POLL_INTERVAL_MS = 2000;
const POLL_BACKOFF_MS = 15000;
const POLL_BACKOFF_MAX_MS = 300000; // 5 min při opakovaných chybách
const POLL_PAUSE_AFTER_FAILURES = 5; // po N chybách přestat plánovat, obnovit na focus

export function Root() {
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const isTablet = !isMobile && !isDesktop;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleNextRef = useRef<(delay: number) => void>(() => {});
  const failCountRef = useRef(0);
  const mountedRef = useRef(true);

  const checkActiveCase = useCallback(() => {
    if (!mountedRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActiveCase(null);
      if (mountedRef.current) scheduleNextRef.current(POLL_BACKOFF_MS);
      return;
    }
    getActiveCase()
      .then((c) => {
        if (!mountedRef.current) return;
        failCountRef.current = 0;
        setActiveCase(c ?? null);
        scheduleNextRef.current(POLL_INTERVAL_MS);
      })
      .catch((_err) => {
        if (!mountedRef.current) return;
        setActiveCase(null);
        const n = failCountRef.current;
        failCountRef.current = Math.min(n + 1, 10);
        if (n + 1 >= POLL_PAUSE_AFTER_FAILURES) return;
        const delay = Math.min(POLL_BACKOFF_MS * Math.pow(2, n), POLL_BACKOFF_MAX_MS);
        scheduleNextRef.current(delay);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    scheduleNextRef.current = (delay: number) => {
      if (!mountedRef.current) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (mountedRef.current) checkActiveCase();
      }, delay);
    };
    return () => {
      mountedRef.current = false;
    };
  }, [checkActiveCase]);

  useEffect(() => {
    const t = setTimeout(checkActiveCase, 100);
    const onOnline = () => {
      if (!mountedRef.current) return;
      failCountRef.current = 0;
      checkActiveCase();
    };
    const onFocus = () => {
      if (!mountedRef.current) return;
      failCountRef.current = 0;
      checkActiveCase();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(t);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
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
        saveCase(updated).then((c) => {
          if (mountedRef.current) setActiveCase(c);
        });
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

      {/* Na mobilu/tabletu: menu jako sloupec vlevo + obsah vpravo (bez překrývání) */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Mobilní menu – levý sloupec, když je otevřené; obsah se posune doprava (zavření jen přes ikonu v hlavičce) */}
        {mobileMenuOpen && (
          <div
            className="flex shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            style={{ width: 'min(16rem, 85vw)' }}
            role="navigation"
            aria-label="Menu"
          >
            <div className="flex-1 min-h-0 overflow-auto">
              <Sidebar embedded onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Hlavní oblast: mobilní hlavička + obsah (vedle menu, ne pod ním) */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {/* Mobilní hlavička: zavřené = logo + burger vedle loga vpravo + Tray; otevřené = jen Tray (křížek jen u loga ve sidebaru) */}
          <header className="sidebar-mobile-header shrink-0 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 app-safe-area-padding relative z-10">
            {!mobileMenuOpen && (
              <>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate font-semibold text-lg text-gray-900 dark:text-gray-100">HypoManager</h1>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">Zprostředkování hypoték</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 touch-manipulation"
                  aria-label="Otevřít menu"
                  aria-expanded={false}
                >
                  <Menu className="h-6 w-6 pointer-events-none" />
                </button>
              </>
            )}
            <div className="flex-1 min-w-0" />
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
      </div>

      {/* Plovoucí systémová lišta jen na desktopu (lg+) */}
      {isDesktop && <TrayIndicator activeCase={activeCase} variant="floating" />}
    </div>
  );
}
