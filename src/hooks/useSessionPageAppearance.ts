import { useCallback, useState } from 'react';

export type SessionPageAppearance = 'light' | 'dark';

function readInitial(storageKey: string): SessionPageAppearance {
  try {
    const v = sessionStorage.getItem(storageKey);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* private mode / storage blocked */
  }
  return 'light';
}

/**
 * Lokální světlý/tmavý vzhled veřejné stránky (bez změny globálního ThemeProvider).
 * Hodnota v sessionStorage jen pro danou záložku.
 */
export function useSessionPageAppearance(storageKey: string) {
  const [appearance, setAppearanceState] = useState<SessionPageAppearance>(() =>
    readInitial(storageKey)
  );

  const setAppearance = useCallback(
    (next: SessionPageAppearance) => {
      setAppearanceState(next);
      try {
        sessionStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const themeRootClass = appearance === 'light' ? 'intake-force-light' : 'dark';

  return { appearance, setAppearance, themeRootClass };
}
