import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Copy, Send } from 'lucide-react';
import { createLead, sendLeadLink } from '../lib/api';
import { ReferrerSelect } from '../components/leads/ReferrerSelect';
import { SimpleModal } from '../components/modals/SimpleModal';

const LOAN_TYPES = [
  { value: 'PURCHASE', label: 'Koupě' },
  { value: 'REFINANCE', label: 'Refinancování' },
  { value: 'NON_PURPOSE', label: 'Jiný účel' },
];

export function LeadsNew() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loanType, setLoanType] = useState('PURCHASE');
  const [note, setNote] = useState('');
  const [leadFromReferrer, setLeadFromReferrer] = useState(false);
  const [referrer, setReferrer] = useState<{ id: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{
    id: string;
    intakeLink: string;
    expiresAt: string;
  } | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sms: boolean; email: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('Jméno a příjmení jsou povinné.');
      return;
    }
    if (leadFromReferrer && !referrer) {
      setError('Vyberte tipaře nebo zrušte zaškrtnutí „Lead od tipaře“.');
      return;
    }
    setLoading(true);
    try {
      const res = await createLead({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        loanType,
        note: note.trim() || undefined,
        source: leadFromReferrer && referrer ? 'REFERRER' : 'OWN',
        referrerId: leadFromReferrer && referrer ? referrer.id : undefined,
      });
      setCreated({
        id: res.id,
        intakeLink: res.intakeLink,
        expiresAt: res.expiresAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vytvoření leadu se nepodařilo.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!created?.intakeLink) return;
    try {
      await navigator.clipboard.writeText(created.intakeLink);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setError('Kopírování do schránky selhalo.');
    }
  };

  const sendLink = async () => {
    if (!created?.id) return;
    const hasEmail = !!email.trim();
    const hasPhone = !!phone.trim();
    if (!hasEmail && !hasPhone) {
      setError('Pro odeslání linku vyplňte e-mail nebo telefon.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const channels: ('sms' | 'email')[] = [];
      if (hasPhone) channels.push('sms');
      if (hasEmail) channels.push('email');
      const res = await sendLeadLink(created.id, channels);
      setSendResult(res.sent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Odeslání se nepodařilo.');
    } finally {
      setSending(false);
    }
  };

  const getSendSuccessMessage = (sent: { sms: boolean; email: boolean }) => {
    if (sent.sms && sent.email) return 'Klientovi byl odeslán e-mail i SMS s linkem na dodání podkladů.';
    if (sent.email) return 'Klientovi byl odeslán e-mail s linkem na dodání podkladů.';
    if (sent.sms) return 'Klientovi byl odeslán SMS s linkem na dodání podkladů.';
    return 'Odeslání proběhlo.';
  };

  if (created) {
    return (
      <div className="flex-1 bg-gray-50 overflow-auto">
        <div className="max-w-2xl mx-auto p-8">
          <Link
            to="/leads"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zpět na leady
          </Link>
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead byl vytvořen</h2>
            <p className="text-gray-600 mb-4">
              Odkaz pro klienta k nahrání podkladů (platný do{' '}
              {new Date(created.expiresAt).toLocaleDateString('cs-CZ')}):
            </p>
            <div className="flex gap-2 flex-wrap items-center mb-4">
              <input
                type="text"
                readOnly
                value={created.intakeLink}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Copy className="w-4 h-4" />
                {copyDone ? 'Zkopírováno' : 'Kopírovat'}
              </button>
            </div>
            {(email.trim() || phone.trim()) && (
              <button
                type="button"
                onClick={sendLink}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Odesílám…' : 'Poslat link klientovi (SMS / e-mail)'}
              </button>
            )}
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <p className="mt-6 text-sm text-gray-500">
              Odkaz uložte nebo pošlete klientovi. V plné verzi bude odesílání probíhat přes frontu úloh.
            </p>
          </div>
          <SimpleModal
            open={sendResult !== null}
            onClose={() => {
              setSendResult(null);
              navigate('/leads');
            }}
            title="Odesláno"
          >
            {sendResult && (
              <>
                <p className="text-gray-700 mb-4">{getSendSuccessMessage(sendResult)}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSendResult(null);
                    navigate('/leads');
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  OK
                </button>
              </>
            )}
          </SimpleModal>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="max-w-2xl mx-auto p-8">
        <Link
          to="/leads"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na leady
        </Link>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Nový lead</h1>
          <p className="text-gray-600 mb-6">
            Vyplňte údaje klienta. Po uložení získáte odkaz pro nahrání podkladů (intake).
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  Jméno *
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Příjmení *
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              Pro odeslání intake linku klientovi je potřeba vyplnit alespoň e-mail nebo telefon.
            </p>
            <div>
              <label htmlFor="loanType" className="block text-sm font-medium text-gray-700 mb-1">
                Typ úvěru *
              </label>
              <select
                id="loanType"
                value={loanType}
                onChange={(e) => setLoanType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <span className="text-sm font-medium text-gray-700">Lead od tipaře</span>
              </label>
              {leadFromReferrer && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                Poznámka
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Vytvářím…' : 'Vytvořit lead'}
              </button>
              <Link
                to="/leads"
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
