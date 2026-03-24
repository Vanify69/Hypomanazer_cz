import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, Star, FileText, Building2, Save, Trash2, UserCircle, Receipt, CreditCard, Pencil, Eye, Upload, RefreshCw, Users, Zap, UserPlus, UserMinus, EyeOff } from 'lucide-react';
import { getCases, saveCase, setActiveCase, deleteCase } from '../lib/storage';
import { Case, UploadedFile, Applicant, ExtractedData, TaxData, BankStatementData } from '../lib/types';
import { StatusBadge } from '../components/cases/StatusBadge';
import { Tabs } from '../components/cases/Tabs';
import { ImageModal } from '../components/modals/ImageModal';
import { PDFModal } from '../components/modals/PDFModal';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import { ApplicantUploadModal } from '../components/modals/ApplicantUploadModal';
import { TaxReturnTable } from '../components/TaxReturnTable';

export function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [vyseUveru, setVyseUveru] = useState('');
  const [ucel, setUcel] = useState('');
  const [activeTab, setActiveTab] = useState('zakladni');
  const [activeApplicantId, setActiveApplicantId] = useState<string | null>(null);
  const [isEditingLoanData, setIsEditingLoanData] = useState(false);
  const [imageModal, setImageModal] = useState<{ isOpen: boolean; url: string; name: string }>({ isOpen: false, url: '', name: '' });
  const [pdfModal, setPdfModal] = useState<{ isOpen: boolean; url: string; name: string }>({ isOpen: false, url: '', name: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; fileIndex: number | null }>({ isOpen: false, fileIndex: null });
  const [replaceFileIndex, setReplaceFileIndex] = useState<number | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteApplicantDialog, setDeleteApplicantDialog] = useState<{ isOpen: boolean; applicantId: string | null }>({ isOpen: false, applicantId: null });
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const cases = getCases();
    const found = cases.find(c => c.id === id);
    if (found) {
      setCaseData(found);
      setVyseUveru(found.vyseUveru?.toString() || '');
      setUcel(found.ucel || '');
      // Nastavit aktivního žadatele
      if (found.applicants && found.applicants.length > 0) {
        setActiveApplicantId(found.activeApplicantId || found.applicants[0].id);
      }
    }
  }, [id]);
  
  useEffect(() => {
    if (replaceFileIndex !== null) {
      fileInputRef.current?.click();
    }
  }, [replaceFileIndex]);
  
  const handleSave = () => {
    if (!caseData) return;
    
    const updated: Case = {
      ...caseData,
      vyseUveru: vyseUveru ? parseInt(vyseUveru) : undefined,
      ucel: ucel || undefined,
      status: vyseUveru && ucel ? 'doplneno' : caseData.status
    };
    
    saveCase(updated);
    setCaseData(updated);
  };
  
  const handleSetActive = () => {
    if (!caseData) return;
    setActiveCase(caseData.id);
    
    const cases = getCases();
    const updated = cases.find(c => c.id === caseData.id);
    if (updated) {
      setCaseData(updated);
    }
  };
  
  const handleDelete = () => {
    if (!caseData || !confirm(`Opravdu chcete smazat případ ${caseData.jmeno}?`)) return;
    deleteCase(caseData.id);
    navigate('/');
  };
  
  const handleSetMainApplicant = (applicantId: string) => {
    if (!caseData || !caseData.applicants) return;
    
    const updatedApplicants = caseData.applicants.map(applicant => ({
      ...applicant,
      role: applicant.id === applicantId ? 'hlavni' as const : 'spoluzadatel' as const
    }));
    
    // Najít nového hlavního žadatele a aktualizovat název případu
    const newMainApplicant = updatedApplicants.find(a => a.id === applicantId);
    const newCaseName = newMainApplicant?.extractedData 
      ? `${newMainApplicant.extractedData.jmeno} ${newMainApplicant.extractedData.prijmeni}`
      : caseData.jmeno;
    
    const updatedCase: Case = {
      ...caseData,
      applicants: updatedApplicants,
      jmeno: newCaseName
    };
    
    saveCase(updatedCase);
    setCaseData(updatedCase);
  };
  
  const handleAddApplicant = () => {
    if (!caseData) return;
    
    // Pokud ještě není pole applicants, převést stávající data
    let currentApplicants: Applicant[] = [];
    
    if (caseData.applicants && caseData.applicants.length > 0) {
      currentApplicants = caseData.applicants;
    } else if (caseData.extractedData) {
      // Převést starý formát na nový
      currentApplicants = [{
        id: 'a1',
        role: 'hlavni',
        order: 1,
        extractedData: caseData.extractedData,
        taxData: caseData.taxData,
        bankStatementData: caseData.bankStatementData
      }];
      
      // Uložit konverzi
      const updatedCase: Case = {
        ...caseData,
        applicants: currentApplicants
      };
      saveCase(updatedCase);
      setCaseData(updatedCase);
    }
    
    // Kontrola maxima 4 žadatelů
    if (currentApplicants.length >= 4) {
      alert('Maximální počet žadatelů je 4');
      return;
    }
    
    // Otevřít modal pro nahrání dokumentů
    setUploadModalOpen(true);
  };
  
  const handleApplicantUploadComplete = (applicantData: {
    extractedData: ExtractedData;
    taxData?: TaxData;
    bankStatementData?: BankStatementData;
  }) => {
    if (!caseData) return;
    
    const currentApplicants = caseData.applicants || [];
    
    // Vytvořit nového spolužadatele s nahranými daty
    const newApplicant: Applicant = {
      id: `a${Date.now()}`,
      role: 'spoluzadatel',
      order: currentApplicants.length + 1,
      extractedData: applicantData.extractedData,
      taxData: applicantData.taxData,
      bankStatementData: applicantData.bankStatementData
    };
    
    const updatedCase: Case = {
      ...caseData,
      applicants: [...currentApplicants, newApplicant],
      activeApplicantId: newApplicant.id
    };
    
    saveCase(updatedCase);
    setCaseData(updatedCase);
    
    // Nastavit nového žadatele jako aktivního pro zobrazení
    setActiveApplicantId(newApplicant.id);
    
    // Zavřít modal
    setUploadModalOpen(false);
  };
  
  const handleDeleteApplicant = (applicantId: string) => {
    if (!caseData || !caseData.applicants) return;
    
    const applicant = caseData.applicants.find(a => a.id === applicantId);
    if (!applicant) return;
    
    // Nelze smazat pokud je jen jeden žadatel
    if (caseData.applicants.length === 1) {
      alert('Nemůžete smazat posledního žadatele. Musí zůstat alespoň jeden.');
      return;
    }
    
    // Nelze smazat hlavního žadatele, pokud jsou ještě spolužadatelé
    if (applicant.role === 'hlavni' && caseData.applicants.length > 1) {
      alert('Nemůžete smazat hlavního žadatele. Nejprve nastavte jiného žadatele jako hlavního.');
      return;
    }
    
    const applicantName = applicant.extractedData 
      ? `${applicant.extractedData.jmeno} ${applicant.extractedData.prijmeni}`
      : 'tohoto žadatele';
    
    setDeleteApplicantDialog({ isOpen: true, applicantId });
  };
  
  const confirmDeleteApplicant = () => {
    if (!caseData || !deleteApplicantDialog.applicantId) return;
    
    const updatedApplicants = caseData.applicants?.filter(a => a.id !== deleteApplicantDialog.applicantId) || [];
    
    // Pokud byl smazán aktivní žadatel, nastavit jiného
    let newActiveApplicantId = activeApplicantId;
    if (activeApplicantId === deleteApplicantDialog.applicantId) {
      newActiveApplicantId = updatedApplicants[0]?.id || null;
    }
    
    const updatedCase: Case = {
      ...caseData,
      applicants: updatedApplicants,
      activeApplicantId: newActiveApplicantId
    };
    
    saveCase(updatedCase);
    setCaseData(updatedCase);
    setActiveApplicantId(newActiveApplicantId);
    setDeleteApplicantDialog({ isOpen: false, applicantId: null });
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!caseData) return;
    
    const file = e.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let fileType: UploadedFile['type'] = 'op-predni';
      
      if (file.name.toLowerCase().includes('danove') || fileExtension === 'pdf') {
        fileType = 'danove';
      } else if (file.name.toLowerCase().includes('vypis')) {
        fileType = 'vypisy';
      } else if (file.name.toLowerCase().includes('zadni')) {
        fileType = 'op-zadni';
      }
      
      const newFile: UploadedFile = {
        name: file.name,
        type: fileType,
        url: URL.createObjectURL(file)
      };
      
      let updatedCase: Case;
      
      if (replaceFileIndex !== null) {
        const updatedFiles = [...caseData.soubory];
        updatedFiles[replaceFileIndex] = newFile;
        updatedCase = {
          ...caseData,
          soubory: updatedFiles
        };
        setReplaceFileIndex(null);
      } else {
        updatedCase = {
          ...caseData,
          soubory: [...caseData.soubory, newFile]
        };
      }
      
      saveCase(updatedCase);
      setCaseData(updatedCase);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleViewFile = (file: UploadedFile) => {
    if (file.type === 'op-predni' || file.type === 'op-zadni') {
      setImageModal({ isOpen: true, url: file.url || '', name: file.name });
    } else if (file.type === 'danove' || file.type === 'vypisy') {
      setPdfModal({ isOpen: true, url: file.url || '', name: file.name });
    }
  };
  
  const handleDeleteFile = (index: number) => {
    if (!caseData) return;
    
    const updatedFiles = [...caseData.soubory];
    updatedFiles.splice(index, 1);
    const updatedCase: Case = {
      ...caseData,
      soubory: updatedFiles
    };
    saveCase(updatedCase);
    setCaseData(updatedCase);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  if (!caseData) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Případ nenalezen</p>
      </div>
    );
  }
  
  const fileTypeLabels = {
    'op-predni': 'OP - přední strana',
    'op-zadni': 'OP - zadní strana',
    'danove': 'Daňové přiznání',
    'vypisy': 'Výpisy z účtu'
  };
  
  const tabs = [
    { id: 'zakladni', label: 'Osobní údaje', icon: <Pencil className="w-4 h-4" /> },
    { id: 'op', label: 'Data z OP', icon: <UserCircle className="w-4 h-4" /> },
    { id: 'dp', label: 'Data z DP', icon: <Receipt className="w-4 h-4" /> },
    { id: 'vypisy', label: 'Data z výpisů', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'podklady', label: 'Nahrané podklady', icon: <FileText className="w-4 h-4" /> },
  ];
  
  return (
    <>
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zpět na přehled
          </Link>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{caseData.jmeno}</h1>
                  {caseData.isActive && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      Aktivní případ
                    </span>
                  )}
                  <StatusBadge status={caseData.status} />
                </div>
                
                <div className="flex gap-2">
                  {!caseData.isActive && (
                    <button
                      onClick={handleSetActive}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Star className="w-4 h-4" />
                      Použít pro zkratky
                    </button>
                  )}
                  {(() => {
                    // Zjistit počet žadatelů (včetně starého formátu)
                    const applicantCount = caseData.applicants?.length || (caseData.extractedData ? 1 : 0);
                    return applicantCount === 1 && applicantCount < 4 && (
                      <button
                        onClick={handleAddApplicant}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Přidat spolužadatele
                      </button>
                    );
                  })()}
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Smazat případ
                  </button>
                </div>
              </div>
              
              {/* Údaje o úvěru - přímo v headeru */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Údaje o úvěru</h3>
                  {!isEditingLoanData && (
                    <button
                      onClick={() => setIsEditingLoanData(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editovat
                    </button>
                  )}
                </div>
                
                {isEditingLoanData ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="vyseUveru" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Výše úvěru (Kč)
                        </label>
                        <input
                          id="vyseUveru"
                          type="number"
                          value={vyseUveru}
                          onChange={(e) => setVyseUveru(e.target.value)}
                          placeholder="např. 3500000"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label htmlFor="ucel" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Účel úvěru
                        </label>
                        <input
                          id="ucel"
                          type="text"
                          value={ucel}
                          onChange={(e) => setUcel(e.target.value)}
                          placeholder="např. Koupě bytu 3+kk, Praha 5"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleSave();
                          setIsEditingLoanData(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Save className="w-4 h-4" />
                        Uložit
                      </button>
                      <button
                        onClick={() => {
                          setVyseUveru(caseData.vyseUveru?.toString() || '');
                          setUcel(caseData.ucel || '');
                          setIsEditingLoanData(false);
                        }}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        Zrušit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Výše úvěru</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {vyseUveru ? formatCurrency(parseInt(vyseUveru)) : <span className="text-gray-400 dark:text-gray-500">Neuvedeno</span>}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Účel úvěru</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {ucel || <span className="text-gray-400 dark:text-gray-500">Neuvedeno</span>}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Přepínač žadatelů v hlavičce - pouze pokud je více než 1 */}
              {(caseData.applicants?.length || 0) > 1 && (
                <div className="mt-6 p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Žadatelé ({caseData.applicants?.length || 0})</span>
                    </div>
                    
                    {/* Tlačítko přidat spolužadatele jako ikona */}
                    {(caseData.applicants?.length || 0) < 4 && (
                      <button
                        onClick={handleAddApplicant}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Přidat spolužadatele"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {caseData.applicants?.map((applicant) => {
                      const isActive = applicant.id === activeApplicantId;
                      const isMainApplicant = applicant.role === 'hlavni';
                      return (
                        <div
                          key={applicant.id}
                          className={`p-3 rounded-lg border transition-all ${
                            isActive
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div
                            onClick={() => setActiveApplicantId(applicant.id)}
                            className="w-full text-left mb-2 cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-600' : 'bg-gray-300'}`} />
                                <span className="text-xs font-medium text-gray-500 uppercase">
                                  {isMainApplicant ? 'Hlavní žadatel' : 'Spolužadatel'}
                                </span>
                              </div>
                              {!isMainApplicant && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteApplicant(applicant.id);
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Smazat žadatele"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {applicant.extractedData && (
                              <>
                                <p className={`font-semibold text-sm ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {applicant.extractedData.jmeno}
                                </p>
                                <p className={`font-semibold text-sm ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {applicant.extractedData.prijmeni}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 font-mono">
                                  {applicant.extractedData.rc}
                                </p>
                              </>
                            )}
                          </div>
                          
                          {!isMainApplicant && (
                            <button
                              onClick={() => handleSetMainApplicant(applicant.id)}
                              className="w-full px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                            >
                              Nastavit jako hlavního žadatele
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {caseData.isActive && (
                    <div className="mt-3 p-2 bg-blue-600 rounded-lg">
                      <p className="text-xs text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Klávesové zkratky budou vkládat data aktuálně vybraného žadatele
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            
            {/* Tab Content */}
            <div className="p-6">
              {/* Základní data */}
              {activeTab === 'zakladni' && (() => {
                // Získání dat podle aktivního žadatele
                const getActiveData = (): ExtractedData | undefined => {
                  if (caseData.applicants && activeApplicantId) {
                    const applicant = caseData.applicants.find(a => a.id === activeApplicantId);
                    return applicant?.extractedData;
                  }
                  return caseData.extractedData;
                };
                
                const activeData = getActiveData();
                
                return (
                  <div className="space-y-6">
                    {/* Osobní údaje žadatele */}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Osobní údaje žadatele</h2>
                      
                      {activeData ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jméno</label>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                              {activeData.jmeno}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Příjmení</label>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                              {activeData.prijmeni}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rodné číslo</label>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono">
                              {activeData.rc}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Datum narození</label>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                              {activeData.datumNarozeni}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Místo narození</label>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                              {activeData.mistoNarozeni}
                            </div>
                          </div>
                          
                          {activeData.pohlavi && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pohlaví</label>
                              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                                {activeData.pohlavi === 'M' ? 'Muž' : activeData.pohlavi === 'F' ? 'Žena' : activeData.pohlavi}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Národnost</label>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                              {activeData.narodnost || <span className="text-gray-400 dark:text-gray-500">Neuvedeno</span>}
                            </div>
                          </div>
                          
                          {activeData.rodinnyStav && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rodinný stav</label>
                              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                                {activeData.rodinnyStav}
                              </div>
                            </div>
                          )}
                          
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresa trvalého bydliště</label>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                              {activeData.adresa}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <UserCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400 text-sm">Základní údaje nejsou k dispozici</p>
                        </div>
                      )}
                    </div>
                  
                    {/* Bankovní výsledky */}
                    {caseData.status === 'doplneno' && (
                      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          Výsledky z bank
                        </h2>
                        
                        <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-600 border-b border-gray-200 dark:border-gray-500">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Banka</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Měsíční splátka</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Úroková sazba</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                              <tr>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Komerční banka</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(18450)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">5.49 %</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">ČSOB</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(18920)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">5.69 %</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                          * Výsledky jsou orientační a závisí na aktuálních nabídkách bank
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Data z OP */}
              {activeTab === 'op' && (() => {
                // Získání dat podle aktivního žadatele
                const getActiveData = (): ExtractedData | undefined => {
                  if (caseData.applicants && activeApplicantId) {
                    const applicant = caseData.applicants.find(a => a.id === activeApplicantId);
                    return applicant?.extractedData;
                  }
                  return caseData.extractedData;
                };
                
                const activeData = getActiveData();
                
                return (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Údaje o občanském průkazu</h2>
                    
                    {/* Zobrazení dat aktivního žadatele */}
                    {activeData ? (
                      <div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                          <div className="flex items-center gap-2 mb-1">
                            <UserCircle className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                            <h3 className="font-semibold text-blue-900 dark:text-blue-300">Informace o dokladu totožnosti</h3>
                          </div>
                          <p className="text-sm text-blue-800 dark:text-blue-300">Automaticky vytaženo z nahraných skenů OP</p>
                        </div>
                        
                        {/* Údaje o dokladu */}
                        {(activeData.cisloDokladu || activeData.datumVydani || activeData.platnostDo || activeData.vydavajiciUrad) ? (
                          <div className="space-y-4">
                            {/* Číslo dokladu - celá šířka */}
                            {activeData.cisloDokladu && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Číslo dokladu</label>
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono">
                                  {activeData.cisloDokladu}
                                </div>
                              </div>
                            )}
                            
                            {/* Datum vydání a Platnost do - vedle sebe */}
                            {(activeData.datumVydani || activeData.platnostDo) && (
                              <div className="grid grid-cols-2 gap-4">
                                {activeData.datumVydani && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Datum vydání</label>
                                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                                      {activeData.datumVydani}
                                    </div>
                                  </div>
                                )}
                                
                                {activeData.platnostDo && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platnost do</label>
                                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                                      {activeData.platnostDo}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Vydávající úřad - celá šířka */}
                            {activeData.vydavajiciUrad && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vydávající úřad</label>
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                                  {activeData.vydavajiciUrad}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                            <UserCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Údaje o dokladu nejsou k dispozici</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <UserCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Data z OP nejsou k dispozici</p>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Data z daňového přiznání */}
              {activeTab === 'dp' && (() => {
                // Získání dat podle aktivního žadatele
                const getActiveTaxData = (): TaxData | undefined => {
                  if (caseData.applicants && activeApplicantId) {
                    const applicant = caseData.applicants.find(a => a.id === activeApplicantId);
                    return applicant?.taxData;
                  }
                  return caseData.taxData;
                };
                
                const activeTaxData = getActiveTaxData();
                
                return (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data z daňového přiznání</h2>
                    
                    {activeTaxData ? (
                      <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Receipt className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                            <h3 className="font-semibold text-blue-900 dark:text-blue-300">Daňové přiznání za rok {activeTaxData.rok}</h3>
                          </div>
                          <p className="text-sm text-blue-800 dark:text-blue-300">Automaticky vytaženo z nahraných dokumentů</p>
                        </div>
                        
                        {/* Základní metadata z DP */}
                        {(activeTaxData.ic || activeTaxData.dic || activeTaxData.czNace || activeTaxData.zpusobUplatneniVydaju) && (
                          <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-5">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
                              Základní údaje z DP
                            </h3>
                            
                            <div className="space-y-3">
                              {activeTaxData.ic && (
                                <div className="flex justify-between items-center py-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded px-2 -mx-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">IČ (identifikační číslo)</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{activeTaxData.ic}</span>
                                </div>
                              )}
                              
                              {activeTaxData.dic && (
                                <div className="flex justify-between items-center py-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded px-2 -mx-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">DIČ (daňové identifikační číslo)</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{activeTaxData.dic}</span>
                                </div>
                              )}
                              
                              {activeTaxData.czNace && (
                                <div className="flex justify-between items-start py-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded px-2 -mx-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Převažující CZ-NACE</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-md">{activeTaxData.czNace}</span>
                                </div>
                              )}
                              
                              {activeTaxData.zpusobUplatneniVydaju && (
                                <div className="flex justify-between items-center py-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded px-2 -mx-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Způsob uplatnění výdajů</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {activeTaxData.zpusobUplatneniVydaju === 'danovaEvidence' && 'Daňová evidence'}
                                    {activeTaxData.zpusobUplatneniVydaju === 'ucetnictvi' && 'Účetnictví'}
                                    {activeTaxData.zpusobUplatneniVydaju === 'pausalniVydaje' && (
                                      <>Výdaje procentem z příjmů - paušál {activeTaxData.vydajovyPausal}%</>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Kompletní data z DP */}
                        <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-5">
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              Kompletní data z daňového přiznání
                            </h3>
                            <button
                              onClick={() => setHideEmptyRows(!hideEmptyRows)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                              title={hideEmptyRows ? "Zobrazit všechny řádky" : "Skrýt nulové a neobsazené řádky"}
                            >
                              {hideEmptyRows ? (
                                <>
                                  <Eye className="w-4 h-4" />
                                  Zobrazit vše
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-4 h-4" />
                                  Skrýt prázdné
                                </>
                              )}
                            </button>
                          </div>
                          
                          {activeTaxData.kompletniData ? (
                            <TaxReturnTable data={activeTaxData.kompletniData} formatCurrency={formatCurrency} hideEmptyRows={hideEmptyRows} />
                          ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                              Kompletní data z daňového přiznání nejsou k dispozici
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <Receipt className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Daňové přiznání nebylo nahráno nebo zpracováno</p>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Data z výpisů */}
              {activeTab === 'vypisy' && (() => {
                // Získání dat podle aktivního žadatele
                const getActiveBankData = (): BankStatementData | undefined => {
                  if (caseData.applicants && activeApplicantId) {
                    const applicant = caseData.applicants.find(a => a.id === activeApplicantId);
                    return applicant?.bankStatementData;
                  }
                  return caseData.bankStatementData;
                };
                
                const activeBankData = getActiveBankData();
                
                return (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Data z bankovních výpisů</h2>
                    
                    {activeBankData ? (
                      <div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                          <div className="flex items-center gap-2 mb-1">
                            <CreditCard className="w-5 h-5 text-blue-700" />
                            <h3 className="font-semibold text-blue-900">Bankovní výpis za období {activeBankData.obdobi}</h3>
                          </div>
                          <p className="text-sm text-blue-800">Automaticky analyzováno z nahraných výpisů</p>
                        </div>
                        
                        {/* Zaměstnavatel */}
                        {activeBankData.zamestnavatel && (
                          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
                            <div className="flex items-start gap-3">
                              <Building2 className="w-5 h-5 text-gray-600 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-baseline gap-3 mb-1">
                                  <span className="text-sm text-gray-600">Zaměstnavatel:</span>
                                  <span className="text-base font-semibold text-gray-900">{activeBankData.zamestnavatel}</span>
                                </div>
                                {activeBankData.zamestnavatelIco && (
                                  <div className="flex items-baseline gap-3 mb-1">
                                    <span className="text-sm text-gray-600">IČ zaměstnavatele:</span>
                                    <span className="text-sm font-medium text-gray-900">{activeBankData.zamestnavatelIco}</span>
                                  </div>
                                )}
                                {activeBankData.prumernaMzda && (
                                  <div className="flex items-baseline gap-3 mt-2 pt-2 border-t border-gray-200">
                                    <span className="text-sm text-gray-600">Průměrná měsíční mzda:</span>
                                    <span className="text-lg font-bold text-green-700">{formatCurrency(activeBankData.prumernaMzda)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Příjmy ze zaměstnání */}
                        <div className="mb-6">
                          <h3 className="font-medium text-gray-900 mb-3">Příjmy ze zaměstnání</h3>
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Datum</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Popis</th>
                                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Částka</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {activeBankData.prijmyZeZamestnani.map((prijem, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                      {new Date(prijem.datum).toLocaleDateString('cs-CZ')}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{prijem.popis}</td>
                                    <td className="px-4 py-3 text-sm text-right font-medium text-green-700">
                                      +{formatCurrency(prijem.castka)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        {/* Ostatní příjmy */}
                        {activeBankData.ostatniPrijmy && activeBankData.ostatniPrijmy.length > 0 && (
                          <div>
                            {/* Shrnutí pravidelných ostatních příjmů */}
                            {activeBankData.pravidelneOstatniPrijmy && activeBankData.pravidelneOstatniPrijmy.length > 0 && (
                              <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                                <h3 className="font-medium text-gray-900 mb-3">Pravidelné ostatní příjmy</h3>
                                <div className="space-y-2">
                                  {activeBankData.pravidelneOstatniPrijmy.map((prijem, index) => (
                                    <div key={index} className="flex items-baseline gap-3">
                                      <span className="text-sm text-gray-600">{prijem.typ}:</span>
                                      <span className="text-lg font-bold text-blue-700">{formatCurrency(prijem.castka)}</span>
                                      {prijem.pravidelnost === 'mesicne' && (
                                        <span className="text-xs text-gray-500">(měsíčně)</span>
                                      )}
                                      {prijem.pravidelnost === 'nepravidelne' && (
                                        <span className="text-xs text-orange-600">(nepravidelně)</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <h3 className="font-medium text-gray-900 mb-3">Detail ostatních příjmů</h3>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Datum</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Popis</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Částka</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                  {activeBankData.ostatniPrijmy.map((prijem, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 text-sm text-gray-900">
                                        {new Date(prijem.datum).toLocaleDateString('cs-CZ')}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{prijem.popis}</td>
                                      <td className="px-4 py-3 text-sm text-right font-medium text-blue-700">
                                        +{formatCurrency(prijem.castka)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Bankovní výpisy nebyly nahrány nebo zpracovány</p>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Nahrané podklady */}
              {activeTab === 'podklady' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Nahraté podklady</h2>
                    
                    <button
                      onClick={() => {
                        setReplaceFileIndex(null);
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Nahrát soubor
                    </button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  
                  {caseData.soubory.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {caseData.soubory.map((file, index) => (
                        <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{fileTypeLabels[file.type]}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewFile(file)}
                              className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                              title="Zobrazit"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="hidden sm:inline">Zobrazit</span>
                            </button>
                            <button
                              onClick={() => setReplaceFileIndex(index)}
                              className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                              title="Přehrát"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span className="hidden sm:inline">Přehrát</span>
                            </button>
                            <button
                              onClick={() => setDeleteDialog({ isOpen: true, fileIndex: index })}
                              className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                              title="Smazat"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline">Smazat</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm mb-4">Žádné soubory nejsou nahrány</p>
                      <button
                        onClick={() => {
                          setReplaceFileIndex(null);
                          fileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Nahrát první soubor
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <ImageModal
        isOpen={imageModal.isOpen}
        imageUrl={imageModal.url}
        fileName={imageModal.name}
        onClose={() => setImageModal({ isOpen: false, url: '', name: '' })}
      />
      
      <PDFModal
        isOpen={pdfModal.isOpen}
        pdfUrl={pdfModal.url}
        fileName={pdfModal.name}
        onClose={() => setPdfModal({ isOpen: false, url: '', name: '' })}
      />
      
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Smazat soubor"
        message="Opravdu chcete smazat tento soubor? Tuto akci nelze vrátit zpět."
        confirmText="Smazat"
        cancelText="Zrušit"
        onConfirm={() => {
          if (deleteDialog.fileIndex !== null) {
            handleDeleteFile(deleteDialog.fileIndex);
          }
        }}
        onClose={() => setDeleteDialog({ isOpen: false, fileIndex: null })}
      />
      
      <ApplicantUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onComplete={handleApplicantUploadComplete}
      />
      
      <ConfirmDialog
        isOpen={deleteApplicantDialog.isOpen}
        title="Smazat žadatele"
        message={`Opravdu chcete smazat ${deleteApplicantDialog.applicantId ? 'tohoto žadatele' : 'tohoto žadatele'}? Tuto akci nelze vrátit zpět.`}
        confirmText="Smazat"
        cancelText="Zrušit"
        onConfirm={confirmDeleteApplicant}
        onClose={() => setDeleteApplicantDialog({ isOpen: false, applicantId: null })}
      />
    </>
  );
}