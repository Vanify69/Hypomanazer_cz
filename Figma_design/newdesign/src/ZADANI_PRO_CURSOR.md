# Zadání: Implementace funkcí z UPDATE_V2_TO_CURRENT.md do nové verze aplikace

## Kontext
Máme desktopovou aplikaci pro zprostředkovatele hypoték v Reactu. Právě jsme dokončili nový layout:
- ✅ Nový dashboard v `/pages/DashboardNew.tsx` (Pipeline případů + KPI boxy vlevo, Nadcházející události vpravo)
- ✅ Horní lišta `/components/layout/TopBar.tsx` s aktuálními sazbami bank vpravo
- ✅ Sidebar `/components/layout/Sidebar.tsx` s indikátorem aktivního případu a uživatelským profilem

Nyní je třeba **implementovat funkce z dokumentace UPDATE_V2_TO_CURRENT.md** do této nové struktury.

---

## 🎯 Hlavní úkoly

### 1. Aktualizace datového modelu (`/lib/types.ts`)

**Přidat nové typy a rozšířit existující:**

```typescript
// Nový typ - Žadatel
interface Applicant {
  id: string;                        // Unikátní ID (např. "applicant-1")
  role: 'hlavni' | 'spoluzadatel';   // Role žadatele
  order: number;                     // Pořadí (1-4)
  extractedData?: ExtractedData;     // Data z OP tohoto žadatele
  taxData?: TaxData;                 // Data z DP tohoto žadatele
  bankStatementData?: BankStatementData; // Data z výpisů tohoto žadatele
}

// Rozšířit interface Case
interface Case {
  // ... existující properties ...
  
  // ⚠️ DEPRECATED - zachovat pro zpětnou kompatibilitu
  extractedData?: ExtractedData;
  taxData?: TaxData;
  bankStatementData?: BankStatementData;
  
  // 🆕 NOVÉ - podpora až 4 žadatelů
  applicants?: Applicant[];          // Pole žadatelů
  activeApplicantId?: string;        // ID aktuálně vybraného žadatele
}

// Rozšířit UploadedFile
interface UploadedFile {
  // ... existující properties ...
  applicantId?: string;              // 🆕 ID žadatele, ke kterému soubor patří
}
```

**Důležité:** Implementovat migrační funkci pro zpětnou kompatibilitu:

```typescript
// V /lib/storage.ts nebo přímo v getCases()
const migrateCase = (oldCase: Case): Case => {
  // Pokud už má applicants, neděláme nic
  if (oldCase.applicants && oldCase.applicants.length > 0) {
    return oldCase;
  }
  
  // Jinak vytvoříme hlavního žadatele ze starých dat
  const mainApplicant: Applicant = {
    id: 'applicant-main',
    role: 'hlavni',
    order: 1,
    extractedData: oldCase.extractedData,
    taxData: oldCase.taxData,
    bankStatementData: oldCase.bankStatementData,
  };
  
  return {
    ...oldCase,
    applicants: [mainApplicant],
    activeApplicantId: 'applicant-main',
  };
};
```

---

### 2. Vytvořit komponentu Tabs (`/components/cases/Tabs.tsx`)

**Funkce:**
- Zobrazuje taby pro každého žadatele v případu
- Aktivní tab zvýrazněn modře
- Kliknutí přepne na daného žadatele
- Zobrazuje: "Hlavní žadatel", "Spolužadatel 1", "Spolužadatel 2", "Spolužadatel 3"

**Props:**
```typescript
interface TabsProps {
  applicants: Applicant[];           // Pole žadatelů
  activeApplicantId: string;         // ID aktuálně aktivního žadatele
  onTabChange: (applicantId: string) => void; // Callback při přepnutí
}
```

**Design:**
- Horizontální tabs
- Modrá barva pro aktivní tab
- Šedá pro neaktivní
- Border-bottom pro celou řadu

---

### 3. Aktualizovat CaseDetail (`/pages/CaseDetail.tsx`)

**Změny:**

```typescript
function CaseDetail() {
  const { id } = useParams();
  const caseData = getCases().find(c => c.id === id);
  
  // 🆕 State pro aktivního žadatele
  const [activeApplicantId, setActiveApplicantId] = useState(
    caseData?.activeApplicantId || caseData?.applicants?.[0]?.id || ''
  );
  
  // 🆕 Najít aktuálního žadatele
  const currentApplicant = caseData?.applicants?.find(
    a => a.id === activeApplicantId
  );
  
  // 🆕 Funkce pro přidání žadatele
  const handleAddApplicant = () => {
    const newOrder = (caseData?.applicants?.length || 0) + 1;
    if (newOrder > 4) {
      alert('Maximálně 4 žadatelé');
      return;
    }
    
    const newApplicant: Applicant = {
      id: `applicant-${Date.now()}`,
      role: 'spoluzadatel',
      order: newOrder,
    };
    
    const updated = {
      ...caseData,
      applicants: [...(caseData?.applicants || []), newApplicant]
    };
    saveCase(updated);
  };
  
  return (
    <>
      {/* 🆕 Tabs pro přepínání žadatelů */}
      <Tabs
        applicants={caseData?.applicants || []}
        activeApplicantId={activeApplicantId}
        onTabChange={(id) => {
          setActiveApplicantId(id);
          // Uložit activeApplicantId do případu
          const updated = { ...caseData, activeApplicantId: id };
          saveCase(updated);
        }}
      />
      
      {/* 🆕 Data POUZE aktuálního žadatele */}
      {currentApplicant && (
        <div>
          <h3>Osobní údaje</h3>
          {currentApplicant.extractedData && (
            <div>
              <p>Jméno: {currentApplicant.extractedData.jmeno}</p>
              <p>Příjmení: {currentApplicant.extractedData.prijmeni}</p>
              {/* ... další data ... */}
            </div>
          )}
          
          <h3>Daňové údaje</h3>
          {currentApplicant.taxData && (
            <TaxReturnTable data={[currentApplicant.taxData]} />
          )}
          
          {/* ... bankovní výpisy ... */}
        </div>
      )}
      
      {/* 🆕 Tlačítka */}
      <Button onClick={handleAddApplicant}>
        Přidat žadatele ({caseData?.applicants?.length || 0}/4)
      </Button>
      
      <Button onClick={() => setIsUploadModalOpen(true)}>
        Nahrát dokumenty pro tohoto žadatele
      </Button>
    </>
  );
}
```

---

### 4. Vytvořit ApplicantUploadModal (`/components/modals/ApplicantUploadModal.tsx`)

**Funkce:**
- Modal pro nahrání dokumentů **konkrétního žadatele**
- Umožňuje nahrát 4 typy: OP přední, OP zadní, DP, výpisy
- Drag & drop podpora
- Náhled nahraných souborů
- Po nahrání spustí mock extrakci dat

**Props:**
```typescript
interface ApplicantUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;              // Žadatel, pro kterého nahráváme
  caseId: string;                    // ID případu
  onUploadComplete: () => void;      // Callback po dokončení
}
```

**Použití v CaseDetail:**
```tsx
const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

{isUploadModalOpen && currentApplicant && (
  <ApplicantUploadModal
    isOpen={isUploadModalOpen}
    onClose={() => setIsUploadModalOpen(false)}
    applicant={currentApplicant}
    caseId={caseData.id}
    onUploadComplete={() => {
      // Reload case data
      setIsUploadModalOpen(false);
    }}
  />
)}
```

---

### 5. Implementovat klávesovou zkratku Shift+Tab (`/pages/Root.tsx`)

**Přidat do existujícího Root komponenty:**

```typescript
export function Root() {
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  
  useEffect(() => {
    // Existující kód pro kontrolu aktivního případu...
    const checkActiveCase = () => {
      setActiveCase(getActiveCase());
    };
    checkActiveCase();
    const interval = setInterval(checkActiveCase, 1000);
    
    // 🆕 NOVÉ - Global listener pro Shift+Tab
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Tab' && activeCase) {
        e.preventDefault();
        
        const applicants = activeCase.applicants || [];
        if (applicants.length <= 1) return; // Není co přepínat
        
        const currentIndex = applicants.findIndex(
          a => a.id === activeCase.activeApplicantId
        );
        const nextIndex = (currentIndex + 1) % applicants.length;
        const nextApplicant = applicants[nextIndex];
        
        // Uložit nový activeApplicantId
        const updatedCase = {
          ...activeCase,
          activeApplicantId: nextApplicant.id
        };
        saveCase(updatedCase);
        setActiveCase(updatedCase);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCase]);
  
  // ... zbytek komponenty
}
```

**Důležité:**
- Zkratka funguje **pouze když je nějaký případ aktivní** (isActive: true)
- Přepíná mezi žadateli **v aktivním případu**
- Pokud je jen 1 žadatel, nedělá nic
- Cyklické přepínání (po posledním žadateli skočí na prvního)

---

### 6. Přesunout TrayIndicator do Sidebaru (`/components/layout/Sidebar.tsx`)

**Poznámka:** TrayIndicator se už **NEPOUŽÍVÁ vpravo nahoře** (máme nový layout s TopBar). Místo toho je **indikátor aktivního případu již v sidebaru** (bylo implementováno).

**Akce:** Zkontrolovat, že `/components/layout/Sidebar.tsx` má:
- ✅ Box s aktivním případem (ikona FileText + zelený puntík když je aktivní)
- ✅ Zobrazuje jméno aktivního případu nebo "Žádný"

**Pokud existuje samostatná komponenta `/components/layout/TrayIndicator.tsx`, můžeme ji:**
- Buď smazat (protože už máme indikátor v sidebaru)
- Nebo přejmenovat/refaktorovat pro budoucí použití s bankovními stránkami

---

### 7. Aktualizovat Settings (`/pages/Settings.tsx`)

**Přidat do seznamu klávesových zkratek:**

```typescript
const shortcuts = [
  // ... existující zkratky ...
  {
    keys: 'Shift + Tab',
    description: 'Přepnout na dalšího žadatele v aktivním případu',
    category: 'Navigace'
  }
];
```

---

### 8. Aktualizovat NewCase (`/pages/NewCase.tsx`)

**Změny:**
- Při vytváření nového případu vytvořit automaticky **hlavního žadatele**
- Přidat možnost přidat další žadatele už při vytváření (volitelné)

```typescript
const handleCreateCase = () => {
  const newCase: Case = {
    id: `case-${Date.now()}`,
    jmeno: formData.jmeno,
    datum: new Date().toISOString(),
    status: 'novy',
    vyseUveru: formData.vyseUveru,
    ucel: formData.ucel,
    soubory: [],
    isActive: false,
    
    // 🆕 NOVÉ - vytvořit hlavního žadatele
    applicants: [
      {
        id: 'applicant-main',
        role: 'hlavni',
        order: 1,
      }
    ],
    activeApplicantId: 'applicant-main'
  };
  
  saveCases([...cases, newCase]);
  navigate(`/case/${newCase.id}`);
};
```

---

## 📋 Checklist implementace

Zkontroluj, že jsou implementovány:

### Datový model
- [ ] `Applicant` interface v `/lib/types.ts`
- [ ] `Case.applicants?: Applicant[]`
- [ ] `Case.activeApplicantId?: string`
- [ ] `UploadedFile.applicantId?: string`
- [ ] Migrační funkce `migrateCase()` pro zpětnou kompatibilitu

### Komponenty
- [ ] `/components/cases/Tabs.tsx` vytvořen
- [ ] `/components/modals/ApplicantUploadModal.tsx` vytvořen
- [ ] Sidebar má indikátor aktivního případu (již hotovo ✅)

### Stránky
- [ ] `/pages/CaseDetail.tsx` - Tabs, activeApplicantId state, zobrazení dat aktuálního žadatele
- [ ] `/pages/CaseDetail.tsx` - Tlačítko "Přidat žadatele" (max 4)
- [ ] `/pages/CaseDetail.tsx` - ApplicantUploadModal integrace
- [ ] `/pages/NewCase.tsx` - Vytváření hlavního žadatele při novém případu
- [ ] `/pages/Settings.tsx` - Přidána zkratka Shift+Tab

### Root a routing
- [ ] `/pages/Root.tsx` - Global listener pro Shift+Tab
- [ ] `/pages/Root.tsx` - Kontrola aktivního případu (interval každou sekundu)

### Funkčnost
- [ ] Shift+Tab přepíná mezi žadateli v aktivním případu
- [ ] Lze přidat až 4 žadatele k případu
- [ ] Každý žadatel má vlastní dokumenty a data
- [ ] Tabs správně zobrazují všechny žadatele
- [ ] Zpětná kompatibilita - staré případy se automaticky migrují

---

## ⚠️ Důležité poznámky

1. **Zpětná kompatibilita:** Starší případy v localStorage mohou mít data jen v `extractedData`, `taxData`, `bankStatementData` bez pole `applicants`. Migrace MUSÍ proběhnout automaticky při načtení.

2. **Maximální počet žadatelů:** 4 (hlavní + max 3 spolužadatelé)

3. **ActiveApplicantId:** Vždy ukládat do localStorage při změně, aby se zachoval stav

4. **Shift+Tab:** Funguje pouze když je případ aktivní (`isActive: true`)

5. **Layout:** Respektovat nový layout s TopBar a Sidebar (fixed, sticky pozice)

---

## 🎨 Design guidelines

- Použít stejný design systém jako v existujících komponentách
- Modré barvy pro aktivní prvky (#3b82f6)
- Šedé pro neaktivní (#6b7280)
- Konzistentní spacing (p-4, gap-4, atd.)
- Komponenty z `/components/ui/*` (Button, Card, Badge, atd.)

---

## 🚀 Postup implementace

**Doporučené pořadí:**

1. Aktualizovat datový model (`/lib/types.ts`) + migrační funkce
2. Vytvořit komponentu Tabs
3. Vytvořit ApplicantUploadModal
4. Aktualizovat CaseDetail (integrace Tabs + modal)
5. Aktualizovat NewCase (vytváření hlavního žadatele)
6. Přidat Shift+Tab listener do Root
7. Aktualizovat Settings (přidat zkratku do seznamu)
8. Testovat zpětnou kompatibilitu

---

**Poznámka:** Tento dokument popisuje **pouze nové funkce** z UPDATE_V2_TO_CURRENT.md. Zbytek aplikace (Dashboard, TopBar, Sidebar, atd.) zůstává beze změny.
