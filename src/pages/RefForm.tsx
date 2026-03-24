import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { apiRequestPublic } from '../lib/api';
import { PublicPageThemeToggle } from '../components/public/PublicPageThemeToggle';
import { useSessionPageAppearance } from '../hooks/useSessionPageAppearance';

const REF_FORM_APPEARANCE_KEY = 'hypo-ref-form-appearance';

const LOAN_TYPES = [
  { value: 'PURCHASE', label: 'Koupě' },
  { value: 'REFINANCE', label: 'Refinancování' },
  { value: 'NON_PURPOSE', label: 'Jiný účel' },
];

const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
const fieldCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

export function RefForm() {
  const { appearance, setAppearance, themeRootClass } = useSessionPageAppearance(REF_FORM_APPEARANCE_KEY);
  const { token } = useParams<{ token: string }>();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loanType, setLoanType] = useState('PURCHASE');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const toggleAppearance = () => setAppearance(appearance === 'light' ? 'dark' : 'light');

  useEffect(() => {
    if (!token) {
      setError('Chybí odkaz.');
      setLoading(false);
      return;
    }
    apiRequestPublic<{ displayName: string; valid: boolean }>(`/api/ref/${token}`)
      .then((d) => setDisplayName(d.displayName))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Neplatný odkaz.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !consent) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError('Jméno a příjmení klienta jsou povinné.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Vyplňte alespoň e-mail nebo telefon klienta.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiRequestPublic(`/api/ref/${token}/leads`, {
        method: 'POST',
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          loanType,
          note: note.trim() || undefined,
          consent: true,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Odeslání se nepodařilo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={themeRootClass}>
        <PublicPageThemeToggle appearance={appearance} onToggle={toggleAppearance} />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Načítání…</p>
        </div>
      </div>
    );
  }
  if (error && !displayName) {
    return (
      <div className={themeRootClass}>
        <PublicPageThemeToggle appearance={appearance} onToggle={toggleAppearance} />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 max-w-md text-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Neplatný odkaz</h1>
            <p className="text-gray-600 dark:text-gray-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  if (done) {
    return (
      <div className={themeRootClass}>
        <PublicPageThemeToggle appearance={appearance} onToggle={toggleAppearance} />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 max-w-md text-center">
            <h1 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-2">Lead byl odeslán</h1>
            <p className="text-gray-600 dark:text-gray-300">Děkujeme. Poradce bude klienta kontaktovat.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={themeRootClass}>
      <PublicPageThemeToggle appearance={appearance} onToggle={toggleAppearance} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Zadat nový lead</h1>
            {displayName && (
              <p className="text-gray-600 dark:text-gray-300 mb-6">Pro: {displayName}</p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Jméno klienta *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={fieldCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Příjmení klienta *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={fieldCls}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>E-mail klienta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls}>Telefon klienta</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={fieldCls}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Alespoň e-mail nebo telefon je povinný.</p>
              <div>
                <label className={labelCls}>Typ úvěru</label>
                <select value={loanType} onChange={(e) => setLoanType(e.target.value)} className={fieldCls}>
                  {LOAN_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Poznámka</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={fieldCls} />
              </div>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Klient souhlasí se sdílením kontaktu s poradcem (nebo to potvrzuji jako tipař).
                </span>
              </label>
              <button
                type="submit"
                disabled={!consent || submitting}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Odesílám…' : 'Odeslat lead'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
