import { useSessionPageAppearance, type SessionPageAppearance } from './useSessionPageAppearance';

export type IntakeAppearance = SessionPageAppearance;

const INTAKE_SESSION_KEY = 'hypo-intake-appearance';

/** Nahrání podkladů (klient) — výchozí světlý vzhled, volba v session. */
export function useIntakeAppearance() {
  return useSessionPageAppearance(INTAKE_SESSION_KEY);
}
