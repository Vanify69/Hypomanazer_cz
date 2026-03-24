# Dokumentace nových sekcí - Tipaři a Kalendář

## ✅ Co bylo implementováno

### 1. Sekce Tipaři (Partners)

**Soubory:**
- `/pages/Partners.tsx` - Hlavní stránka se seznamem tipařů
- `/lib/mockPartnerData.ts` - Mock data pro tipaře
- `/lib/types.ts` - Rozšíření typů o `Partner` a `PartnerType`

**Funkce:**
- ✅ Tabulka s tipaři (partneři, kteří přivádějí leady)
- ✅ Vyhledávání v názvu, telefonu a emailu
- ✅ Filtrování podle typu (Realitka, Developer, Pojišťovák, Finanční poradce, Jiný)
- ✅ Zobrazení počtu přivedených leadů
- ✅ Kontaktní informace (telefon, email, kontaktní osoba)
- ✅ Akce (Upravit, Smazat)
- ✅ Tlačítko "Nový tipař"
- ✅ Dark mode support

**Datový model:**
```typescript
interface Partner {
  id: string;
  nazev: string; // Název firmy nebo jméno osoby
  typ: PartnerType; // REALITKA | DEVELOPER | POJISTOVAK | FINANCNI_PORADCE | JINÝ
  regCislo?: string; // IČ nebo registrační číslo
  kontakt: {
    telefon?: string;
    email?: string;
    osoba?: string; // Kontaktní osoba
  };
  pocetLeadu: number; // Počet přivedených leadů
  datumVytvoreni: string;
  poznamka?: string;
}
```

**Použití:**
- Navigace: `/partners`
- Data v localStorage pod klíčem: `partners`
- Mock data se načtou při první návštěvě

---

### 2. Sekce Kalendář (Calendar)

**Soubory:**
- `/pages/Calendar.tsx` - Měsíční kalendář s událostmi
- `/lib/types.ts` - Rozšíření typu `Event` o nová pole

**Funkce:**
- ✅ Měsíční zobrazení kalendáře
- ✅ Navigace mezi měsíci (šipky vlevo/vpravo)
- ✅ Tlačítko "Dnes" pro rychlý návrat
- ✅ Zobrazení dnešního dne modrou tečkou
- ✅ Události zobrazené jako barevné boxy v kalendáři
- ✅ Modal "Nová událost" s typy:
  - 🧑‍🤝‍🧑 Schůzka
  - 📞 Telefonát
  - 📄 Úkol
  - ⏰ Připomínka
- ✅ Celodenní události (checkbox)
- ✅ Začátek a konec události
- ✅ Místo (pro schůzky)
- ✅ Poznámka
- ✅ Dark mode support
- ✅ Přepínání zobrazení (Měsíc, Týden, Den) - připraveno pro budoucí implementaci

**Rozšíření datového modelu:**
```typescript
interface Event {
  id: string;
  typ: EventType; // MEETING | CALL | TASK | REMINDER
  nazev: string;
  popis?: string;
  datum: string; // ISO datum (YYYY-MM-DD)
  cas: string; // Čas začátku (HH:MM)
  konec?: string; // Čas konce (HH:MM) - NOVÉ
  misto?: string; // Místo schůzky - NOVÉ
  celoDenni?: boolean; // Zda je událost celodenní - NOVÉ
  klientId?: string;
  klientJmeno?: string;
  klientTyp?: 'lead' | 'pripad';
  splneno: boolean;
}
```

**Použití:**
- Navigace: `/calendar`
- Data v localStorage pod klíčem: `events`
- Kliknutím na den v kalendáři se otevře modal pro vytvoření nové události
- Události se zobrazují jako barevné boxy podle typu

**Barevné kódování:**
- 🔵 Modrá = Schůzka (MEETING)
- 🟢 Zelená = Telefonát (CALL)
- 🟠 Oranžová = Úkol (TASK)
- 🟣 Fialová = Připomínka (REMINDER)

---

### 3. Navigace v Sidebaru

**Aktualizace:**
- ✅ Přidána položka "Tipaři" s ikonou `UserCheck`
- ✅ Přidána položka "Kalendář" s ikonou `Calendar`

**Pořadí navigace:**
1. Dashboard
2. Leady
3. Případy
4. Tipaři (NOVÉ)
5. Kalendář (NOVÉ)
6. Nastavení

---

### 4. Routing

**Nové routy:**
```typescript
{ path: 'partners', Component: Partners }
{ path: 'calendar', Component: Calendar }
```

---

## 📊 Mock data

### Tipaři (5 vzorových záznamů):
- RE/MAX Prague (Realitka) - 24 leadů
- Development Group s.r.o. (Developer) - 18 leadů
- Martin Černý (Pojišťovák) - 12 leadů
- Finanční Poradna ABC (Finanční poradce) - 8 leadů
- City Reality (Realitka) - 15 leadů

### Události:
- Používá existující mock data z `/lib/mockDashboardData.ts`
- Obsahuje schůzky, telefonáty, úkoly a připomínky

---

## 🎨 Design

### Tipaři:
- Tmavý design podle vzoru z obrázku
- Tabulka s responzivním layoutem
- Vyhledávací pole s ikonou lupy
- Dropdown filtr pro typ tipaře
- Akční menu (tři tečky) pro každý řádek
- Tlačítko "+ Nový tipař" vpravo nahoře

### Kalendář:
- Měsíční zobrazení (7 sloupců x 6 řádků)
- Dny jiných měsíců zobrazeny šedě
- Dnešní den označen modrým kruhem
- Události jako malé barevné boxy s ikonami
- Modal pro vytvoření události s responzivním formulářem
- Tlačítka pro typ události (4 tlačítka v grid 2x2)

---

## 🚀 Budoucí vylepšení

### Tipaři:
- [ ] Stránka detailu tipaře (`/partner/:id`)
- [ ] Formulář pro vytvoření nového tipaře (`/new-partner`)
- [ ] Formulář pro úpravu tipaře (`/partner/:id/edit`)
- [ ] Automatické počítání leadů z vazby na Lead.zdroj
- [ ] Statistiky pro každého tipaře (konverzní poměr, průměrná kvalita leadů)
- [ ] Export do CSV/Excel

### Kalendář:
- [ ] Týdenní zobrazení (implementace view === 'week')
- [ ] Denní zobrazení (implementace view === 'day')
- [ ] Detail události po kliknutí
- [ ] Úprava a smazání události
- [ ] Označení události jako splněné
- [ ] Drag & drop událostí mezi dny
- [ ] Integrace s Google Calendar / Outlook
- [ ] Notifikace před událostí
- [ ] Opakující se události
- [ ] Sdílení události s klientem

---

## 🔗 Integrace s existujícími funkcemi

### Tipaři → Leady:
- V budoucnu lze v Leadu přidat pole `tipařId` pro propojení
- Automatické přičítání k `Partner.pocetLeadu`
- Filtrování leadů podle tipaře

### Kalendář → Leady a Případy:
- Události už mají pole `klientId` a `klientTyp`
- Lze propojit událost s konkrétním leadem nebo případem
- Automatické vytvoření události při důležitých akcích (např. schůzka po převedení leadu na případ)

---

## 📝 Poznámky

- Obě sekce mají plnou podporu dark mode
- Data se ukládají do localStorage
- Responzivní design pro různá rozlišení
- Konzistentní s designem zbytku aplikace
- Použity existující UI komponenty z `/components/ui/`

---

## 🧪 Testování

### Tipaři:
1. Otevřít `/partners`
2. Zkontrolovat zobrazení tabulky s mock daty
3. Vyzkoušet vyhledávání
4. Vyzkoušet filtrování podle typu
5. Kliknout na "Smazat" - potvrzovací dialog
6. Ověřit dark mode

### Kalendář:
1. Otevřít `/calendar`
2. Zkontrolovat měsíční zobrazení
3. Kliknout na den → otevře se modal
4. Vyplnit formulář a vytvořit událost
5. Ověřit, že událost se zobrazí v kalendáři
6. Navigovat mezi měsíci
7. Kliknout "Dnes"
8. Ověřit dark mode

---

**Poznámka:** Stránky `/new-partner`, `/partner/:id`, `/partner/:id/edit` a detail události ještě nejsou implementovány - připraveny pro budoucí rozšíření.
