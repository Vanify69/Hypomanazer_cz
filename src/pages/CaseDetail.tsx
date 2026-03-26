import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Star,
  FileText,
  Building2,
  Save,
  Trash2,
  Eye,
  UserPlus,
  Upload,
  User,
  CreditCard,
  FileBarChart,
  FolderOpen,
  Pencil,
  RotateCw,
  Receipt,
  Landmark,
  Calculator,
  UserCircle,
  IdCard,
  FileStack,
  Calendar,
} from 'lucide-react';
import { getCase, saveCase, setActiveCase, deleteCase, patchCaseStatus, uploadCaseFile, deleteCaseFile, reparseDpFromStoredOutput, parseDpFromRawText, reparseOpFromStoredOutput, reparseVypisyFromStoredOutput } from '../lib/storage';
import { API_BASE } from '../lib/api';
import { Case, DpData, VypisyPrijmy, Applicant, ExtractedData, UploadedFile, getDpLines, getDpBasic, type DealStatus } from '../lib/types';
import { StatusBadge } from '../components/cases/StatusBadge';
import { ApplicantPanels } from '../components/cases/ApplicantPanels';
import { ApplicantUploadModal } from '../components/modals/ApplicantUploadModal';
import { AddCoApplicantModal } from '../components/modals/AddCoApplicantModal';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { CaseCalendarTab } from '../components/cases/CaseCalendarTab';
import { CaseBankCalculatorsPanel } from '../components/bankCalculators/CaseBankCalculatorsPanel';

type ContentTab = 'osobni' | 'op' | 'dp' | 'vypisy' | 'podklady' | 'kalendar' | 'bank-kalk';

const CONTENT_TABS: { id: ContentTab; label: string; icon: typeof User }[] = [
  { id: 'osobni', label: 'Osobní údaje', icon: UserCircle },
  { id: 'op', label: 'Data z OP', icon: IdCard },
  { id: 'dp', label: 'Data z DP', icon: Receipt },
  { id: 'vypisy', label: 'Data z výpisů', icon: Landmark },
  { id: 'podklady', label: 'Nahrané podklady', icon: FileStack },
  { id: 'kalendar', label: 'Kalendář', icon: Calendar },
  { id: 'bank-kalk', label: 'Bank. kalkulačky', icon: Calculator },
];

const DEAL_STATUS_OPTIONS: { value: DealStatus; label: string }[] = [
  { value: 'NEW', label: 'Nový' },
  { value: 'DATA_EXTRACTED', label: 'Data vytěžena' },
  { value: 'SENT_TO_BANK', label: 'Odesláno bance' },
  { value: 'APPROVED', label: 'Schváleno' },
  { value: 'SIGNED_BY_CLIENT', label: 'Podepsáno klientem' },
  { value: 'CLOSED', label: 'Uzavřeno' },
  { value: 'LOST', label: 'Ztraceno' },
];

/** Popis řádku DP – dle specifikace (oddíly 2–7 + příloha 1, ř. 92–100 rezervováno). */
const DAP_LINE_LABELS: Record<string, string> = {
  '31': 'Úhrn příjmů od všech zaměstnavatelů',
  '32': '(neobsazeno)',
  '33': 'Daň zaplacená v zahraničí podle § 6 odst. 13',
  '34': 'Dílčí základ daně podle § 6',
  '35': 'Úhrn příjmů ze zahraničí podle § 6',
  '36': 'Dílčí základ daně ze závislé činnosti podle § 6',
  '37': 'Dílčí základ daně (§7)',
  '38': 'Dílčí základ daně (§8)',
  '39': 'Dílčí základ daně (§9)',
  '40': 'Dílčí základ daně (§10)',
  '41': 'Úhrn řádků 37–40',
  '42': 'Základ daně',
  '43': '(neobsazeno)',
  '44': 'Uplatňovaná ztráta',
  '45': 'Základ daně po odečtení ztráty',
  '46': 'Dary (§15 odst. 1)',
  '47': 'Úroky (§15 odst. 3 a 4)',
  '48': 'Penzijní produkty (§15a)',
  '49': 'Životní pojištění (§15a)',
  '50': 'Dlouhodobý investiční produkt (§15a)',
  '51': 'Pojištění dlouhodobé péče (§15c)',
  '52': 'Výzkum a vývoj (§34 odst. 4)',
  '53': 'Podpora odborného vzdělávání (§34 odst. 4)',
  '54': 'Úhrn nezdanitelných částí',
  '55': 'Základ daně snížený',
  '56': 'Základ daně zaokrouhlený na celá sta Kč dolů',
  '57': 'Daň podle §16',
  '58': 'Daň podle §16 nebo příloha 3 (ř. 330)',
  '59': '(neobsazeno)',
  '60': 'Daň zaokrouhlená na celé Kč nahoru',
  '61': 'Daňová ztráta',
  '62': 'Slevy celkem (§35 odst. 1)',
  '62a': 'Sleva za zastavenou exekuci (§35 odst. 4)',
  '63': 'Sleva §35a nebo §35b',
  '64': 'Základní sleva na poplatníka',
  '65a': 'Sleva na manželku/manžela',
  '65b': 'Sleva na manželku/manžela (ZTP/P)',
  '66': 'Sleva na invaliditu 1.–2. stupeň',
  '67': 'Sleva na invaliditu 3. stupeň',
  '68': 'Sleva na držitele ZTP/P',
  '69': '(neobsazeno)',
  '69a': '(neobsazeno)',
  '69b': '(neobsazeno)',
  '70': 'Úhrn slev na dani',
  '71': 'Daň po slevách',
  '72': 'Daňové zvýhodnění na dítě',
  '73': 'Sleva na dani (z ř. 72 max do výše ř. 71)',
  '74': 'Daň po slevě podle §35c',
  '74a': 'Daň podle §16a',
  '75': 'Daň celkem',
  '76': 'Daňový bonus',
  '77': 'Daň po úpravě o daňový bonus',
  '77a': 'Daňový bonus po odpočtu daně',
  '78': 'Poslední známá daň',
  '79': 'Zjištěná daň (§141 dr)',
  '80': 'Rozdíl (ř. 79 – ř. 78)',
  '81': 'Poslední známá daňová ztráta',
  '82': 'Zjištěná ztráta (§141 dr)',
  '83': 'Rozdíl (ř. 82 – ř. 81)',
  '84': 'Úhrn sražených záloh',
  '85': 'Na zálohách zaplaceno poplatníkem',
  '86': 'Zálohy v paušálním režimu (§38lk)',
  '87': 'Sražená daň §36 odst. 6',
  '87a': 'Sražená daň §36 odst. 7',
  '88': 'Zajištěná daň (§38e)',
  '89': 'Vyplacené měsíční bonusy (§35d)',
  '90': 'Zaplacená daňová povinnost (§38gb)',
  '91': 'Zbývá doplatit / přeplatek',
  ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`${92 + i}`, 'Rezervováno'])),
  '101': 'Příjmy podle §7',
  '102': 'Výdaje podle §7',
  '103': '(neobsazeno)',
  '104': 'Rozdíl příjmy/výdaje',
  '105': 'Úpravy zvyšující',
  '106': 'Úpravy snižující',
  '107': 'Část příjmů na spolupracující osobu (§13)',
  '108': 'Část výdajů na spolupracující osobu (§13)',
  '109': 'Část příjmů jako spolupracující osoba (§13)',
  '110': 'Část výdajů jako spolupracující osoba (§13)',
  '111': '(neobsazeno)',
  '112': 'Podíl společníka v.o.s. / komplementáře k.s.',
  '113': 'Dílčí základ daně (§7)',
};

/** Všechny řádky DP pro zobrazení (2.–7. oddíl + rezervováno 92–100 + příloha 1). */
const DAP_TABLE_ROW_ORDER = [
  '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
  '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57',
  '58', '59', '60', '61',
  '62', '62a', '63', '64', '65a', '65b', '66', '67', '68', '69', '69a', '69b', '70', '71', '72', '73', '74', '74a', '75', '76', '77', '77a',
  '78', '79', '80', '81', '82', '83',
  '84', '85', '86', '87', '87a', '88', '89', '90', '91',
  '92', '93', '94', '95', '96', '97', '98', '99', '100',
  '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112', '113',
];

/** Oddíly DP – nadpis a první řádek oddílu (dle specifikace). */
const DAP_SECTIONS: { firstRow: string; title: string }[] = [
  { firstRow: '31', title: '2. ODDÍL – Dílčí základ daně, základ daně, ztráta' },
  { firstRow: '46', title: '3. ODDÍL – Nezdanitelné části základu daně, odčitatelné položky a daň' },
  { firstRow: '58', title: '4. ODDÍL – Daň celkem, ztráta' },
  { firstRow: '62', title: '5. ODDÍL – Uplatnění slev na dani a daňového zvýhodnění' },
  { firstRow: '78', title: '6. ODDÍL – Dodatečné DAP' },
  { firstRow: '84', title: '7. ODDÍL – Placení daně' },
  { firstRow: '92', title: 'Rezervováno (ř. 92–100)' },
  { firstRow: '101', title: 'Příloha č. 1 – Přehled příjmů a výdajů podle §7' },
];

function looksLikeOcrDump(value?: string): boolean {
  if (!value) return false;
  return value.length > 180 || /page\s+\d+|přiznání|finančnímu úřadu|rodné číslo/i.test(value);
}

function extractDicFromText(text: string): string | undefined {
  const compact = text.replace(/\s+/g, ' ').trim();
  const match = compact.match(/C\s*Z\s*([0-9\s]{8,10})/i);
  if (!match) return undefined;
  const digits = match[1].replace(/\s+/g, '');
  if (digits.length < 8 || digits.length > 10) return undefined;
  return `CZ${digits}`;
}

function extractZpusobVydaju(text: string): string | undefined {
  const compact = text.replace(/\s+/g, ' ').trim();
  const m = compact.match(/uplat[^\n]{0,120}v[ýy]daje procentem z p[řr][íi]jm[ůu][^\d]{0,20}(\d{1,2})\s*%/i);
  if (!m) return undefined;
  return `Výdaje procentem z příjmů - paušál ${m[1]}%`;
}

function normalizeDpBasic(
  basic: { ic?: string; dic?: string; czNace?: string; zpusobVydaju?: string; rokZdanovaciObdobi?: number }
): { ic?: string; dic?: string; czNace?: string; zpusobVydaju?: string; rokZdanovaciObdobi?: number } {
  const pool = [basic.ic, basic.dic, basic.czNace, basic.zpusobVydaju].filter(Boolean).join('\n');

  const dicDirect = basic.dic && !looksLikeOcrDump(basic.dic) ? extractDicFromText(basic.dic) ?? basic.dic.trim() : undefined;
  const dic = dicDirect ?? extractDicFromText(pool);

  const zpusobDirect =
    basic.zpusobVydaju && !looksLikeOcrDump(basic.zpusobVydaju)
      ? basic.zpusobVydaju.trim()
      : undefined;
  const zpusobVydaju = zpusobDirect ?? extractZpusobVydaju(pool);

  return {
    ic: basic.ic?.trim() || undefined,
    dic,
    czNace: basic.czNace?.trim() || undefined,
    zpusobVydaju,
    rokZdanovaciObdobi: basic.rokZdanovaciObdobi,
  };
}

export function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [vyseUveru, setVyseUveru] = useState('');
  const [ucel, setUcel] = useState('');
  const [activeApplicantId, setActiveApplicantId] = useState<string>('');
  const [contentTab, setContentTab] = useState<ContentTab>('osobni');
  const [editingUver, setEditingUver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddCoApplicantModal, setShowAddCoApplicantModal] = useState(false);
  const [addModalApplicant, setAddModalApplicant] = useState<Applicant | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [applicantToRemoveId, setApplicantToRemoveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [dpHideEmptyRows, setDpHideEmptyRows] = useState(true);
  const [dpDragActive, setDpDragActive] = useState(false);
  const [dpUploading, setDpUploading] = useState(false);
  const [dpUploadError, setDpUploadError] = useState<string | null>(null);
  const [dpReparsing, setDpReparsing] = useState(false);
  const [dpRawText, setDpRawText] = useState('');
  const [dpParsingRaw, setDpParsingRaw] = useState(false);
  const [dpShowRawInput, setDpShowRawInput] = useState(false);
  const [vypisyDragActive, setVypisyDragActive] = useState(false);
  const [vypisyUploading, setVypisyUploading] = useState(false);
  const [vypisyUploadError, setVypisyUploadError] = useState<string | null>(null);
  const [vypisyReparsing, setVypisyReparsing] = useState(false);
  const [opReparsing, setOpReparsing] = useState(false);
  const [reuploadModalOpen, setReuploadModalOpen] = useState(false);
  const [reuploadTargetFile, setReuploadTargetFile] = useState<UploadedFile | null>(null);
  const [reuploadSelectedFile, setReuploadSelectedFile] = useState<File | null>(null);
  const [reuploadSubmitting, setReuploadSubmitting] = useState(false);
  const [reuploadError, setReuploadError] = useState<string | null>(null);

  const mountedRef = React.useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCase(id)
      .then((c) => {
        if (!mountedRef.current) return;
        if (c) {
          setCaseData(c);
          setVyseUveru(c.vyseUveru?.toString() || '');
          setUcel(c.ucel || '');
          const stored =
            typeof sessionStorage !== 'undefined'
              ? sessionStorage.getItem(`case-active-applicant:${id}`)
              : null;
          const applicantsList = c.applicants ?? [];
          const storedOk = Boolean(stored && applicantsList.some((a) => a.id === stored));
          setActiveApplicantId(
            storedOk ? stored! : (c.activeApplicantId ?? applicantsList[0]?.id ?? '')
          );
        } else {
          setCaseData(null);
        }
      })
      .catch(() => {
        if (mountedRef.current) setCaseData(null);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [id]);

  const applicants = caseData?.applicants ?? [];
  const currentApplicant = applicants.find((a) => a.id === activeApplicantId);
  const activeRealApplicant = applicants.find((a) => a.id === activeApplicantId) ?? applicants[0] ?? null;

  const getApplicantDisplayName = (a: Applicant): string => {
    if (a.extractedData?.jmeno || a.extractedData?.prijmeni)
      return [a.extractedData.jmeno, a.extractedData.prijmeni].filter(Boolean).join(' ').trim();
    return a.role === 'hlavni' ? 'Hlavní žadatel' : `Spolužadatel ${a.order - 1}`;
  };
  const mainApplicant = applicants.find((a) => a.role === 'hlavni');
  const hasMainName = mainApplicant?.extractedData?.jmeno || mainApplicant?.extractedData?.prijmeni;
  const caseDisplayName = mainApplicant && hasMainName ? getApplicantDisplayName(mainApplicant) : (caseData?.jmeno ?? '');

  const handleAddCoApplicant = (): void => {
    if (!caseData) return;
    const list = caseData.applicants ?? [];
    if (list.length >= 4) {
      alert('Maximálně 4 žadatelé.');
      return;
    }
    const order = list.length + 1;
    const newApplicant: Applicant = {
      id: `applicant-${caseData.id}-${order}`,
      role: list.length === 0 ? 'hlavni' : 'spoluzadatel',
      order,
    };
    setAddModalApplicant(newApplicant);
    setShowAddCoApplicantModal(true);
    // Vždy posílat data všech stávajících žadatelů + prázdný záznam pro nového, aby backend nesmazal původního (personIndex 0)
    const baseEmpty = { jmeno: '', prijmeni: '', rc: '', adresa: '', prijmy: 0, vydaje: 0 };
    const extractedDataForSave: ExtractedData[] = [
      ...list.map((a, i) => ({ ...(a.extractedData ?? baseEmpty), personIndex: i })),
      { ...baseEmpty, personIndex: list.length },
    ];
    const payload = {
      ...caseData,
      applicants: [...list, newApplicant],
      extractedData: extractedDataForSave,
      activeApplicantId: newApplicant.id,
    };
    setTimeout(() => {
      saveCase(payload)
        .then((updated) => {
          if (mountedRef.current) {
            setCaseData(updated);
            setActiveApplicantId(newApplicant.id);
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            alert('Nepodařilo se uložit spolužadatele na server. Zkuste to znovu nebo zavřete okno.');
          }
        });
    }, 0);
  };

  /** Aktivní žadatel je jen UI stav – PATCH případu ho neukládá; saveCase zde dělalo zbytečný request a při chybě problikávalo. */
  const handleTabChange = (applicantId: string) => {
    setActiveApplicantId(applicantId);
    if (id && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`case-active-applicant:${id}`, applicantId);
    }
  };

  const handleSetMainApplicant = async (applicantId: string) => {
    if (!caseData || applicants.length < 2) return;
    const idx = applicants.findIndex((a) => a.id === applicantId);
    if (idx < 0) return;
    const chosen = applicants[idx];
    const rest = applicants.filter((_, i) => i !== idx);
    const reordered: Applicant[] = [
      { ...chosen, role: 'hlavni', order: 1 },
      ...rest.map((a, i) => ({ ...a, role: 'spoluzadatel' as const, order: i + 2 })),
    ];
    const newMainName = getApplicantDisplayName(chosen);
    // Přeřadit extractedData v DB: zvolený na personIndex 0, původní hlavní na 1, aby po refreshi zůstal hlavní žadatel a jméno případu
    const baseEmpty = { jmeno: '', prijmeni: '', rc: '', adresa: '', prijmy: 0, vydaje: 0 };
    const extractedDataForSave: ExtractedData[] = reordered.map((a, i) => {
      const base = a.extractedData ?? baseEmpty;
      return { ...base, personIndex: i };
    });
    const updated = await saveCase({
      ...caseData,
      jmeno: newMainName || caseData.jmeno,
      applicants: reordered,
      extractedData: extractedDataForSave,
      activeApplicantId: reordered[0].id,
    });
    setCaseData(updated);
    // Aktivní karta = nový hlavní žadatel (první v seznamu po uložení), aby šlo z druhé karty znovu přepnout zpět
    setActiveApplicantId(updated.applicants?.[0]?.id ?? reordered[0].id);
  };

  const handleRemoveApplicant = async (applicantId: string) => {
    if (!caseData || applicants.length <= 1) return;
    setApplicantToRemoveId(null);
    const next = applicants.filter((a) => a.id !== applicantId);
    const newActive = activeApplicantId === applicantId ? next[0]?.id ?? '' : activeApplicantId;
    const reorderedApplicants = next.map((a, i) => ({
      ...a,
      id: `applicant-${caseData.id}-${i + 1}`,
      order: i + 1,
      role: i === 0 ? ('hlavni' as const) : ('spoluzadatel' as const),
    }));
    const extractedDataForSave: ExtractedData[] = reorderedApplicants.map((a, i) => {
      const base = a.extractedData ?? { jmeno: '', prijmeni: '', rc: '', adresa: '', prijmy: 0, vydaje: 0 };
      return { ...base, personIndex: i };
    });
    const updated = await saveCase({
      ...caseData,
      applicants: reorderedApplicants,
      extractedData: extractedDataForSave.length ? extractedDataForSave : caseData.extractedData,
      activeApplicantId: newActive,
    });
    setCaseData(updated);
    setActiveApplicantId(updated.applicants?.[0]?.id ?? newActive);
  };

  const handleSave = async () => {
    if (!caseData) return;
    setSaving(true);
    try {
      const updated: Case = {
        ...caseData,
        vyseUveru: vyseUveru ? parseInt(vyseUveru, 10) : undefined,
        ucel: ucel || undefined,
        status: vyseUveru && ucel ? 'doplneno' : caseData.status,
      };
      const saved = await saveCase(updated);
      setCaseData(saved);
      setEditingUver(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async () => {
    if (!caseData) return;
    try {
      const updated = await setActiveCase(caseData.id);
      setCaseData(updated);
    } catch {
      // keep current state
    }
  };

  const handleDealStatusChange = async (newStatus: DealStatus) => {
    if (!caseData) return;
    const current = caseData.dealStatus ?? 'NEW';
    if (newStatus === current) return;
    try {
      const updated = await patchCaseStatus(caseData.id, newStatus);
      setCaseData(updated);
    } catch {
      // keep current state
    }
  };

  const handleDelete = async () => {
    if (!caseData || !confirm(`Opravdu chcete smazat případ ${caseData.jmeno}?`)) return;
    try {
      await deleteCase(caseData.id);
      navigate('/');
    } catch {
      // show error could be added
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!caseData || !fileId || !confirm('Opravdu chcete smazat tento soubor?')) return;
    setDeletingFileId(fileId);
    try {
      const updated = await deleteCaseFile(caseData.id, fileId);
      setCaseData(updated);
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleOpenReuploadModal = (file: UploadedFile) => {
    setReuploadTargetFile(file);
    setReuploadSelectedFile(null);
    setReuploadError(null);
    setReuploadModalOpen(true);
  };

  const handleViewFile = async (file: UploadedFile) => {
    if (!file.url) return;
    const url = `${API_BASE}${file.url}`;
    try {
      const check = await fetch(url, { method: 'HEAD' });
      if (check.ok) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
    } catch {
      // pokračujeme fallbackem na reupload modal
    }
    setReuploadTargetFile(file);
    setReuploadSelectedFile(null);
    setReuploadError('Soubor na serveru už není dostupný. Nahrajte ho znovu.');
    setReuploadModalOpen(true);
  };

  const handleRunReupload = async (extract: boolean) => {
    if (!caseData || !reuploadTargetFile || !reuploadSelectedFile) return;
    const applicantId = reuploadTargetFile.applicantId ?? activeRealApplicant?.id;
    setReuploadSubmitting(true);
    setReuploadError(null);
    try {
      let updated = await uploadCaseFile(
        caseData.id,
        reuploadSelectedFile,
        reuploadTargetFile.type,
        applicantId,
        { extract }
      );
      if (reuploadTargetFile.id) {
        updated = await deleteCaseFile(caseData.id, reuploadTargetFile.id);
      }
      setCaseData(updated);
      setReuploadModalOpen(false);
      setReuploadTargetFile(null);
      setReuploadSelectedFile(null);
    } catch (err) {
      setReuploadError(err instanceof Error ? err.message : 'Nahrání souboru selhalo.');
    } finally {
      setReuploadSubmitting(false);
    }
  };

  const handleDpFileUpload = async (file: File) => {
    if (!caseData) return;
    if (!activeRealApplicant) {
      setDpUploadError('Není vybraný žádný žadatel.');
      return;
    }

    const isSupported =
      file.type === 'application/pdf' ||
      file.type.startsWith('image/') ||
      /\.(pdf|png|jpg|jpeg|webp|bmp|gif)$/i.test(file.name);
    if (!isSupported) {
      setDpUploadError('Nepodporovaný formát. Nahrajte PDF nebo obrázek.');
      return;
    }

    try {
      setDpUploadError(null);
      setDpUploading(true);
      const updated = await uploadCaseFile(caseData.id, file, 'danove', activeRealApplicant.id);
      setCaseData(updated);
      setDpHideEmptyRows(true);
    } catch (err) {
      setDpUploadError(err instanceof Error ? err.message : 'Nahrání DP se nezdařilo.');
    } finally {
      setDpUploading(false);
      setDpDragActive(false);
    }
  };

  const handleDpDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dpUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) await handleDpFileUpload(file);
  };

  const handleReparseDpFromCache = async () => {
    if (!caseData || !activeRealApplicant) return;
    try {
      setDpUploadError(null);
      setDpReparsing(true);
      const personIndex = Math.max(0, (activeRealApplicant.order ?? 1) - 1);
      const updated = await reparseDpFromStoredOutput(caseData.id, activeRealApplicant.id, personIndex);
      setCaseData(updated);
    } catch (err) {
      setDpUploadError(err instanceof Error ? err.message : 'Znovunačtení DP selhalo.');
    } finally {
      setDpReparsing(false);
    }
  };

  const handleParseDpFromRawText = async () => {
    if (!caseData || !activeRealApplicant || !dpRawText.trim()) return;
    try {
      setDpUploadError(null);
      setDpParsingRaw(true);
      const personIndex = Math.max(0, (activeRealApplicant.order ?? 1) - 1);
      const updated = await parseDpFromRawText(caseData.id, dpRawText.trim(), activeRealApplicant.id, personIndex);
      setCaseData(updated);
      setDpRawText('');
      setDpShowRawInput(false);
    } catch (err) {
      setDpUploadError(err instanceof Error ? err.message : 'Nahrání raw textu selhalo.');
    } finally {
      setDpParsingRaw(false);
    }
  };

  const handleReparseOpFromCache = async () => {
    if (!caseData || !activeRealApplicant) return;
    try {
      setOpReparsing(true);
      const personIndex = Math.max(0, (activeRealApplicant.order ?? 1) - 1);
      const updated = await reparseOpFromStoredOutput(caseData.id, activeRealApplicant.id, personIndex);
      setCaseData(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Znovunačtení dat z OP selhalo.');
    } finally {
      setOpReparsing(false);
    }
  };

  const handleVypisyFileUpload = async (file: File) => {
    if (!caseData) return;
    if (!activeRealApplicant) {
      setVypisyUploadError('Není vybraný žádný žadatel.');
      return;
    }
    const isSupported =
      file.type === 'application/pdf' ||
      file.type.startsWith('image/') ||
      /\.(pdf|png|jpg|jpeg|webp|bmp|gif)$/i.test(file.name);
    if (!isSupported) {
      setVypisyUploadError('Nepodporovaný formát. Nahrajte PDF nebo obrázek.');
      return;
    }
    try {
      setVypisyUploadError(null);
      setVypisyUploading(true);
      const updated = await uploadCaseFile(caseData.id, file, 'vypisy', activeRealApplicant.id);
      setCaseData(updated);
    } catch (err) {
      setVypisyUploadError(err instanceof Error ? err.message : 'Nahrání výpisů se nezdařilo.');
    } finally {
      setVypisyUploading(false);
      setVypisyDragActive(false);
    }
  };

  const handleVypisyDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (vypisyUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) await handleVypisyFileUpload(file);
  };

  const handleReparseVypisyFromCache = async () => {
    if (!caseData || !activeRealApplicant) return;
    try {
      setVypisyUploadError(null);
      setVypisyReparsing(true);
      const personIndex = Math.max(0, (activeRealApplicant.order ?? 1) - 1);
      const updated = await reparseVypisyFromStoredOutput(caseData.id, activeRealApplicant.id, personIndex);
      setCaseData(updated);
    } catch (err) {
      setVypisyUploadError(err instanceof Error ? err.message : 'Znovunačtení výpisů selhalo.');
    } finally {
      setVypisyReparsing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 app-content-dark flex items-center justify-center">
        <p className="text-gray-500">Načítání…</p>
      </div>
    );
  }
  if (!caseData) {
    return (
      <div className="flex-1 bg-gray-50 app-content-dark flex items-center justify-center">
        <p className="text-gray-500">Případ nenalezen</p>
      </div>
    );
  }
  
  const fileTypeLabels = {
    'op-predni': 'OP - přední strana',
    'op-zadni': 'OP - zadní strana',
    'danove': 'Daňové přiznání',
    'vypisy': 'Výpisy z účtu'
  };
  
  const person = (() => {
    if (applicants.length > 0 && currentApplicant?.extractedData) return currentApplicant.extractedData;
    const arr = Array.isArray(caseData.extractedData) ? caseData.extractedData : caseData.extractedData ? [caseData.extractedData] : [];
    return arr.filter((p): p is ExtractedData => p != null).sort((a, b) => (a.personIndex ?? 0) - (b.personIndex ?? 0))[0] ?? null;
  })();

  return (
    <>
    <div className="flex-1 bg-gray-50 app-content-dark overflow-auto min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na přehled
        </Link>

        {/* Jedno bílé okno: panel detailu případu + boxík žadatelů */}
        <div className="app-card app-card-joined-top">
          {/* Panel detail případu: hlavička + Údaje o úvěru */}
          <div className="p-6">
            <div className="case-detail-header-row flex flex-col gap-3 mb-4 min-w-0 overflow-x-hidden">
              {/* Řádek 1 (desktop): název + odznaky vlevo, tlačítka vpravo – jako na obrázku */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 min-w-0">
                <div className="case-detail-title-block flex flex-col lg:flex-row lg:flex-wrap items-stretch lg:items-center gap-3 min-w-0 w-full lg:w-auto">
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 min-w-0 break-words">{caseDisplayName || caseData.jmeno}</h1>
                  {caseData.isActive && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200 rounded-full text-sm font-medium shrink-0">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      Aktivní případ
                    </span>
                  )}
                  <StatusBadge status={caseData.status} />
                </div>
                <div className="case-detail-actions flex flex-col lg:flex-row flex-wrap gap-2 lg:shrink-0">
                {!caseData.isActive && (
                  <button
                    type="button"
                    onClick={handleSetActive}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 lg:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] lg:min-h-0"
                  >
                    <Star className="w-4 h-4 shrink-0" />
                    Použít pro zkratky
                  </button>
                )}
                {applicants.length < 2 && (
                  <button
                    type="button"
                    onClick={handleAddCoApplicant}
                    title="Přidat spolužadatele"
                    aria-label="Přidat spolužadatele"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 lg:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium min-h-[44px] lg:min-h-0"
                  >
                    <UserPlus className="w-4 h-4 shrink-0" aria-hidden />
                    <span>Přidat spolužadatele</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 lg:py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] lg:min-h-0"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Smazat případ
                </button>
                </div>
              </div>
              {/* Řádek 2: Stav případu (na desktopu pod prvním řádkem, na mobilu v pořadí pod sebou) */}
              <label className="case-detail-stav-row flex flex-wrap items-center gap-2 min-w-0 w-full lg:w-auto">
                <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">Stav případu:</span>
                <select
                  value={caseData.dealStatus ?? 'NEW'}
                  onChange={(e) => handleDealStatusChange(e.target.value as DealStatus)}
                  className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0 flex-1 lg:flex-none max-w-full w-full sm:w-auto sm:min-w-[10rem]"
                >
                  {DEAL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Údaje o úvěru – šedé pouzdří */}
            <div
              className="mt-6 p-5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm"
              style={{ borderRadius: 16 }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Údaje o úvěru</h3>
                {!editingUver && (
                  <button
                    type="button"
                    onClick={() => setEditingUver(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors min-h-[44px] lg:min-h-0"
                    aria-label="Editovat údaje o úvěru"
                  >
                    <Pencil className="w-4 h-4 shrink-0" />
                    <span className="hidden lg:inline">Editovat</span>
                  </button>
                )}
              </div>
              {editingUver ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="vyseUveru" className="block text-sm font-medium text-gray-500 mb-1">Výše úvěru (Kč)</label>
                      <input
                        id="vyseUveru"
                        type="number"
                        value={vyseUveru}
                        onChange={(e) => setVyseUveru(e.target.value)}
                        placeholder="např. 3500000"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="ucel" className="block text-sm font-medium text-gray-500 mb-1">Účel úvěru</label>
                      <input
                        id="ucel"
                        value={ucel}
                        onChange={(e) => setUcel(e.target.value)}
                        placeholder="např. Koupě bytu 3+kk, Praha 5"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Ukládám…' : 'Uložit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUver(false)}
                      className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Zrušit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Výše úvěru</p>
                    <p className="text-base font-semibold text-gray-800">
                      {caseData.vyseUveru != null ? formatCurrency(caseData.vyseUveru) : <span className="text-gray-400">Neuvedeno</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Účel úvěru</p>
                    <p className="text-base font-semibold text-gray-800">
                      {caseData.ucel || <span className="text-gray-400">Neuvedeno</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Boxík žadatelů – uvnitř téhož bílého okna; zobrazit i při 0 žadatelích */}
          {applicants.length > 0 ? (
            <ApplicantPanels
              applicants={applicants}
              activeApplicantId={activeApplicantId}
              onSelect={handleTabChange}
              onSetMain={handleSetMainApplicant}
              onRemove={(applicantId) => setApplicantToRemoveId(applicantId)}
              onAdd={handleAddCoApplicant}
              realApplicantCount={applicants.length}
              embedded
            />
          ) : (
            <div className="app-applicants-box p-6 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Žadatelé (0)</h2>
                <button
                  type="button"
                  onClick={handleAddCoApplicant}
                  className="inline-flex items-center gap-2 p-2 rounded-lg text-green-700 hover:bg-green-50 border border-green-200"
                  title="Přidat žadatele"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Přidat žadatele</span>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">Zatím žádní žadatelé. Klikněte na tlačítko a nahrajte podklady (OP, DP, výpisy).</p>
            </div>
          )}
        </div>

        {/* Karta 3: záložky a obsah */}
        <div className="app-card app-card-joined-bottom">
          {/* Tabs – horizontální scroll na mobilu */}
          <div className="border-b border-border bg-card flex items-stretch overflow-x-auto">
            <nav className="flex space-x-1 px-4 sm:px-6 flex-1 min-w-0 overflow-x-auto" aria-label="Záložky">
              <div className="flex gap-1 flex-nowrap py-0">
                {CONTENT_TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setContentTab(id)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                      contentTab === id
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="w-4 h-4 flex items-center justify-center shrink-0">
                      <Icon className={`w-4 h-4 ${contentTab === id ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                    </span>
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </div>
            </nav>
          </div>

          {/* Osobní údaje žadatele – pouze data z OP, dvousloupcový layout */}
          {contentTab === 'osobni' && (
            <div className="p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Osobní údaje žadatele</h2>
                <button
                  type="button"
                  onClick={handleReparseOpFromCache}
                  disabled={opReparsing || !activeRealApplicant}
                  className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                >
                  {opReparsing ? 'Načítám…' : 'Znovu načíst data'}
                </button>
              </div>
              {person ? (
                <div className="app-form-grid-personal">
                  <div className="app-form-field">
                    <span className="app-form-label">Jméno</span>
                    <div className="app-form-value">{person.jmeno || '—'}</div>
                  </div>
                  <div className="app-form-field">
                    <span className="app-form-label">Příjmení</span>
                    <div className="app-form-value">{person.prijmeni || '—'}</div>
                  </div>
                  <div className="app-form-field">
                    <span className="app-form-label">Rodné číslo</span>
                    <div className="app-form-value font-mono">{person.rc || '—'}</div>
                  </div>
                  <div className="app-form-field">
                    <span className="app-form-label">Datum narození</span>
                    <div className="app-form-value">{person.datumNarozeni || '—'}</div>
                  </div>
                  <div className="app-form-field">
                    <span className="app-form-label">Místo narození</span>
                    <div className="app-form-value">{person.mistoNarozeni || '—'}</div>
                  </div>
                  <div className="app-form-field">
                    <span className="app-form-label">Pohlaví</span>
                    <div className="app-form-value">{person.pohlavi || '—'}</div>
                  </div>
                  <div className="app-form-field">
                    <span className="app-form-label">Národnost</span>
                    <div className="app-form-value">{person.narodnost || '—'}</div>
                  </div>
                  <div className="app-form-field">
                    <span className="app-form-label">Rodinný stav</span>
                    <div className="app-form-value">{person.rodinnyStav || '—'}</div>
                  </div>
                  <div className="app-form-field col-span-2">
                    <span className="app-form-label">Adresa trvalého bydliště</span>
                    <div className="app-form-value break-words">{person.adresa || '—'}</div>
                  </div>
                </div>
              ) : (
                <div className="empty-state-box">
                    <User className="empty-state-icon" />
                    <p className="empty-state-text">Osobní údaje nebyly vytaženy. Nahrajte přední a zadní stranu občanského průkazu.</p>
                </div>
              )}
            </div>
          )}

          {/* Data z OP – údaje o dokladu totožnosti (číslo, vydání, platnost, úřad) */}
          {contentTab === 'op' && (
            <div className="p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data z OP</h2>
                <button
                  type="button"
                  onClick={handleReparseOpFromCache}
                  disabled={opReparsing || !activeRealApplicant}
                  className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                >
                  {opReparsing ? 'Načítám…' : 'Znovu načíst data'}
                </button>
              </div>
              <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Informace o dokladu totožnosti</p>
                  <p className="text-xs text-gray-600 mt-0.5">Automaticky vytaženo z nahraných skenů OP</p>
                </div>
              </div>
              {person ? (
                <div className="space-y-4">
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-1">Číslo dokladu</span>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {person.cisloDokladu || '—'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-sm font-medium text-gray-700 mb-1">Datum vydání</span>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {person.datumVydani || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-700 mb-1">Platnost do</span>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {person.platnostDo || '—'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-1">Vydávající úřad</span>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {person.vydavajiciUrad || '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state-box">
                  <CreditCard className="empty-state-icon" />
                  <p className="empty-state-text">Občanský průkaz nebyl nahrán nebo zpracován.</p>
                </div>
              )}
            </div>
          )}

          {/* Panel: Data z DP */}
          {contentTab === 'dp' && (
            <div className="p-6">
              {(() => {
                const lines = person ? getDpLines(person.dpData) : {};
                const basicRaw = person ? getDpBasic(person.dpData) : {};
                const basic = normalizeDpBasic(basicRaw);
                const intakeIcoFallback =
                  activeRealApplicant?.role === 'spoluzadatel'
                    ? caseData?.lead?.coApplicantIco
                    : caseData?.lead?.ico;
                const hasAnyLines = Object.keys(lines).length > 0;
                const hasAnyBasic = basic.ic || basic.dic || basic.czNace || basic.zpusobVydaju;
                const hasDpData = Boolean(person?.dpData) || hasAnyLines || hasAnyBasic;
                if (!person || !hasDpData) {
                  return (
                    <>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data z daňového přiznání</h2>
                        <button
                          type="button"
                          onClick={handleReparseDpFromCache}
                          disabled={dpReparsing || dpUploading || !activeRealApplicant}
                          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                        >
                          {dpReparsing ? 'Načítám…' : 'Znovu načíst data'}
                        </button>
                      </div>
                      <div
                        className={`app-dp-dropzone ${dpDragActive ? 'is-drag-active' : ''} ${dpUploading ? 'is-uploading' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (!dpUploading) setDpDragActive(true);
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          if (!dpUploading) setDpDragActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          if (e.currentTarget === e.target) setDpDragActive(false);
                        }}
                        onDrop={handleDpDrop}
                      >
                        <Receipt className="app-dp-dropzone-icon" />
                        <p className="app-dp-dropzone-title">
                          {dpUploading ? 'Nahrávám daňové přiznání…' : 'Přetáhněte sem daňové přiznání (DP)'}
                        </p>
                        <p className="app-dp-dropzone-subtitle">
                          {activeRealApplicant
                            ? `Dokument se přiřadí k aktivnímu žadateli: ${getApplicantDisplayName(activeRealApplicant)}`
                            : 'Nejprve vyberte aktivního žadatele'}
                        </p>
                        <label className="app-dp-dropzone-button">
                          <Upload className="w-4 h-4" />
                          Vybrat soubor DP
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif"
                            className="hidden"
                            disabled={dpUploading || !activeRealApplicant}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleDpFileUpload(file);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                        {dpUploadError && <p className="app-dp-dropzone-error">{dpUploadError}</p>}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => setDpShowRawInput((v) => !v)}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {dpShowRawInput ? 'Skrýt' : 'Nebo vložit raw text z Doctly'}
                          </button>
                          {dpShowRawInput && (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={dpRawText}
                                onChange={(e) => setDpRawText(e.target.value)}
                                placeholder="Vložte sem text, který vrátil Doctly (Markdown tabulka s řádky DP)..."
                                className="w-full min-h-[120px] px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono"
                                disabled={dpParsingRaw || !activeRealApplicant}
                              />
                              <button
                                type="button"
                                onClick={handleParseDpFromRawText}
                                disabled={dpParsingRaw || !dpRawText.trim() || !activeRealApplicant}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                              >
                                {dpParsingRaw ? 'Parsuji…' : 'Načíst data z textu'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                }
                const rowKeys = dpHideEmptyRows
                  ? DAP_TABLE_ROW_ORDER.filter((key) => (lines[key] ?? 0) !== 0)
                  : DAP_TABLE_ROW_ORDER;
                const tableRows: ({ type: 'section'; title: string } | { type: 'row'; key: string; value: number })[] = [];
                const sectionSet = new Set(DAP_SECTIONS.map((s) => s.firstRow));
                for (const key of rowKeys) {
                  if (sectionSet.has(key)) {
                    const sec = DAP_SECTIONS.find((s) => s.firstRow === key);
                    if (sec) tableRows.push({ type: 'section', title: sec.title });
                  }
                  tableRows.push({ type: 'row', key, value: lines[key] ?? 0 });
                }
                return (
                  <>
                    <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Daňové přiznání{basic.rokZdanovaciObdobi != null ? ` za rok ${basic.rokZdanovaciObdobi}` : ''}
                      </h2>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleReparseDpFromCache}
                          disabled={dpReparsing || dpUploading || !activeRealApplicant}
                          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                        >
                          {dpReparsing ? 'Načítám…' : 'Znovu načíst data'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDpShowRawInput((v) => !v)}
                          className="text-sm text-gray-600 hover:underline"
                        >
                          {dpShowRawInput ? 'Skrýt vložení textu' : 'Vložit raw text z Doctly'}
                        </button>
                      </div>
                    </div>
                    {dpShowRawInput && (
                      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <textarea
                          value={dpRawText}
                          onChange={(e) => setDpRawText(e.target.value)}
                          placeholder="Vložte text z Doctly (Markdown tabulka s řádky DP)..."
                          className="w-full min-h-[100px] px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono mb-2"
                          disabled={dpParsingRaw || !activeRealApplicant}
                        />
                        <button
                          type="button"
                          onClick={handleParseDpFromRawText}
                          disabled={dpParsingRaw || !dpRawText.trim() || !activeRealApplicant}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {dpParsingRaw ? 'Parsuji…' : 'Načíst data z textu'}
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mb-4">Automaticky vytaženo z nahraných dokumentů</p>
                    <div className="space-y-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3">Základní údaje z DP</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">IČ (identifikační číslo)</span>
                          <p className="font-medium text-gray-900">{basic.ic || intakeIcoFallback || '—'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">DIČ (daňové identifikační číslo)</span>
                          <p className="font-medium text-gray-900">{basic.dic || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-gray-500">Převažující CZ-NACE</span>
                          <p className="font-medium text-gray-900">{basic.czNace || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-gray-500">Způsob uplatnění výdajů</span>
                          <p className="font-medium text-gray-900">{basic.zpusobVydaju || '—'}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-800">Kompletní data z daňového přiznání</h3>
                        <button
                          type="button"
                          onClick={() => setDpHideEmptyRows((v) => !v)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                          title={dpHideEmptyRows ? 'Zobrazit všechny řádky' : 'Skrýt nulové a neobsazené řádky'}
                        >
                          <Eye className="w-4 h-4" />
                          {dpHideEmptyRows ? 'Zobrazit vše' : 'Skrýt prázdné'}
                        </button>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-700">Ř</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-700">Položka</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-700">Hodnota</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {tableRows.map((item, idx) =>
                              item.type === 'section' ? (
                                <tr key={`sec-${idx}`} className="bg-blue-50">
                                  <td colSpan={3} className="px-4 py-2 font-semibold text-blue-900">
                                    {item.title}
                                  </td>
                                </tr>
                              ) : (
                                <tr key={item.key}>
                                  <td className="px-4 py-2 text-gray-600">{item.key}</td>
                                  <td className="px-4 py-2 text-gray-900">{DAP_LINE_LABELS[item.key] ?? item.key}</td>
                                  <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(item.value)}</td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  </>
                );
              })()}
            </div>
          )}

          {contentTab === 'vypisy' && (
            <div className="p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data z bankovních výpisů</h2>
                <button
                  type="button"
                  onClick={handleReparseVypisyFromCache}
                  disabled={vypisyReparsing || vypisyUploading || !activeRealApplicant}
                  className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                >
                  {vypisyReparsing ? 'Načítám…' : 'Znovu načíst data'}
                </button>
              </div>
              {person?.vypisyPrijmy && Object.keys(person.vypisyPrijmy).length > 0 ? (
                (() => {
                  const v = person.vypisyPrijmy as VypisyPrijmy;
                  const mesice = [1, 2, 3, 4, 5, 6].map((i) => v[`mesic${i}`] ?? 0);
                  const prumer = v.prumernaMzda ?? (mesice.filter((n) => n > 0).length > 0
                    ? Math.round(mesice.filter((n) => n > 0).reduce((a, b) => a + b, 0) / mesice.filter((n) => n > 0).length)
                    : 0);
                  const nemocenska = 0;
                  const vysledny = prumer + nemocenska;
                  const hasEmployer = v.zamestnavatel || v.zamestnavatelIc || v.prumernaMzda;
                  const employmentEntries = v.employmentEntries ?? [];
                  const otherRegular = v.otherRegularIncome ?? [];
                  const otherEntries = v.otherIncomeEntries ?? [];
                  return (
                    <div className="space-y-6">
                      {hasEmployer && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-gray-700 mb-2">
                            <Building2 className="w-4 h-4" />
                            <span className="font-medium">Zaměstnavatel</span>
                          </div>
                          <p className="text-gray-900 font-medium">{v.zamestnavatel || '—'}</p>
                          {v.zamestnavatelIc != null && v.zamestnavatelIc !== '' && (
                            <p className="text-sm text-gray-600 mt-1">IČ zaměstnavatele: {v.zamestnavatelIc}</p>
                          )}
                          {v.prumernaMzda != null && v.prumernaMzda > 0 && (
                            <p className="text-sm text-green-700 font-medium mt-2">Průměrná měsíční mzda: {formatCurrency(v.prumernaMzda)}</p>
                          )}
                        </div>
                      )}
                      {(employmentEntries.length > 0 || mesice.some((n) => n > 0)) && (
                        <>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Příjmy ze zaměstnání</h4>
                            {employmentEntries.length > 0 ? (
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700">Datum</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700">Popis</th>
                                      <th className="px-4 py-2 text-right font-medium text-gray-700">Částka</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {employmentEntries.map((row, i) => (
                                      <tr key={i}>
                                        <td className="px-4 py-2 text-gray-600">{row.datum || '—'}</td>
                                        <td className="px-4 py-2 text-gray-900">{row.popis || '—'}</td>
                                        <td className="px-4 py-2 text-right font-medium text-green-700">+{formatCurrency(row.castka)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                  <div key={i}>
                                    <p className="text-xs text-gray-500 mb-0.5">Výpis za {i}. měsíc</p>
                                    <p className="py-2 text-gray-900">{formatCurrency(v[`mesic${i}`] ?? 0)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-800">Výsledný měsíční příjem klienta</span>
                            <span className="font-semibold text-green-700 border border-green-400 rounded px-2 py-1">{formatCurrency(vysledny)}</span>
                          </div>
                        </>
                      )}
                      {otherRegular.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">Pravidelné ostatní příjmy</h4>
                          <ul className="space-y-1">
                            {otherRegular.map((item, i) => (
                              <li key={i} className="text-sm text-gray-900">
                                <strong>{item.typ}:</strong> {formatCurrency(item.castka)}{item.mesicne ? ' (měsíčně)' : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {otherEntries.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">Detail ostatních příjmů</h4>
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-2 text-left font-medium text-gray-700">Datum</th>
                                  <th className="px-4 py-2 text-left font-medium text-gray-700">Popis</th>
                                  <th className="px-4 py-2 text-right font-medium text-gray-700">Částka</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {otherEntries.map((row, i) => (
                                  <tr key={i}>
                                    <td className="px-4 py-2 text-gray-600">{row.datum || '—'}</td>
                                    <td className="px-4 py-2 text-gray-900">{row.popis || '—'}</td>
                                    <td className="px-4 py-2 text-right font-medium text-blue-700">+{formatCurrency(row.castka)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      {!hasEmployer && employmentEntries.length === 0 && otherRegular.length === 0 && otherEntries.length === 0 && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                              <div key={i}>
                                <p className="text-xs text-gray-500 mb-0.5">Výpis za {i}. měsíc</p>
                                <p className="py-2 text-gray-900">{formatCurrency(v[`mesic${i}`] ?? 0)}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-800">Výsledný měsíční příjem klienta</span>
                            <span className="font-semibold text-green-700 border border-green-400 rounded px-2 py-1">{formatCurrency(vysledny)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div
                  className={`app-dp-dropzone ${vypisyDragActive ? 'is-drag-active' : ''} ${vypisyUploading ? 'is-uploading' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!vypisyUploading) setVypisyDragActive(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (!vypisyUploading) setVypisyDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (e.currentTarget === e.target) setVypisyDragActive(false);
                  }}
                  onDrop={handleVypisyDrop}
                >
                  <Landmark className="app-dp-dropzone-icon" />
                  <p className="app-dp-dropzone-title">
                    {vypisyUploading ? 'Nahrávám bankovní výpisy…' : 'Přetáhněte sem bankovní výpisy (PDF)'}
                  </p>
                  <p className="app-dp-dropzone-subtitle">
                    {activeRealApplicant
                      ? `Výpisy se přiřadí k aktivnímu žadateli: ${getApplicantDisplayName(activeRealApplicant)}`
                      : 'Nejprve vyberte aktivního žadatele'}
                  </p>
                  <label className="app-dp-dropzone-button">
                    <Upload className="w-4 h-4" />
                    Vybrat soubor výpisů
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif"
                      className="hidden"
                      disabled={vypisyUploading || !activeRealApplicant}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleVypisyFileUpload(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                  {vypisyUploadError && <p className="app-dp-dropzone-error">{vypisyUploadError}</p>}
                </div>
              )}
            </div>
          )}

          {contentTab === 'podklady' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Nahrané podklady
                </h2>
                {currentApplicant && (
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Nahrát soubor
                  </button>
                )}
              </div>

              {(() => {
                const filesToShow =
                  applicants.length > 0 && activeApplicantId
                    ? caseData.soubory.filter(
                        (f) => f.applicantId === activeApplicantId || (!f.applicantId && applicants[0]?.id === activeApplicantId)
                      )
                    : caseData.soubory;
                return filesToShow.length > 0 ? (
                  <div className="space-y-3">
                    {filesToShow.map((file, index) => (
                      <div
                        key={file.id ?? index}
                        className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-200">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{fileTypeLabels[file.type]}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleViewFile(file)}
                            className="doc-file-btn doc-file-btn-zobrazit"
                            title="Zobrazit"
                          >
                            <Eye className="w-4 h-4" />
                            Zobrazit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReuploadModal(file)}
                            className="doc-file-btn doc-file-btn-prehrat"
                            title="Přehrát"
                          >
                            <RotateCw className="w-4 h-4" />
                            Přehrát
                          </button>
                          <button
                            type="button"
                            onClick={() => file.id && handleDeleteFile(file.id)}
                            disabled={!!deletingFileId}
                            className="doc-file-btn doc-file-btn-smazat"
                            title="Smazat"
                          >
                            <Trash2 className="w-4 h-4" />
                            Smazat
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-box">
                    <FolderOpen className="empty-state-icon" />
                    <p className="empty-state-text">
                      {applicants.length > 0 && activeApplicantId
                        ? 'Pro tohoto žadatele nejsou nahrány žádné soubory.'
                        : 'Žádné soubory nejsou nahrány.'}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {contentTab === 'bank-kalk' && caseData && (
            <div className="p-6">
              <CaseBankCalculatorsPanel caseId={caseData.id} />
            </div>
          )}

          {contentTab === 'kalendar' && caseData && (
            <div className="p-6">
              <CaseCalendarTab caseId={caseData.id} caseName={caseData.jmeno} />
            </div>
          )}
        </div>
        </div>
      </div>

      {(() => {
        const shouldRenderAddModal = !!(caseData && addModalApplicant);
        if (shouldRenderAddModal || showAddCoApplicantModal) {
          console.log('[CaseDetail] modal stav', { shouldRenderAddModal, showAddCoApplicantModal, hasAddModalApplicant: !!addModalApplicant, hasCaseData: !!caseData });
        }
        return null;
      })()}
      {caseData && addModalApplicant && (
        <AddCoApplicantModal
          open={showAddCoApplicantModal}
          onClose={() => {
            setShowAddCoApplicantModal(false);
            setAddModalApplicant(null);
          }}
          applicant={addModalApplicant}
          caseId={caseData.id}
          onUploadComplete={(updated) => {
            setCaseData(updated);
            setShowAddCoApplicantModal(false);
            setAddModalApplicant(null);
          }}
        />
      )}

      {caseData && currentApplicant && (
        <ApplicantUploadModal
          key="upload-current"
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          applicant={currentApplicant}
          caseId={caseData.id}
          onUploadComplete={(updated) => {
            setCaseData(updated);
            setUploadModalOpen(false);
          }}
        />
      )}

      {applicantToRemoveId && (
        <ConfirmModal
          open
          onClose={() => setApplicantToRemoveId(null)}
          onConfirm={() => {
            const id = applicantToRemoveId;
            setApplicantToRemoveId(null);
            if (id) void handleRemoveApplicant(id);
          }}
          title="Odebrat spolužadatele"
          message="Opravdu chcete odebrat tohoto spolužadatele z případu? Všechna jeho data (včetně nahraných dokumentů a extrahovaných údajů) budou odstraněna."
          cancelLabel="Zrušit"
          confirmLabel="Ano, odebrat"
          danger
        />
      )}

      <Dialog
        open={reuploadModalOpen}
        onOpenChange={(open) => {
          if (!open && reuploadSubmitting) return;
          if (!open) {
            setReuploadModalOpen(false);
            setReuploadTargetFile(null);
            setReuploadSelectedFile(null);
            setReuploadError(null);
          } else {
            setReuploadModalOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nahrát nový soubor</DialogTitle>
            <DialogDescription>
              {reuploadTargetFile
                ? `Typ: ${fileTypeLabels[reuploadTargetFile.type]} | Původní: ${reuploadTargetFile.name}`
                : 'Vyberte nový soubor pro přehrání dokumentu.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif"
              onChange={(e) => setReuploadSelectedFile(e.target.files?.[0] ?? null)}
              disabled={reuploadSubmitting}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:text-foreground"
            />
            {reuploadSelectedFile && (
              <p className="text-xs text-muted-foreground">Vybraný soubor: {reuploadSelectedFile.name}</p>
            )}
            {reuploadError && <p className="text-sm text-red-500">{reuploadError}</p>}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setReuploadModalOpen(false);
                setReuploadTargetFile(null);
                setReuploadSelectedFile(null);
                setReuploadError(null);
              }}
              disabled={reuploadSubmitting}
              className="px-3 py-2 text-sm border border-border rounded-md text-foreground"
            >
              Zrušit
            </button>
            <button
              type="button"
              onClick={() => void handleRunReupload(false)}
              disabled={!reuploadSelectedFile || reuploadSubmitting}
              className="px-3 py-2 text-sm border border-blue-400 text-blue-500 rounded-md disabled:opacity-50"
            >
              Nahrát a uložit
            </button>
            <button
              type="button"
              onClick={() => void handleRunReupload(true)}
              disabled={!reuploadSelectedFile || reuploadSubmitting}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              Nahrát a extrahovat
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
