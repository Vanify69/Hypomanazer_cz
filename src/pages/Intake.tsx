import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  Users,
  Home,
  FileCheck,
} from 'lucide-react';
import { API_BASE, apiRequestPublic } from '../lib/api';
import { PublicPageThemeToggle } from '../components/public/PublicPageThemeToggle';
import { useIntakeAppearance } from '../hooks/useIntakeAppearance';
import { IntakeStepper } from '../components/intake/IntakeStepper';
import { PersonSwitcher } from '../components/intake/PersonSwitcher';
import { DocumentUpload } from '../components/intake/DocumentUpload';
import { DocumentChecklist, type ChecklistItem } from '../components/intake/DocumentChecklist';
import {
  CO_APPLICANT_ID,
  INCOME_TYPE_LABELS,
  MAIN_APPLICANT_ID,
  RELATION_TYPE_LABELS,
  type ApiPersonRole,
  type HouseholdData,
  type RelationType,
  type WizardIncomeType,
} from '../lib/intakeWizardTypes';
import {
  bankSlotsForRole,
  countBankUploaded,
  getMissingItemsFromSlots,
  isHouseholdComplete,
  isPersonDocsCompleteFromSlots,
  isWizardIntakeComplete,
  opBackSlot,
  opFrontSlot,
  taxSlotForRole,
  wizardIncomeNeedsIco,
  wizardIncomeToApi,
  type UploadSlotView,
} from '../lib/intakeSlotsAdapter';

const WIZARD_STEPS = [
  { number: 1, label: 'Úvod' },
  { number: 2, label: 'Žadatelé' },
  { number: 3, label: 'Dokumenty' },
  { number: 4, label: 'Ostatní' },
  { number: 5, label: 'Shrnutí' },
];

interface IntakeData {
  state: string;
  leadId?: string;
  loanType?: string;
  uploadSlots?: UploadSlotView[];
  expiresAt?: string;
  message?: string;
  submittedAt?: string;
}

export function Intake() {
  const { appearance, setAppearance, themeRootClass } = useIntakeAppearance();
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<IntakeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [hasCoApplicant, setHasCoApplicant] = useState(false);
  const [coRelation, setCoRelation] = useState<RelationType | undefined>(undefined);
  const [mainIncome, setMainIncome] = useState<WizardIncomeType>('ZAMESTNANEC');
  const [coIncome, setCoIncome] = useState<WizardIncomeType>('ZAMESTNANEC');
  const [currentPersonId, setCurrentPersonId] = useState(MAIN_APPLICANT_ID);
  const [mainIco, setMainIco] = useState('');
  const [coIco, setCoIco] = useState('');
  const [household, setHousehold] = useState<HouseholdData>({});
  const [poznamka, setPoznamka] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [clearingSlot, setClearingSlot] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    const next = await apiRequestPublic<IntakeData>(`/api/intake/${token}`);
    setData(next);
  }, [token]);

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
    if (!token || loading) return;
    apiRequestPublic(`/api/intake/${token}/progress`, {
      method: 'POST',
      body: {
        hasCoApplicant,
        incomeType: wizardIncomeToApi(mainIncome),
        coApplicantIncomeType: wizardIncomeToApi(coIncome),
        ico: mainIco.trim() || undefined,
      },
    })
      .then(() => refresh())
      .catch(() => {});
  }, [token, loading, hasCoApplicant, mainIncome, coIncome, mainIco, refresh]);

  const allSlots = data?.uploadSlots ?? [];

  const getPersonRole = (personId: string): ApiPersonRole =>
    personId === MAIN_APPLICANT_ID ? 'APPLICANT' : 'CO_APPLICANT';

  const getPersonIncome = (personId: string): WizardIncomeType =>
    personId === MAIN_APPLICANT_ID ? mainIncome : coIncome;

  const getPersonLabel = (personId: string): string => {
    if (personId === MAIN_APPLICANT_ID) return 'Hlavní žadatel';
    if (coRelation) return RELATION_TYPE_LABELS[coRelation];
    return 'Spolužadatel';
  };

  const uploadToSlot = async (slotId: string, file: File) => {
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
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nahrání selhalo.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const clearSlot = async (slotId: string) => {
    if (!token) return;
    setClearingSlot(slotId);
    try {
      await apiRequestPublic(`/api/intake/${token}/slots/${slotId}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se zrušit nahrání.');
    } finally {
      setClearingSlot(null);
    }
  };

  const clearAllBankForRole = async (role: ApiPersonRole) => {
    if (!token) return;
    const ids = bankSlotsForRole(allSlots, role)
      .filter((s) => s.status === 'UPLOADED')
      .map((s) => s.id);
    setClearingSlot('bank');
    try {
      for (const id of ids) {
        await apiRequestPublic(`/api/intake/${token}/slots/${id}`, { method: 'DELETE' });
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se zrušit nahrání.');
    } finally {
      setClearingSlot(null);
    }
  };

  const handleBankPick = async (role: ApiPersonRole, fileList: FileList) => {
    const empty = bankSlotsForRole(allSlots, role).filter((s) => s.status !== 'UPLOADED');
    const files = Array.from(fileList);
    const n = Math.min(files.length, empty.length);
    for (let i = 0; i < n; i++) {
      await uploadToSlot(empty[i].id, files[i]);
    }
  };

  const needsMainIcoField = wizardIncomeNeedsIco(mainIncome);
  const needsCoIcoField = hasCoApplicant && wizardIncomeNeedsIco(coIncome);

  const icosStepComplete = useMemo(() => {
    if (needsMainIcoField && !/^\d{8}$/.test(mainIco.trim())) return false;
    if (needsCoIcoField && !/^\d{8}$/.test(coIco.trim())) return false;
    return true;
  }, [needsMainIcoField, needsCoIcoField, mainIco, coIco]);

  const coRelationOk = !hasCoApplicant || coRelation !== undefined;

  const canProceed = () => {
    if (currentStep === 2) return coRelationOk;
    if (currentStep === 3) {
      const mainOk = isPersonDocsCompleteFromSlots(allSlots, 'APPLICANT', mainIncome);
      const coOk =
        !hasCoApplicant || isPersonDocsCompleteFromSlots(allSlots, 'CO_APPLICANT', coIncome);
      return mainOk && coOk;
    }
    if (currentStep === 4) return isHouseholdComplete(household) && icosStepComplete;
    return true;
  };

  const checklistItemsForPerson = (personId: string): ChecklistItem[] => {
    const role = getPersonRole(personId);
    const inc = getPersonIncome(personId);
    const api = wizardIncomeToApi(inc);
    const items: ChecklistItem[] = [
      {
        id: 'op-front',
        label: 'OP přední strana',
        required: true,
        completed: opFrontSlot(allSlots, role)?.status === 'UPLOADED',
      },
      {
        id: 'op-back',
        label: 'OP zadní strana',
        required: true,
        completed: opBackSlot(allSlots, role)?.status === 'UPLOADED',
      },
    ];
    if (api === 'EMPLOYED') {
      const up = countBankUploaded(allSlots, role);
      items.push({
        id: 'bank',
        label: 'Výpisy z účtu',
        required: true,
        completed: up >= 6,
        count: up,
        target: 6,
      });
    } else {
      items.push({
        id: 'tax',
        label: api === 'COMPANY' ? 'DPPO' : 'DPFO',
        required: true,
        completed: taxSlotForRole(allSlots, role)?.status === 'UPLOADED',
      });
    }
    return items;
  };

  const personTabs = useMemo(() => {
    const tabs = [
      {
        id: MAIN_APPLICANT_ID,
        label: 'Hlavní žadatel',
        isComplete: isPersonDocsCompleteFromSlots(allSlots, 'APPLICANT', mainIncome),
        missingCount: getMissingItemsFromSlots(allSlots, 'APPLICANT', mainIncome).length,
      },
    ];
    if (hasCoApplicant) {
      tabs.push({
        id: CO_APPLICANT_ID,
        label: coRelation ? RELATION_TYPE_LABELS[coRelation] : 'Spolužadatel',
        isComplete: isPersonDocsCompleteFromSlots(allSlots, 'CO_APPLICANT', coIncome),
        missingCount: getMissingItemsFromSlots(allSlots, 'CO_APPLICANT', coIncome).length,
      });
    }
    return tabs;
  }, [allSlots, hasCoApplicant, mainIncome, coIncome, coRelation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !consent) return;
    if (needsMainIcoField) {
      const t = mainIco.trim();
      if (!/^\d{8}$/.test(t)) {
        setError('Vyplňte platné IČO hlavního žadatele (8 číslic).');
        return;
      }
    }
    if (needsCoIcoField) {
      const t = coIco.trim();
      if (!/^\d{8}$/.test(t)) {
        setError('Vyplňte platné IČO spolužadatele (8 číslic).');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiRequestPublic<{ ok: boolean; message?: string }>(`/api/intake/${token}/submit`, {
        method: 'POST',
        body: {
          consent: true,
          incomeType: wizardIncomeToApi(mainIncome),
          coApplicantIncomeType: hasCoApplicant ? wizardIncomeToApi(coIncome) : undefined,
          ico: needsMainIcoField ? mainIco.trim() : undefined,
          coApplicantIco: needsCoIcoField ? coIco.trim() : undefined,
          hasCoApplicant,
          coApplicantRelation: coRelation,
          household: {
            existujiciUvery: household.existujiciUvery,
            mesicniSplatky: household.mesicniSplatky,
            pocetVyzivanychOsob: household.pocetVyzivanychOsob,
            dalsiZavazky: household.dalsiZavazky,
          },
          poznamka: poznamka.trim() || undefined,
        },
      });
      setSubmitDone(true);
      setData((prev) => (prev ? { ...prev, state: 'SUBMITTED' } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Odeslání se nepodařilo.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAppearance = () => setAppearance(appearance === 'light' ? 'dark' : 'light');
  const busyOps = uploadingSlot !== null || clearingSlot !== null;

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

  if (error && !data) {
    return (
      <div className={themeRootClass}>
        <PublicPageThemeToggle appearance={appearance} onToggle={toggleAppearance} />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 max-w-md text-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Neplatný nebo vypršený odkaz
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Kontaktujte svého poradce pro nový odkaz na nahrání podkladů.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (submitDone || data?.state === 'SUBMITTED' || data?.state === 'CONVERTED') {
    return (
      <div className={themeRootClass}>
        <PublicPageThemeToggle appearance={appearance} onToggle={toggleAppearance} />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Podklady jsme přijali!
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Děkujeme za odeslání dokumentů. Údaje z dokladů nyní zpracováváme.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Co se děje dál?
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>Zpracujeme data z nahraných dokumentů.</li>
                  <li>Posoudíme bonitu a připravíme další kroky.</li>
                  <li>Ozveme se vám v případě potřeby doplnění.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const wizardComplete =
    isWizardIntakeComplete(
      allSlots,
      hasCoApplicant,
      mainIncome,
      hasCoApplicant ? coIncome : undefined,
      household,
      coRelationOk
    ) && icosStepComplete;

  const renderDocStepForPerson = (personId: string) => {
    const role = getPersonRole(personId);
    const inc = getPersonIncome(personId);
    const api = wizardIncomeToApi(inc);
    const front = opFrontSlot(allSlots, role);
    const back = opBackSlot(allSlots, role);
    const tax = taxSlotForRole(allSlots, role);
    const banks = bankSlotsForRole(allSlots, role);
    const bankUp = countBankUploaded(allSlots, role);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {(Object.entries(INCOME_TYPE_LABELS) as [WizardIncomeType, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (personId === MAIN_APPLICANT_ID) setMainIncome(value);
                else setCoIncome(value);
              }}
              className={`px-4 py-3 border-2 rounded-lg transition-all text-sm font-medium ${
                inc === value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <DocumentUpload
          label="Občanský průkaz – přední strana"
          required
          hint="Údaje z dokladu doplníme po odeslání podkladů"
          serverComplete={front?.status === 'UPLOADED'}
          uploading={busyOps && front?.id === uploadingSlot}
          disabled={busyOps}
          onPickFiles={(fl) => front && uploadToSlot(front.id, fl[0])}
          onClear={() => front && clearSlot(front.id)}
        />
        <DocumentUpload
          label="Občanský průkaz – zadní strana"
          required
          serverComplete={back?.status === 'UPLOADED'}
          uploading={busyOps && back?.id === uploadingSlot}
          disabled={busyOps}
          onPickFiles={(fl) => back && uploadToSlot(back.id, fl[0])}
          onClear={() => back && clearSlot(back.id)}
        />

        {api === 'EMPLOYED' && (
          <DocumentUpload
            label="Výpisy z účtu (6 měsíců)"
            required
            multiple
            hint="Nahrajte 6 výpisů z účtu, kam chodí výplata"
            multiProgress={{ uploaded: bankUp, total: 6 }}
            uploading={busyOps}
            disabled={busyOps}
            onPickFiles={(fl) => handleBankPick(role, fl)}
            onClear={() => clearAllBankForRole(role)}
          />
        )}

        {(api === 'SELF_EMPLOYED' || api === 'COMPANY') && !tax && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Načítám požadavky na dokumenty…</p>
        )}
        {(api === 'SELF_EMPLOYED' || api === 'COMPANY') && tax && (
          <DocumentUpload
            label={api === 'COMPANY' ? 'Daňové přiznání PO (DPPO)' : 'Daňové přiznání FO (DPFO)'}
            required
            serverComplete={tax.status === 'UPLOADED'}
            uploading={busyOps && tax.id === uploadingSlot}
            disabled={busyOps}
            onPickFiles={(fl) => uploadToSlot(tax.id, fl[0])}
            onClear={() => clearSlot(tax.id)}
          />
        )}

        <DocumentChecklist title="Stav dokumentů" items={checklistItemsForPerson(personId)} />
      </div>
    );
  };

  return (
    <div className={themeRootClass}>
      <PublicPageThemeToggle appearance={appearance} onToggle={toggleAppearance} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <IntakeStepper currentStep={currentStep} steps={WIZARD_STEPS} />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="py-6 sm:py-8 pb-28">
          {currentStep === 1 && (
            <div className="mx-auto w-full max-w-2xl">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                  Proces zabere cca 2–5 minut. Nahrajte dokumenty a doplníte základní informace.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8 text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Co budete potřebovat</h3>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>Občanský průkaz (obě strany) u každého žadatele</li>
                    <li>Doklady k příjmu (výpisy nebo daňové přiznání podle typu příjmu)</li>
                    <li>Ostatní údaje (domácnost, IČO u OSVČ nebo firmy)</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Začít
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="mx-auto w-full max-w-2xl space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Kdo vstupuje do případu?</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Maximálně jeden spolužadatel (stejně jako v systému poradce).
                    </p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setHasCoApplicant(false);
                      setCoRelation(undefined);
                      setCurrentPersonId(MAIN_APPLICANT_ID);
                    }}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      !hasCoApplicant
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Pouze hlavní žadatel</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Žádám o hypotéku sám/sama</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasCoApplicant(true)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      hasCoApplicant
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Hlavní žadatel + spolužadatel
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Manžel/ka, partner/ka, rodina…</p>
                  </button>
                </div>
                {hasCoApplicant && (
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Vztah spolužadatele k hlavnímu žadateli <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(RELATION_TYPE_LABELS) as [RelationType, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setCoRelation(value)}
                          className={`px-3 py-2 border rounded-lg text-sm transition-all ${
                            coRelation === value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <PersonSwitcher
                persons={personTabs}
                currentPersonId={currentPersonId}
                onSelectPerson={setCurrentPersonId}
              />
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                  Dokumenty – {getPersonLabel(currentPersonId)}
                </h2>
                {renderDocStepForPerson(currentPersonId)}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="mx-auto w-full max-w-2xl space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ostatní</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      IČO, domácnost a sdílené finanční údaje
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  {needsMainIcoField && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        IČO – hlavní žadatel ({mainIncome === 'FIRMA' ? 'firma' : 'OSVČ'}){' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={mainIco}
                        onChange={(e) => setMainIco(e.target.value)}
                        placeholder="12345678"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  {needsCoIcoField && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        IČO – spolužadatel ({coIncome === 'FIRMA' ? 'firma' : 'OSVČ'}){' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={coIco}
                        onChange={(e) => setCoIco(e.target.value)}
                        placeholder="12345678"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Domácnost</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Máte existující úvěry? <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setHousehold((h) => ({ ...h, existujiciUvery: false, mesicniSplatky: undefined }))
                        }
                        className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                          household.existujiciUvery === false
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-gray-900 dark:text-gray-100">Ne, nemám žádné úvěry</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHousehold((h) => ({ ...h, existujiciUvery: true }))}
                        className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                          household.existujiciUvery === true
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-gray-900 dark:text-gray-100">Ano, mám úvěry</span>
                      </button>
                    </div>
                  </div>
                  {household.existujiciUvery === true && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Celková měsíční splátka (Kč)
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder="např. 15000"
                        value={household.mesicniSplatky ?? ''}
                        onChange={(e) =>
                          setHousehold((h) => ({
                            ...h,
                            mesicniSplatky: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          }))
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Počet vyživovaných osob
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={household.pocetVyzivanychOsob ?? ''}
                      onChange={(e) =>
                        setHousehold((h) => ({
                          ...h,
                          pocetVyzivanychOsob: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        }))
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Další závazky (nepovinné)
                    </label>
                    <textarea
                      rows={3}
                      value={household.dalsiZavazky ?? ''}
                      onChange={(e) => setHousehold((h) => ({ ...h, dalsiZavazky: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="mx-auto w-full max-w-2xl space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Shrnutí</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Zkontrolujte údaje před odesláním</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div
                    className={`p-4 border-2 rounded-lg ${
                      isPersonDocsCompleteFromSlots(allSlots, 'APPLICANT', mainIncome)
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Hlavní žadatel</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{INCOME_TYPE_LABELS[mainIncome]}</p>
                  </div>
                  {hasCoApplicant && (
                    <div
                      className={`p-4 border-2 rounded-lg ${
                        isPersonDocsCompleteFromSlots(allSlots, 'CO_APPLICANT', coIncome)
                          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                          : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {coRelation ? RELATION_TYPE_LABELS[coRelation] : 'Spolužadatel'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{INCOME_TYPE_LABELS[coIncome]}</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {needsMainIcoField && (
                    <p>
                      IČO hlavní žadatel: {/^\d{8}$/.test(mainIco.trim()) ? mainIco.trim() : '—'}
                    </p>
                  )}
                  {needsCoIcoField && (
                    <p>
                      IČO spolužadatel: {/^\d{8}$/.test(coIco.trim()) ? coIco.trim() : '—'}
                    </p>
                  )}
                  <p>
                    Existující úvěry:{' '}
                    {household.existujiciUvery === undefined
                      ? '—'
                      : household.existujiciUvery
                        ? 'Ano'
                        : 'Ne'}
                  </p>
                  {household.existujiciUvery === true && household.mesicniSplatky != null && (
                    <p>Měsíční splátky: {household.mesicniSplatky.toLocaleString('cs-CZ')} Kč</p>
                  )}
                  {household.pocetVyzivanychOsob != null && (
                    <p>Vyživované osoby: {household.pocetVyzivanychOsob}</p>
                  )}
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Poznámka (nepovinné)
                  </label>
                  <textarea
                    rows={3}
                    value={poznamka}
                    onChange={(e) => setPoznamka(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <form id="intake-final-submit" onSubmit={handleSubmit} className="mt-8 space-y-4">
                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Souhlasím se zpracováním osobních údajů v rozsahu nezbytném pro posouzení žádosti (GDPR).
                    </span>
                  </label>
                </form>
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 w-full bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-700 backdrop-blur-sm z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                Zpět
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold"
                >
                  Pokračovat
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="intake-final-submit"
                  disabled={!wizardComplete || !consent || submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm"
                >
                  <CheckCircle className="w-5 h-5" />
                  {submitting ? 'Odesílám…' : 'Odeslat podklady'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
