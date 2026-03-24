import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { getLead, updateLead } from '../lib/api';
import { ReferrerSelect } from '../components/leads/ReferrerSelect';

const LOAN_TYPES = [
  { value: 'PURCHASE', label: 'Koupě' },
  { value: 'REFINANCE', label: 'Refinancování' },
  { value: 'NON_PURPOSE', label: 'Jiný účel' },
];

export function LeadsEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loanType, setLoanType] = useState('PURCHASE');
  const [note, setNote] = useState('');
  const [leadFromReferrer, setLeadFromReferrer] = useState(false);
  const [referrer, setReferrer] = useState<{ id: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getLead(id)
      .then((lead) => {
        setFirstName(lead.firstName ?? '');
        setLastName(lead.lastName ?? '');
        setEmail(lead.email ?? '');
        setPhone(lead.phone ?? '');
        setLoanType(lead.loanType ?? 'PURCHASE');
        setNote(lead.note ?? '');
        setLeadFromReferrer(lead.source === 'REFERRER' && !!lead.referrerId);
        setReferrer(lead.referrer ? { id: lead.referrer.id, displayName: lead.referrer.displayName } : null);
      })
      .catch(() => setError('Lead se nepodařilo načíst.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('Jméno a příjmení jsou povinné.');
      return;
    }
    if (leadFromReferrer && !referrer) {
      setError('Vyberte tipaře nebo zrušte zaškrtnutí „Lead od tipaře“.');
      return;
    }
    setSaving(true);
    try {
      await updateLead(id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        loanType,
        note: note.trim() || undefined,
        source: leadFromReferrer ? 'REFERRER' : 'OWN',
        referrerId: leadFromReferrer && referrer ? referrer.id : null,
      });
      navigate('/leads');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení se nepodařilo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 app-content-dark overflow-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="text-gray-500 dark:text-gray-400">Načítání leadu…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 app-content-dark overflow-auto">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <Link
          to="/leads"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na leady
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Upravit lead</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Změňte údaje klienta nebo přiřazení tipaře. Kontakt můžete opravit i po odeslání linku.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jméno *
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Příjmení *
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefon
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pro odeslání intake linku klientovi je potřeba vyplnit alespoň e-mail nebo telefon.
            </p>
            <div>
              <label htmlFor="loanType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Typ úvěru *
              </label>
              <select
                id="loanType"
                value={loanType}
                onChange={(e) => setLoanType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LOAN_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={leadFromReferrer}
                  onChange={(e) => {
                    setLeadFromReferrer(e.target.checked);
                    if (!e.target.checked) setReferrer(null);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lead od tipaře</span>
              </label>
              {leadFromReferrer && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipař
                  </label>
                  <ReferrerSelect
                    value={referrer}
                    onChange={setReferrer}
                    placeholder="Hledat podle jména tipaře…"
                  />
                </div>
              )}
            </div>
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Poznámka
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Ukládám…' : 'Uložit změny'}
              </button>
              <Link
                to="/leads"
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Zrušit
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
