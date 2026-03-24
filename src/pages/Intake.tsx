import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { API_BASE } from '../lib/api';
import { apiRequestPublic } from '../lib/api';

interface UploadSlot {
  id: string;
  personRole: string;
  docType: string;
  period?: string;
  required: boolean;
  status: string;
}

interface IntakeData {
  state: string;
  leadId?: string;
  loanType?: string;
  uploadSlots?: UploadSlot[];
  expiresAt?: string;
  message?: string;
  submittedAt?: string;
}

const DOC_LABELS: Record<string, string> = {
  ID_FRONT: 'OP přední strana',
  ID_BACK: 'OP zadní strana',
  TAX_RETURN: 'Daňové přiznání',
  BANK_STATEMENT: 'Výpis z účtu',
  INCOME_CONFIRMATION: 'Potvrzení o příjmu',
  OTHER: 'Jiný dokument',
};

export function Intake() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<IntakeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCoApplicant, setHasCoApplicant] = useState(false);
  const [incomeType, setIncomeType] = useState<string>('EMPLOYED');
  const [ico, setIco] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [clearingSlot, setClearingSlot] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Chybí odkaz.');
      setLoading(false);
      return;
    }
    apiRequestPublic<IntakeData>(`/api/intake/${token}`)
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Načtení se nepodařilo.');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    apiRequestPublic(`/api/intake/${token}/progress`, {
      method: 'POST',
      body: { hasCoApplicant, incomeType, ico: ico || undefined },
    })
      .then(() => apiRequestPublic<IntakeData>(`/api/intake/${token}`))
      .then(setData)
      .catch(() => {});
  }, [token, hasCoApplicant, incomeType, ico]);

  const handleFile = async (slotId: string, file: File) => {
    if (!token) return;
    setUploadingSlot(slotId);
    const form = new FormData();
    form.append('slotId', slotId);
    form.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/intake/${token}/upload`, {
        method: 'POST',
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Nahrání selhalo.');
      setData((prev) => {
        if (!prev?.uploadSlots) return prev;
        return {
          ...prev,
          uploadSlots: prev.uploadSlots.map((s) =>
            s.id === slotId ? { ...s, status: 'UPLOADED' } : s
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nahrání selhalo.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleClearSlot = async (slotId: string) => {
    if (!token) return;
    setClearingSlot(slotId);
    try {
      await apiRequestPublic(`/api/intake/${token}/slots/${slotId}`, { method: 'DELETE' });
      const updated = await apiRequestPublic<IntakeData>(`/api/intake/${token}`);
      setData(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se zrušit nahrání.');
    } finally {
      setClearingSlot(null);
    }
  };

  const handleBankStatementFiles = async (affectedSlots: UploadSlot[], files: FileList | null) => {
    if (!token || !files?.length || affectedSlots.length === 0) return;
    const emptyIndices = affectedSlots
      .map((s, i) => (s.status !== 'UPLOADED' ? i : -1))
      .filter((i) => i >= 0);
    const toUpload = Math.min(files.length, emptyIndices.length);
    for (let i = 0; i < toUpload; i++) {
      const slotId = affectedSlots[emptyIndices[i]].id;
      setUploadingSlot(slotId);
      const form = new FormData();
      form.append('slotId', slotId);
      form.append('file', files[i]);
      try {
        const res = await fetch(`${API_BASE}/api/intake/${token}/upload`, {
          method: 'POST',
          body: form,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? 'Nahrání selhalo.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nahrání selhalo.');
        setUploadingSlot(null);
        return;
      }
    }
    setUploadingSlot(null);
    const updated = await apiRequestPublic<IntakeData>(`/api/intake/${token}`);
    setData(updated);
  };

  const handleClearBankSlots = async (slotIds: string[]) => {
    if (!token || slotIds.length === 0) return;
    setClearingSlot('bank-all');
    try {
      for (const slotId of slotIds) {
        await apiRequestPublic(`/api/intake/${token}/slots/${slotId}`, { method: 'DELETE' });
      }
      const updated = await apiRequestPublic<IntakeData>(`/api/intake/${token}`);
      setData(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se zrušit nahrání.');
    } finally {
      setClearingSlot(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !consent) return;
    if (incomeType === 'SELF_EMPLOYED' || incomeType === 'BOTH') {
      const icoTrim = ico.trim();
      if (!icoTrim) {
        setError('U OSVČ je IČO povinné. Vyplňte IČO.');
        return;
      }
      if (!/^\d{8}$/.test(icoTrim)) {
        setError('IČO musí mít 8 číslic.');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiRequestPublic<{ ok: boolean; message?: string }>(`/api/intake/${token}/submit`, {
        method: 'POST',
        body: { consent: true, incomeType, ico: ico.trim() || undefined, hasCoApplicant },
      });
      setSubmitDone(true);
      setData((prev) => (prev ? { ...prev, state: 'SUBMITTED' } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Odeslání se nepodařilo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Načítání…</p>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Neplatný nebo vypršený odkaz</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kontaktujte svého poradce pro nový odkaz na nahrání podkladů.</p>
        </div>
      </div>
    );
  }
  if (submitDone || data?.state === 'SUBMITTED' || data?.state === 'CONVERTED') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-2">Podklady byly odeslány</h1>
          <p className="text-gray-600 dark:text-gray-300">Děkujeme. Váš poradce vás bude kontaktovat.</p>
        </div>
      </div>
    );
  }

  const allSlots = data?.uploadSlots ?? [];
  let slotsFiltered =
    incomeType === 'EMPLOYED'
      ? allSlots.filter((s) => s.docType !== 'TAX_RETURN')
      : incomeType === 'SELF_EMPLOYED'
        ? allSlots.filter((s) => s.docType !== 'BANK_STATEMENT')
        : allSlots;
  if (!hasCoApplicant) {
    slotsFiltered = slotsFiltered.filter((s) => s.personRole !== 'CO_APPLICANT');
  }
  const bankStatementSlots = slotsFiltered
    .filter((s) => s.docType === 'BANK_STATEMENT')
    .sort((a, b) => a.id.localeCompare(b.id));
  const otherSlots = slotsFiltered
    .filter((s) => s.docType !== 'BANK_STATEMENT')
    .filter(
      (s, i, arr) =>
        arr.findIndex(
          (x) => x.personRole === s.personRole && x.docType === s.docType
        ) === i
    );
  const bankUploadedCount = bankStatementSlots.filter((s) => s.status === 'UPLOADED').length;
  const showBankStatements = bankStatementSlots.length > 0;
  const bankAllUploaded = showBankStatements && bankUploadedCount === bankStatementSlots.length;
  const bankSlotIds = bankStatementSlots.map((s) => s.id);

  const applicantOtherSlots = otherSlots.filter((s) => s.personRole === 'APPLICANT');
  const coApplicantOtherSlots = otherSlots.filter((s) => s.personRole === 'CO_APPLICANT');
  const applicantBankSlots = bankStatementSlots.filter((s) => s.personRole === 'APPLICANT');
  const coApplicantBankSlots = bankStatementSlots.filter((s) => s.personRole === 'CO_APPLICANT');

  const renderSlotRow = (slot: UploadSlot) => (
    <div
      key={slot.id}
      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-600"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-100">
          {DOC_LABELS[slot.docType] ?? slot.docType}
          {slot.required && ' *'}
        </p>
        {slot.period && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Období: {slot.period}</p>
        )}
      </div>
      <div className="flex-shrink-0 w-full sm:w-auto flex items-center gap-2">
        {slot.status === 'UPLOADED' ? (
          <>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
              Nahráno
            </div>
            <button
              type="button"
              onClick={() => handleClearSlot(slot.id)}
              disabled={clearingSlot === slot.id}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {clearingSlot === slot.id ? '…' : 'Změnit'}
            </button>
          </>
        ) : (
          <label className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm">
            <input
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              disabled={uploadingSlot !== null}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(slot.id, f);
                e.target.value = '';
              }}
            />
            {uploadingSlot === slot.id ? (
              'Nahrávám…'
            ) : (
              <>
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <span>Vybrat soubor</span>
                <span className="text-blue-200 text-xs hidden sm:inline">(foto / galerie)</span>
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );

  const renderBankBlock = (slots: UploadSlot[], sectionKey: string) => {
    if (slots.length === 0) return null;
    const uploaded = slots.filter((s) => s.status === 'UPLOADED').length;
    const allUploaded = uploaded === slots.length;
    const slotIds = slots.map((s) => s.id);
    return (
      <div key={sectionKey} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-600">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-100">
            Výpis z účtu (6 výpisů z různých měsíců) *
          </p>
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto flex items-center gap-2">
          {allUploaded ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 text-sm font-medium border border-green-200 dark:border-green-800">
                <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
                Nahráno 6/6
              </div>
              <button
                type="button"
                onClick={() => handleClearBankSlots(slotIds)}
                disabled={clearingSlot === 'bank-all'}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {clearingSlot === 'bank-all' ? '…' : 'Změnit'}
              </button>
            </>
          ) : (
            <label className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm">
              <input
                type="file"
                accept="image/*,.pdf"
                className="sr-only"
                multiple
                disabled={uploadingSlot !== null}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files?.length) handleBankStatementFiles(slots, files);
                  e.target.value = '';
                }}
              />
              {uploadingSlot ? (
                'Nahrávám…'
              ) : (
                <>
                  <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span>Vybrat až 6 souborů</span>
                </>
              )}
            </label>
          )}
          {uploaded > 0 && !allUploaded && (
            <span className="text-sm text-gray-600 dark:text-gray-300">Nahráno {uploaded}/6</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8 px-4 app-safe-area-padding">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Nahrání podkladů</h1>
          <p className="text-gray-600 mb-6">
            Nahrajte požadované dokumenty podle pokynů. Všechna pole označená * jsou povinná.
          </p>

          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spolužadatel</label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasCoApplicant}
                  onChange={(e) => setHasCoApplicant(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700">Mám spolužadatele</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Typ příjmu</label>
              <select
                value={incomeType}
                onChange={(e) => setIncomeType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EMPLOYED">Zaměstnanec</option>
                <option value="SELF_EMPLOYED">OSVČ</option>
                <option value="BOTH">Obojí</option>
              </select>
            </div>
            {(incomeType === 'SELF_EMPLOYED' || incomeType === 'BOTH') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">IČO *</label>
                <input
                  type="text"
                  value={ico}
                  onChange={(e) => setIco(e.target.value)}
                  placeholder="Např. 12345678"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-6 mb-8">
            <h2 className="font-medium text-gray-900 dark:text-gray-100">Dokumenty</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 sm:hidden">
              Na telefonu u každého tlačítka zvolte „Vyfotit“ nebo „Galerie / Soubory“.
            </p>

            {/* Hlavní žadatel */}
            <section className="space-y-3 rounded-xl border-2 border-blue-100 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/25 p-4">
              <h3 className="text-base font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" aria-hidden />
                Hlavní žadatel
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Dokumenty hlavního žadatele (OP, daňové přiznání, výpisy)</p>
              <div className="space-y-3">
                {applicantOtherSlots.map((slot) => renderSlotRow(slot))}
                {renderBankBlock(applicantBankSlots, 'bank-applicant')}
              </div>
            </section>

            {/* Spolužadatel – jen když má spolužadatele */}
            {hasCoApplicant && (coApplicantOtherSlots.length > 0 || coApplicantBankSlots.length > 0) && (
              <section className="space-y-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/40 p-4">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" aria-hidden />
                  Spolužadatel
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Dokumenty spolužadatele (OP, daňové přiznání, výpisy)</p>
                <div className="space-y-3">
                  {coApplicantOtherSlots.map((slot) => renderSlotRow(slot))}
                  {renderBankBlock(coApplicantBankSlots, 'bank-coapplicant')}
                </div>
              </section>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Souhlasím se zpracováním osobních údajů v rozsahu nezbytném pro posouzení mé žádosti (GDPR).
              </span>
            </label>
            <button
              type="submit"
              disabled={!consent || submitting}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Odesílám…' : 'Odeslat podklady'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
