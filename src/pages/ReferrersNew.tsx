import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Copy } from 'lucide-react';
import { createReferrer } from '../lib/api';

const TYPES = [
  { value: 'ALLIANZ', label: 'Allianz' },
  { value: 'REAL_ESTATE', label: 'Realitní kancelář' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'INTERNAL', label: 'Interní' },
  { value: 'OTHER', label: 'Jiné' },
];

const PAYOUT_METHODS = [
  { value: 'NONE', label: 'Bez provize' },
  { value: 'BANK_TRANSFER', label: 'Bankovní převod' },
  { value: 'INVOICE', label: 'Faktura' },
];

export function ReferrersNew() {
  const navigate = useNavigate();
  const [type, setType] = useState('OTHER');
  const [displayName, setDisplayName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('NONE');
  const [agreedCommissionPercent, setAgreedCommissionPercent] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [invoiceCompanyName, setInvoiceCompanyName] = useState('');
  const [invoiceIco, setInvoiceIco] = useState('');
  const [invoiceDic, setInvoiceDic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ referrerLink: string; expiresAt: string } | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) {
      setError('Název / jméno tipaře je povinné.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Vyplňte alespoň e-mail nebo telefon.');
      return;
    }
    setLoading(true);
    try {
      const res = await createReferrer({
        type,
        displayName: displayName.trim(),
        registrationNumber: registrationNumber.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        payoutMethod,
        agreedCommissionPercent:
          payoutMethod === 'BANK_TRANSFER' || payoutMethod === 'INVOICE'
            ? (agreedCommissionPercent.trim() === '' ? undefined : Number(agreedCommissionPercent))
            : undefined,
        bankAccount: bankAccount.trim() || undefined,
        invoiceCompanyName: invoiceCompanyName.trim() || undefined,
        invoiceIco: invoiceIco.trim() || undefined,
        invoiceDic: invoiceDic.trim() || undefined,
      });
      setCreated({ referrerLink: res.referrerLink, expiresAt: res.expiresAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vytvoření tipaře se nepodařilo.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!created?.referrerLink) return;
    try {
      await navigator.clipboard.writeText(created.referrerLink);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setError('Kopírování do schránky selhalo.');
    }
  };

  if (created) {
    return (
      <div className="flex-1 bg-gray-50 app-content-dark overflow-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
          <Link to="/referrers" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Zpět na tipaře
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Tipař byl vytvořen</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Odkaz pro tipaře k zadávání leadů (platný do {new Date(created.expiresAt).toLocaleDateString('cs-CZ')}):
            </p>
            <div className="flex gap-2 flex-wrap items-center mb-4">
              <input
                type="text"
                readOnly
                value={created.referrerLink}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Copy className="w-4 h-4" />
                {copyDone ? 'Zkopírováno' : 'Kopírovat'}
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pošlete tento odkaz tipaři e-mailem nebo SMS. Tipař přes něj může zadávat leady a sledovat jejich stav.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 app-content-dark overflow-auto">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <Link to="/referrers" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Zpět na tipaře
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Nový tipař</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Vyplňte údaje partnera. Po uložení získáte odkaz pro zadávání leadů.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Typ tipaře *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Název / jméno *</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registrační číslo</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pro odeslání tipařského linku vyplňte alespoň e-mail nebo telefon.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Způsob provize</label>
              <select
                value={payoutMethod}
                onChange={(e) => {
                  const next = e.target.value;
                  setPayoutMethod(next);
                  if (next !== 'BANK_TRANSFER' && next !== 'INVOICE') setAgreedCommissionPercent('');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYOUT_METHODS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {(payoutMethod === 'BANK_TRANSFER' || payoutMethod === 'INVOICE') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domluvená provize (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={agreedCommissionPercent}
                  onChange={(e) => setAgreedCommissionPercent(e.target.value)}
                  placeholder="např. 1.50"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {payoutMethod === 'BANK_TRANSFER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Číslo účtu</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {payoutMethod === 'INVOICE' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Firma (faktura)</label>
                  <input
                    type="text"
                    value={invoiceCompanyName}
                    onChange={(e) => setInvoiceCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IČO</label>
                  <input
                    type="text"
                    value={invoiceIco}
                    onChange={(e) => setInvoiceIco(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">DIČ</label>
                  <input
                    type="text"
                    value={invoiceDic}
                    onChange={(e) => setInvoiceDic(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Vytvářím…' : 'Vytvořit tipaře'}
              </button>
              <Link to="/referrers" className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Zrušit
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
