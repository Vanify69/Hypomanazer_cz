# HypoManažer (Hypo – zprostředkovatel hypoték)

Aplikace pro zprostředkovatele hypotéčních úvěrů (design z [Figma](https://www.figma.com/design/Gkt2XProj7yg2zJmkY73Dm/)).  
**Backend + DB** (SQLite/PostgreSQL), **přihlášení**, **případy a soubory** ukládané na serveru. Výstup je **PWA** – instalace na Windows, Mac i Android.

## Rychlé spuštění (vývoj)

**1. Backend (API + databáze)**

```bash
cd server
npm install
cp .env.example .env
# Vyplňte .env (minimálně DATABASE_URL, JWT_SECRET)
npx prisma db push
npm run dev
```

API běží na [http://localhost:4000](http://localhost:4000).

**2. Worker (volitelně – asynchronní úkoly)**

Pro asynchronní odesílání intake/tipařských odkazů (SMS/e-mail), konverzi leadů na případy a notifikace tipařů spusťte worker (vyžaduje Redis):

```bash
cd server
# V .env nastavte REDIS_URL (např. redis://localhost:6379)
npm run dev:worker
```

Bez Redisu API funguje s synchronním fallbackem (odeslání a konverze proběhnou v požadavku).

**3. Frontend**

V kořenu projektu:

```bash
npm install
npm run dev
```

Frontend běží na [http://localhost:3000](http://localhost:3000). Při prvním otevření se zobrazí **přihlášení** – můžete se **zaregistrovat** (e-mail + heslo) a pak pracovat s případy, leady a tipaři. Data se ukládají do databáze v `server/`.

## Build a PWA

```bash
npm run build
```

Vytvoří složku `build/` s připravenou PWA.

- **Lokální test PWA:**  
  `npx serve build` a v prohlížeči otevřete zobrazenou adresu (např. http://localhost:3000). V Chrome/Edge: menu → „Nainstalovat aplikaci“ / „Install app“.

- **Instalace:**
  - **Windows:** Chrome/Edge → menu → „Nainstalovat Hypotéční aplikaci…“
  - **Mac:** Safari/Chrome → Soubor → „Přidat na plochu“ nebo ikona sdílení → „Přidat na plochu“
  - **Android:** Chrome → menu → „Přidat na plochu“ / „Install app“

Po instalaci se aplikace chová jako samostatná okenní aplikace (bez adresního řádku).

## Ikony PWA

V `public/` je `icon.svg`. Pro lepší vzhled na všech zařízeních doplňte do `public/` soubory:

- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)

(např. vyexportované z Figmy nebo vygenerované z `icon.svg`).

## Technologie

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, Prisma (SQLite ve vývoji, lze přepnout na PostgreSQL)
- **Auth:** JWT (registrace, přihlášení)
- **Dodání:** PWA – jeden build, instalace na desktop i mobil

## Server (API)

- `server/` – samostatný Node.js projekt
- **Příkazy:** `npm run dev` (API), `npm run dev:worker` (worker), `npm run build`, `npm test` (unit testy), `npx prisma studio` (prohlížení DB)
- **Proměnné prostředí** – viz `server/.env.example`:
  - **Povinné:** `DATABASE_URL`, `JWT_SECRET`
  - **Volitelné:** `PORT`, `UPLOAD_DIR`, `JWT_EXPIRES_IN`
  - **Redis (pro worker):** `REDIS_URL` – např. `redis://localhost:6379`
  - **SMS (Twilio):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
  - **E-mail (Resend):** `RESEND_API_KEY`, `RESEND_FROM`
  - **AI/LLM:** `OPENAI_API_KEY`, `DOCTLY_API_KEY` (volitelné)
- Na veřejné cesty `/api/intake` a `/api/ref` je aplikován **rate limiting** (80 požadavků / 15 min na IP).

### Fáze 2 – Extrakce z dokumentů

- **OCR:** Po nahrání obrázku OP (přední/zadní strana) server pomocí Tesseract.js rozpozná text a z něj vytáhne jméno, příjmení, rodné číslo a adresu. Data se uloží do případu.
- **Nový případ ze souborů:** Na stránce „Nový případ“ lze vybrat více souborů najednou, u každého zvolit typ (OP přední/zadní, daňové přiznání, výpisy). Po nahrání se vytvoří případ, soubory se uloží a z obrázků OP se automaticky vyplní vytažená data.
- **Přidání souboru k existujícímu případu:** V detailu případu lze tlačítky „Přidat soubor“ nahrát další dokumenty; u OP obrázků se znovu spustí extrakce a data se doplní.

## Řešení problémů (vývoj)

**„Content Security Policy blokuje eval“ / modal „Přidat spolužadatele“ se neotevře**

Aplikace v HTML povoluje `unsafe-eval` kvůli Vite HMR. Pokud se v konzoli stále zobrazuje chyba CSP a modal nejde otevřít, pravděpodobně **nějaké rozšíření prohlížeče** (bezpečnostní, blokování skriptů) přidává vlastní přísnější CSP.

- **Otevřete aplikaci v anonymním okně** (Ctrl+Shift+N v Chrome), kde rozšíření většinou neběží, nebo  
- **Pro localhost vypněte rozšíření**, které mění hlavičky nebo bezpečnostní politiky (např. některá privacy/security rozšíření).
- Po úpravě **tvrdý refresh**: Ctrl+Shift+R.
