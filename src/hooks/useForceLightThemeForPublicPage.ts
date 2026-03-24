import { useTheme } from 'next-themes';
import { useLayoutEffect, useRef } from 'react';

/** Musí odpovídat `storageKey` v `App.tsx` (`ThemeProvider`). */
const THEME_STORAGE_KEY = 'hypo-theme';

/**
 * Veřejné stránky (intake, ref): vždy světlé UI bez ohledu na systém / uložené téma.
 * Po opuštění stránky obnoví hodnotu z localStorage (dark / light / system).
 */
export function useForceLightThemeForPublicPage() {
  const { setTheme } = useTheme();
  const prevRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    try {
      prevRef.current = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      prevRef.current = null;
    }
    setTheme('light');
    return () => {
      const p = prevRef.current;
      setTheme(p && p !== '' ? p : 'system');
    };
  }, [setTheme]);
}
