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

  const handleBankStatementFiles = async (files: FileList | null) => {
    if (!token || !files?.length || bankStatementSlots.length === 0) return;
    const emptyIndices = bankStatementSlots
      .map((s, i) => (s.status !== 'UPLOADED' ? i : -1))
      .filter((i) => i >= 0);
    const toUpload = Math.min(files.length, emptyIndices.length);
    for (let i = 0; i < toUpload; i++) {
      const slotId = bankStatementSlots[emptyIndices[i]].id;
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

  const handleClearAllBankSlots = async () => {
    if (!token || bankSlotIds.length === 0) return;
    setClearingSlot('bank-all');
    try {
      for (const slotId of bankSlotIds) {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Načítání…</p>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Neplatný nebo vypršený odkaz</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Kontaktujte svého poradce pro nový odkaz na nahrání podkladů.</p>
        </div>
      </div>
    );
  }
  if (submitDone || data?.state === 'SUBMITTED' || data?.state === 'CONVERTED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-green-800 mb-2">Podklady byly odeslány</h1>
          <p className="text-gray-600">Děkujeme. Váš poradce vás bude kontaktovat.</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">IČO *</label>
                <input
                  type="text"
                  value={ico}
                  onChange={(e) => setIco(e.target.value)}
                  placeholder="Např. 12345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-3 mb-8">
            <h2 className="font-medium text-gray-900">Dokumenty</h2>
            <p className="text-sm text-gray-500 sm:hidden">
              Na telefonu u každého tlačítka zvolte „Vyfotit“ nebo „Galerie / Soubory“.
            </p>
            {otherSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    {DOC_LABELS[slot.docType] ?? slot.docType}
                    {slot.required && ' *'}
                  </p>
                  {slot.period && (
                    <p className="text-xs text-gray-500 mt-0.5">Období: {slot.period}</p>
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
            ))}
            {showBankStatements && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    Výpis z účtu (6 výpisů z různých měsíců) *
                  </p>
                </div>
                <div className="flex-shrink-0 w-full sm:w-auto flex items-center gap-2">
                  {bankAllUploaded ? (
                    <>
                      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-200">
                        <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
                        Nahráno 6/6
                      </div>
                      <button
                        type="button"
                        onClick={handleClearAllBankSlots}
                        disabled={clearingSlot === 'bank-all'}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
                          if (files?.length) handleBankStatementFiles(files);
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
                  {bankUploadedCount > 0 && !bankAllUploaded && (
                    <span className="text-sm text-gray-600">Nahráno {bankUploadedCount}/6</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">
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
