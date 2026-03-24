# HypoManager - Update dokumentace (V2.0 → V2.9)

## 📌 Poznámka pro Cursor AI
Toto je **UPDATE dokumentace**, nikoliv kompletní zadání od nuly. Základní verze aplikace (V1-V2) již existuje a funguje. Tento dokument popisuje **pouze nové funkce a změny**, které byly přidány od verze 2.0 do aktuální verze 2.9.

---

## 🔄 Přehled změn

**DATA_VERSION: 2.9** (zvýšeno z 2.0)

### Co už existuje (V2.0):
✅ Základní CRUD pro případy (Dashboard, CaseDetail, NewCase)  
✅ localStorage persistence (`/lib/storage.ts`)  
✅ Routing s React Router  
✅ Základní Sidebar navigace  
✅ Datové typy v `/lib/types.ts`  
✅ Upload dokumentů (OP, DP, výpisy)  
✅ Mock extrakce dat z dokumentů  
✅ Status flow (novy → data-vytazena → doplneno)  
✅ Settings stránka s klávesovými zkratkami  

### Co je NOVÉ (V2.0 → V2.9):
🆕 **Podpora více žadatelů** (hlavní + až 3 spolužadatelé)  
🆕 **Tabs pro přepínání mezi žadateli** v detailu případu  
🆕 **Klávesová zkratka Shift+Tab** pro přepínání žadatelů  
🆕 **Minimalizace do systémové lišty**  
🆕 **TrayIndicator** (indikátor aktivního případu vpravo nahoře)  
🆕 **Přesun tlačítka minimalizace** do sidebaru (vlevo dole)  
🆕 **ApplicantUploadModal** pro nahrání dokumentů konkrétního žadatele  
🆕 **activeApplicantId** v Case pro sledování vybraného žadatele  

---

## 🆕 1. Podpora více žadatelů

### Změna v datovém modelu (`/lib/types.ts`)

#### Dříve (V2.0):
```typescript
interface Case {
  id: string;
  jmeno: string;
  datum: string;
  status: CaseStatus;
  vyseUveru?: number;
  ucel?: string;
  extractedData?: ExtractedData;     // Jen 1 žadatel
  taxData?: TaxData;
  bankStatementData?: BankStatementData;
  soubory: UploadedFile[];
  isActive: boolean;
}
```

#### Nyní (V2.9):
```typescript
interface Case {
  id: string;
  jmeno: string;
  datum: string;
  status: CaseStatus;
  vyseUveru?: number;
  ucel?: string;
  
  // ⚠️ DEPRECATED - zachováno pro zpětnou kompatibilitu
  extractedData?: ExtractedData;
  taxData?: TaxData;
  bankStatementData?: BankStatementData;
  
  // 🆕 NOVÉ - podpora až 4 žadatelů
  applicants?: Applicant[];          // Pole žadatelů
  activeApplicantId?: string;        // ID aktuálně vybraného žadatele
  
  soubory: UploadedFile[];
  isActive: boolean;
}
```

### Nový typ: Applicant

```typescript
interface Applicant {
  id: string;                        // Unikátní ID žadatele (např. "applicant-1", "applicant-2")
  role: 'hlavni' | 'spoluzadatel';   // Role žadatele
  order: number;                     // Pořadí (1-4)
  extractedData?: ExtractedData;     // Data z OP tohoto žadatele
  taxData?: TaxData;                 // Data z DP tohoto žadatele
  bankStatementData?: BankStatementData; // Data z výpisů tohoto žadatele
}
```

### Rozšíření UploadedFile

```typescript
interface UploadedFile {
  name: string;
  type: 'op-predni' | 'op-zadni' | 'danove' | 'vypisy';
  url?: string;
  applicantId?: string;              // 🆕 ID žadatele, ke kterému soubor patří
}
```

---

## 🆕 2. Komponenta Tabs pro přepínání žadatelů

### Nový soubor: `/components/cases/Tabs.tsx`

**Umístění:** Detail případu (`/pages/CaseDetail.tsx`)

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

**Použití v CaseDetail:**
```tsx
const [activeApplicantId, setActiveApplicantId] = useState(
  caseData.applicants?.[0]?.id || ''
);

<Tabs
  applicants={caseData.applicants || []}
  activeApplicantId={activeApplicantId}
  onTabChange={setActiveApplicantId}
/>
```

---

## 🆕 3. Klávesová zkratka Shift+Tab

### Implementace v `/pages/Root.tsx`

**Funkce:**
- Globální listener na `keydown` událost
- Detekce `Shift+Tab` (event.shiftKey && event.key === 'Tab')
- Přepne na dalšího žadatele v **aktivním případu**
- Cyklické přepínání (po posledním žadateli skočí na prvního)

**Přidání do Root komponenty:**

```typescript
export function Root() {
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  useEffect(() => {
    // Kontrola aktivního případu
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
- Přepíná mezi žadateli **v aktivním případu**, ne mezi případy
- Pokud je jen 1 žadatel, nedělá nic

---

## 🆕 4. Minimalizace do systémové lišty

### A) Přesun tlačítka minimalizace do Sidebaru

**Dříve (V2.0):**
- Tlačítko bylo vpravo nahoře v hlavním obsahu (`<button>` v Root.tsx)

**Nyní (V2.9):**
- Tlačítko je **vlevo dole v Sidebaru** (`/components/layout/Sidebar.tsx`)

**Změna v `/components/layout/Sidebar.tsx`:**

```typescript
interface SidebarProps {
  onMinimize: () => void;            // 🆕 NOVÝ prop
}

export default function Sidebar({ onMinimize }: SidebarProps) {
  // ... navigace ...
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">...</div>
      
      {/* Navigace */}
      <nav className="flex-1 p-4">...</nav>
      
      {/* 🆕 NOVÉ - Tlačítko minimalizace na konci sidebaru */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onMinimize}
          className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors"
        >
          <span>Minimalizovat do systémové lišty</span>
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

### B) Minimalizační logika v Root

**Změna v `/pages/Root.tsx`:**

```typescript
export function Root() {
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [isMinimized, setIsMinimized] = useState(false); // 🆕 NOVÝ state
  
  // ... useEffect s aktivním případem ...
  
  // 🆕 NOVÁ funkce
  const handleMinimize = () => {
    setIsMinimized(true);
  };
  
  // 🆕 NOVÁ funkce
  const handleRestore = () => {
    setIsMinimized(false);
  };
  
  // 🆕 NOVÝ - Když je minimalizováno, zobrazit jen malé tlačítko
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={handleRestore}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-lg hover:bg-gray-50 transition-colors"
        >
          Obnovit aplikaci
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onMinimize={handleMinimize} /> {/* 🆕 Předání callback */}
      <Outlet />
      <TrayIndicator activeCase={activeCase} />
    </div>
  );
}
```

**Jak to funguje:**
1. Uživatel klikne "Minimalizovat do systémové lišty" v sidebaru
2. `handleMinimize()` nastaví `isMinimized = true`
3. Celá aplikace zmizí
4. Zobrazí se jen malé tlačítko "Obnovit aplikaci" vlevo dole
5. Po kliknutí `handleRestore()` nastaví `isMinimized = false` → aplikace se vrátí

---

## 🆕 5. TrayIndicator (Indikátor systémové lišty)

### Nový soubor: `/components/layout/TrayIndicator.tsx`

**Funkce:**
- Zobrazuje se **vpravo nahoře** (fixed pozice)
- Ukazuje jméno aktivního případu
- Zelený puntík když je nějaký případ aktivní
- Ikona dokumentu

**Props:**
```typescript
interface TrayIndicatorProps {
  activeCase: Case | null;           // Aktivní případ nebo null
}
```

**Implementace:**
```tsx
import { FileText, Circle } from 'lucide-react';
import { Case } from '../../lib/types';

interface TrayIndicatorProps {
  activeCase: Case | null;
}

export function TrayIndicator({ activeCase }: TrayIndicatorProps) {
  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex items-center gap-3 z-50">
      <div className="relative">
        <FileText className="w-5 h-5 text-gray-700" />
        {activeCase && (
          <Circle className="w-2 h-2 text-green-500 fill-green-500 absolute -top-1 -right-1" />
        )}
      </div>
      <div className="text-sm">
        <div className="font-medium text-gray-900">
          {activeCase ? `Aktivní: ${activeCase.jmeno}` : 'Žádný aktivní případ'}
        </div>
        <div className="text-xs text-gray-500">Systémová lišta</div>
      </div>
    </div>
  );
}
```

**Použití v Root:**
```tsx
<TrayIndicator activeCase={activeCase} />
```

**Účel:**
- V budoucnu slouží pro detekci bankovních stránek
- Když je uživatel na stránce KB/RB, kliknutím na TrayIndicator vyplní formulář
- V této verzi pouze zobrazuje aktivní případ

---

## 🆕 6. ApplicantUploadModal

### Nový soubor: `/components/modals/ApplicantUploadModal.tsx`

**Funkce:**
- Modal pro nahrání dokumentů **konkrétního žadatele**
- Nahrazuje původní upload v NewCase (který byl jen pro hlavního žadatele)
- Umožňuje nahrát 4 typy dokumentů: OP přední, OP zadní, DP, výpisy
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
const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

// V UI:
<button onClick={() => {
  const currentApplicant = caseData.applicants?.find(
    a => a.id === activeApplicantId
  );
  setSelectedApplicant(currentApplicant);
  setIsUploadModalOpen(true);
}}>
  Nahrát dokumenty pro tohoto žadatele
</button>

{isUploadModalOpen && selectedApplicant && (
  <ApplicantUploadModal
    isOpen={isUploadModalOpen}
    onClose={() => setIsUploadModalOpen(false)}
    applicant={selectedApplicant}
    caseId={caseData.id}
    onUploadComplete={() => {
      // Reload case data
      setIsUploadModalOpen(false);
    }}
  />
)}
```

---

## 🆕 7. Změny v CaseDetail stránce

### Přidání podpory Tabs a více žadatelů

**Dříve (V2.0):**
- Zobrazoval jen data z `extractedData`, `taxData`, `bankStatementData`
- Nebyla podpora pro více žadatelů

**Nyní (V2.9):**
- Tabs pro přepínání mezi žadateli
- Zobrazuje data aktuálně vybraného žadatele
- Tlačítko "Přidat žadatele" (max 4)
- Tlačítko "Nahrát dokumenty" pro konkrétního žadatele

**Struktura:**
```tsx
function CaseDetail() {
  const { id } = useParams();
  const caseData = getCases().find(c => c.id === id);
  
  const [activeApplicantId, setActiveApplicantId] = useState(
    caseData?.activeApplicantId || caseData?.applicants?.[0]?.id || ''
  );
  
  const currentApplicant = caseData?.applicants?.find(
    a => a.id === activeApplicantId
  );
  
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
      {/* Tabs */}
      <Tabs
        applicants={caseData?.applicants || []}
        activeApplicantId={activeApplicantId}
        onTabChange={setActiveApplicantId}
      />
      
      {/* Data aktuálního žadatele */}
      {currentApplicant && (
        <div>
          <h3>Osobní údaje</h3>
          {currentApplicant.extractedData && (
            <div>
              <p>Jméno: {currentApplicant.extractedData.jmeno}</p>
              <p>Příjmení: {currentApplicant.extractedData.prijmeni}</p>
              {/* ... */}
            </div>
          )}
          
          <h3>Daňové údaje</h3>
          {currentApplicant.taxData && (
            <TaxReturnTable data={[currentApplicant.taxData]} />
          )}
          
          {/* ... bankovní výpisy ... */}
        </div>
      )}
      
      {/* Tlačítka */}
      <button onClick={handleAddApplicant}>
        Přidat žadatele ({caseData?.applicants?.length || 0}/4)
      </button>
      
      <button onClick={() => setIsUploadModalOpen(true)}>
        Nahrát dokumenty pro tohoto žadatele
      </button>
    </>
  );
}
```

---

## 🆕 8. Aktualizace Sidebaru - položka "Nový případ"

### Přidání navigační položky

**Změna v `/components/layout/Sidebar.tsx`:**

```typescript
import { LayoutDashboard, FolderPlus, Settings, Minimize2 } from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Přehled případů' },
  { path: '/new-case', icon: FolderPlus, label: 'Nový případ' },    // 🆕 NOVÝ
  { path: '/settings', icon: Settings, label: 'Nastavení' },
];
```

**Účel:**
- Umožnit vytvoření nového případu přímo z menu
- Dříve bylo třeba kliknout na tlačítko na Dashboardu

---

## 📋 Checklist pro implementaci v Cursor AI

Zkontroluj, že jsou implementovány tyto změny:

- [ ] **Datový model**
  - [ ] `Applicant` interface přidán do `/lib/types.ts`
  - [ ] `Case` interface má pole `applicants?: Applicant[]`
  - [ ] `Case` interface má `activeApplicantId?: string`
  - [ ] `UploadedFile` má `applicantId?: string`

- [ ] **Komponenty**
  - [ ] `/components/cases/Tabs.tsx` vytvořen
  - [ ] `/components/layout/TrayIndicator.tsx` vytvořen
  - [ ] `/components/modals/ApplicantUploadModal.tsx` vytvořen
  - [ ] `/components/layout/Sidebar.tsx` má tlačítko minimalizace vlevo dole
  - [ ] `/components/layout/Sidebar.tsx` má položku "Nový případ" v menu

- [ ] **Root komponenta** (`/pages/Root.tsx`)
  - [ ] `isMinimized` state přidán
  - [ ] `handleMinimize()` a `handleRestore()` funkce
  - [ ] Podmíněné renderování při minimalizaci
  - [ ] Global listener pro `Shift+Tab`
  - [ ] Interval pro kontrolu aktivního případu (každou sekundu)
  - [ ] TrayIndicator zobrazen vpravo nahoře

- [ ] **CaseDetail** (`/pages/CaseDetail.tsx`)
  - [ ] Tabs komponenta pro přepínání žadatelů
  - [ ] `activeApplicantId` state
  - [ ] Zobrazení dat aktuálního žadatele (ne všech najednou)
  - [ ] Tlačítko "Přidat žadatele" (max 4)
  - [ ] ApplicantUploadModal pro nahrání dokumentů žadatele

- [ ] **Funkčnost**
  - [ ] `Shift+Tab` přepíná mezi žadateli v aktivním případu
  - [ ] Minimalizace zobrazuje jen malé tlačítko vlevo dole
  - [ ] TrayIndicator ukazuje aktivní případ
  - [ ] Lze přidat až 4 žadatele k případu
  - [ ] Každý žadatel má vlastní dokumenty a data

---

## ⚠️ Zpětná kompatibilita

**Důležité:** Starší případy (z V2.0) mohou mít pouze `extractedData`, `taxData`, `bankStatementData` v root objektu Case, bez pole `applicants`.

**Migrace při načtení:**
```typescript
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

Tuto migraci je potřeba provést v `getCases()` nebo při načtení jednotlivého případu.

---

## 🎯 Souhrn klíčových změn

| Funkce | V2.0 | V2.9 |
|--------|------|------|
| **Počet žadatelů** | 1 (jen hlavní) | 1-4 (hlavní + až 3 spolužadatelé) |
| **Přepínání žadatelů** | ❌ | ✅ Tabs + Shift+Tab |
| **Minimalizace** | Tlačítko vpravo nahoře | Tlačítko v sidebaru vlevo dole |
| **Systémová lišta** | ❌ | ✅ TrayIndicator vpravo nahoře |
| **Upload dokumentů** | Jen v NewCase | ApplicantUploadModal pro každého žadatele |
| **Aktivní žadatel** | ❌ | ✅ activeApplicantId |
| **Nový případ v menu** | ❌ | ✅ FolderPlus ikona |

---

**Poznámka pro Cursor AI:** Tento dokument popisuje **pouze rozdíly** oproti základní verzi. Implementuj pouze tyto změny, zbytek aplikace zůstává nezměněn.
