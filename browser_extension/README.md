# HypoManager Bank Autofill – rozšíření pro prohlížeč

Rozšíření (Chrome/Edge/Opera, Manifest V3) pro bezpečné vyplňování bankovních formulářů z aktivního případu v HypoManageru. Zadání a architektura jsou v [browser_extension.md](./browser_extension.md).

## Sestavení

```bash
cd browser_extension
npm install
npm run build
```

Výstup je ve složce `dist/`.

## Načtení v Chrome

1. Otevři `chrome://extensions/`
2. Zapni **Vývojářský režim**
3. Klikni **Načíst rozbalené**
4. Vyber složku `browser_extension/dist`

## Produkce – URL API

V **produkci** rozšíření nemůže volat `localhost`. Před spárováním nastav adresu API:

1. Pravý klik na ikonu rozšíření → **Možnosti** (nebo chrome://extensions → HypoManager → Podrobnosti → Možnosti rozšíření).
2. Do pole **„URL API HypoManageru“** zadej adresu svého API (např. `https://tvoje-api.up.railway.app` bez koncového lomítka).
3. Nastavení se ukládá automaticky. Pak v popupu zadej kód a klikni **Spárovat**.

Pro vlastní doménu (např. `https://api.hypomanazer.cz`) je potřeba přidat ji do `manifest.json` do `host_permissions` a rozšíření znovu sestavit.

## Spárování s HypoManagerem (reálná data)

1. **Backend:** V adresáři `server` spusť `npx prisma db push` (případně `prisma migrate dev`), aby v DB byly tabulky pro pairing. Spusť API: `npm run dev`.
2. **HypoManager:** Přihlas se do aplikace (localhost:3000), otevři **Nastavení** a v sekci **Rozšíření pro prohlížeč** klikni **Vygenerovat kód**. Zobrazí se kód (např. `ABCD-EFGH`) platný 5 minut.
3. **Rozšíření:** Otevři popup rozšíření, vlož kód do pole a klikni **Spárovat**. Po úspěchu rozšíření načte aktivní případ z HypoManageru.
4. **Aktivní případ:** V HypoManageru u konkrétního případu ho označ jako „Aktivní“. Rozšíření pak načte právě tento případ (žadatelé, úvěr, adresy atd.).

## Testování

- **Popup:** Po spárování zobrazí „Spárováno s HypoManagerem“. „Načíst případ“ načte reálný aktivní případ.
- **Vyplnit formulář (skutečné vyplňování):**
  1. V HypoManageru měj aktivní případ s vyplněnými údaji (jméno, příjmení, RC, adresa, příjmy, výše úvěru).
  2. Otevři v prohlížeči **testovací stránku**: [http://localhost:4000/test-autofill.html](http://localhost:4000/test-autofill.html) (běží spolu s API serverem).
  3. Klikni na ikonu rozšíření a **„Vyplnit vše“**. Pole na stránce se vyplní z aktivního případu; v popupu uvidíš report (Vyplněno / Nenalezeno / Chyby).
- **Jinde:** Na jiných stránkách rozšíření napíše, že pro danou adresu není mapping – pro reálné banky je potřeba přidat mapping pack.
- **Zkratky:** Ctrl+Shift+0 = vyplnit vše, Ctrl+Shift+9 = další žadatel.

## Správa mappingů (admin)

Pro údržbu a tvorbu mapping packů bez ručního psaní selektorů:

1. Otevři **Nastavení rozšíření** (pravý klik na ikonu → Možnosti, nebo chrome://extensions → HypoManager → Podrobnosti → Možnosti rozšíření).
2. Zaškrtni **„Zobrazit nástroje pro správu mappingů (admin)“** a stránku zavři.
3. Otevři v záložce **stránku banky** (nebo jakoukoli stránku s formulářem).
4. Klikni na ikonu rozšíření a v popupu v sekci **„Správa mappingů (admin)“** klikni na **„Procházet DOM na této stránce“**.
5. Rozšíření načte všechna `input`, `textarea` a `select` a zobrazí je s dropdownem **„Mapovat na“** (Jméno, Příjmení, Rodné číslo, Adresa, Příjmy, Výše úvěru atd.).
6. U každého pole vyber, na které údaje z FillModelu se má mapovat (nebo nech „— nemapovat“).
7. Klikni **„Exportovat mapping pack (JSON)“** – do textového pole se vygeneruje JSON v podobě mapping packu. Zkopíruj ho a vlož do `src/content/mappingPacks.ts` (jako nový pack v poli `PACKS`) a doplň `content_scripts.matches` + `host_permissions` v manifestu pro danou doménu.

Sekce „Správa mappingů“ je v popupu vidět jen tehdy, když máš v Nastavení zapnuté „admin“ mapping nástroje.
