# HypoManažer – přehled funkcionality

Tento dokument popisuje API, frontend a konfiguraci projektu pro lokální vývoj i nasazení na web (Railway).

---

## 1. Backend API (server/)

API běží na portu 4000 (lokálně) nebo na `PORT` z prostředí (Railway). Všechny endpointy pod `/api/...`.

### 1.1 Auth – `/api/auth`

| Metoda | Endpoint | Auth | Popis |
|--------|----------|------|--------|
| POST | `/api/auth/register` | ne | Registrace – e-mail, heslo, jméno. Vrací uživatele + JWT. |
| POST | `/api/auth/login` | ne | Přihlášení – e-mail, heslo. Vrací uživatele + JWT. |
| GET | `/api/auth/me` | ano | Aktuální přihlášený uživatel (ověření tokenu). |

Použití: přihlášení do aplikace, ochrana ostatních route přes middleware `requireAuth`.

### 1.2 Případy (Cases) – `/api/cases`

| Metoda | Endpoint | Auth | Popis |
|--------|----------|------|--------|
| GET | `/api/cases` | ano | Seznam případů (filtr, řazení). |
| GET | `/api/cases/:id` | ano | Detail případu. |
| GET | `/api/cases/active/current` | ano | Aktuálně aktivní případ (pro práci v aplikaci). |
| GET | `/api/cases/active/current/fill-model` | ano | Model pro vyplnění formuláře z aktivního případu. |
| POST | `/api/cases` | ano | Vytvoření nového případu (základní údaje). |
| POST | `/api/cases/from-files` | ano | Vytvoření případu z nahraných souborů (multipart). Automatická detekce typu dokumentu nebo předání typů. |
| PATCH | `/api/cases/:id` | ano | Aktualizace případu. |
| PATCH | `/api/cases/:id/status` | ano | Změna stavu případu. |
| DELETE | `/api/cases/:id` | ano | Smazání případu. |
| POST | `/api/cases/:id/active` | ano | Nastavení případu jako aktivního. |
| POST | `/api/cases/:id/files` | ano | Nahrání souborů do případu (OP, výpisy, DP atd.). |
| DELETE | `/api/cases/:id/files/:fileId` | ano | Smazání souboru z případu. |
| POST | `/api/cases/:id/dp/parse-raw` | ano | Zpracování daňového přiznání (surový text). |
| POST | `/api/cases/:id/dp/reparse` | ano | Přeparsování DP. |
| POST | `/api/cases/:id/dp/ares-enrich` | ano | Obohacení DP z ARES (IČO). |
| POST | `/api/cases/:id/op/reparse` | ano | Přeparsování OP (občanský průkaz). |
| POST | `/api/cases/:id/vypisy/reparse` | ano | Přeparsování výpisů z účtu. |

Použití: správa hypotéčních případů, nahrávání dokumentů, OCR/LLM extrakce (OP, výpisy, daňové přiznání).

### 1.3 Leady – `/api/leads`

Všechny endpointy vyžadují přihlášení.

| Metoda | Endpoint | Popis |
|--------|----------|--------|
| GET | `/api/leads` | Seznam leadů (filtr: status, loanType, source, q, deleted). |
| GET | `/api/leads/:id` | Detail leadu včetně upload slotů. |
| POST | `/api/leads` | Vytvoření leadu (OWN nebo REFERRER s referrerId). Vrací intake link a expiresAt. |
| PATCH | `/api/leads/:id` | Aktualizace leadu. |
| POST | `/api/leads/:id/create-intake` | Vytvoření intake session a odkazu (pro leady od tipaře bez odkazu). |
| POST | `/api/leads/:id/send-link` | Odeslání intake odkazu (SMS a/nebo e-mail). Body: `{ channels: ['sms','email'] }`. |
| POST | `/api/leads/:id/regenerate-link` | Regenerace intake odkazu. |
| POST | `/api/leads/:id/expire` | Zneplatnění intake odkazu. |
| POST | `/api/leads/:id/delete` | Přesun do koše (soft delete). |
| POST | `/api/leads/:id/restore` | Obnovení z koše. |
| DELETE | `/api/leads/:id` | Trvalé smazání (pouze z koše). |

Použití: CRM leadů, intake odkazy pro klienty, odesílání linků (Twilio/Resend), konverze na případ.

### 1.4 Intake (veřejné) – `/api/intake`

Bez přihlášení. Slouží pro klienty, kteří vyplňují podklady přes odkaz z e-mailu/SMS.

| Metoda | Endpoint | Popis |
|--------|----------|--------|
| GET | `/api/intake/:token` | Data pro intake stránku (sloty, stav). Kontrola platnosti a expirace. |
| POST | `/api/intake/:token/progress` | Uložení průběhu (incomeType, coapplicant, IČO) a aktualizace slotů. |
| POST | `/api/intake/:token/upload` | Nahrání souboru do slotu (multipart). |
| DELETE | `/api/intake/:token/slots/:slotId` | Smazání nahraného souboru ve slotu. |
| POST | `/api/intake/:token/submit` | Odeslání podkladů – validace, konverze na případ (sync nebo přes frontu). |

Použití: veřejný formulář pro klienta (dokumenty k hypotéce), konverze lead → případ.

### 1.5 Tipaři (Referrers) – `/api/referrers`

Všechny endpointy vyžadují přihlášení.

| Metoda | Endpoint | Popis |
|--------|----------|--------|
| GET | `/api/referrers` | Seznam tipařů (filtr: q, type). |
| GET | `/api/referrers/:id` | Detail tipaře. |
| GET | `/api/referrers/:id/leads` | Leady přiřazené tipaři. |
| POST | `/api/referrers` | Vytvoření tipaře. Vrací referrer link a expiresAt. |
| PATCH | `/api/referrers/:id` | Aktualizace tipaře. |
| POST | `/api/referrers/:id/regenerate-link` | Regenerace referrer odkazu. |
| POST | `/api/referrers/:id/send-link` | Odeslání referrer odkazu (SMS/e-mail). Body: `{ channels: ['sms','email'] }`. |

Použití: správa tipařů, referrer linky pro přidávání leadů, notifikace.

### 1.6 Ref (veřejné) – `/api/ref`

Bez přihlášení. Formuláře pro tipaře (přidání leadu, přehled leadů).

| Metoda | Endpoint | Popis |
|--------|----------|--------|
| GET | `/api/ref/:token` | Ověření tokenu a základní info (displayName) pro formulář. |
| POST | `/api/ref/:token/leads` | Tipař vytvoří lead (jméno, kontakt, loanType, souhlas). |
| GET | `/api/ref/:token/leads` | Seznam leadů tipaře (anonymizovaný, stavy). |

Použití: veřejné stránky pro tipaře – přidání klienta a přehled stavů.

### 1.7 Browser extension – `/api/integrations/browser-extension`

| Metoda | Endpoint | Auth | Popis |
|--------|----------|------|--------|
| POST | `/pairing/start` | ano | Zahájení párování rozšíření s účtem. Vrací `userCode`, `expiresAt`. |
| POST | `/pairing/confirm` | ne | Výměna kódu za tokeny. Body: `userCode`, `installationId`, volitelně `device`. Vrací `refreshToken`, `accessToken`, `accessTokenExpiresAt`, `scopes`. |
| POST | `/token/refresh` | ne | Obnovení access tokenu. Body: `refreshToken`. Vrací `accessToken`, `accessTokenExpiresAt`. |
| GET | `/mappings` | ano | Mapping pack pro URL. Query: `hostname`, `pathname`. Vrací JSON pack (bankId, steps). |
| POST | `/mappings` | ano | Uložení mapování. Body: `bankId`, `match.hostnames`, `match.pathIncludes`, steps atd. |

Použití: integrace pro prohlížečové rozšíření (vyplňování bankovních formulářů z aktivního případu). Detailní specifikace: [browser_extension/browser_extension.md](../browser_extension/browser_extension.md).

#### Spolupráce rozšíření a aplikace

1. **Pairing (spárování)**  
   - Uživatel je přihlášen v HypoManažeru (webová aplikace). V **Nastavení** klikne na „Vygenerovat kód“.  
   - Aplikace zavolá **POST** `/api/integrations/browser-extension/pairing/start` (s JWT v hlavičce) a zobrazí krátký kód (např. `ABCD-EFGH`) a čas vypršení (cca 5 min).  
   - Uživatel otevře **rozšíření** v prohlížeči, vloží kód a potvrdí spárování.  
   - Rozšíření (service worker) zavolá **POST** `/api/integrations/browser-extension/pairing/confirm` s `userCode` a `installationId` (bez auth). Server ověří kód, označí ho jako použitý a vrátí `refreshToken` a `accessToken`.  
   - Rozšíření uloží `refreshToken` do `chrome.storage.local` a access token do paměti / `chrome.storage.session`. Aplikace JWT z webu nečte – rozšíření má vlastní tokeny.

2. **Obnovení tokenu**  
   - Access token má krátkou platnost (cca 15 min). Když vyprší, rozšíření zavolá **POST** `/api/integrations/browser-extension/token/refresh` s `refreshToken`. Server ověří device a vrátí nový `accessToken` a `accessTokenExpiresAt`.

3. **Aktivní případ a vyplnění**  
   - Rozšíření potřebuje data pro vyplnění formuláře. Zavolá **GET** `/api/cases/active/current/fill-model` s hlavičkou `Authorization: Bearer <accessToken>`. API vrací FillModel (normalizovaná data z aktivního případu).  
   - Na stránce banky rozšíření zjistí hostname a pathname, zavolá **GET** `/api/integrations/browser-extension/mappings?hostname=...&pathname=...` (s access tokenem) a dostane mapping pack (jak mapovat pole FillModelu na selektory na stránce).  
   - Content script pak podle packu vyplní pole (FILL_ALL / FILL_SECTION / FILL_FIELD zprávy z popupu do service workera).

4. **Ukládání mapování**  
   - Uživatel může v rozšíření (nebo v budoucnu v HM) uložit mapping pro danou stránku. Rozšíření nebo aplikace zavolá **POST** `/api/integrations/browser-extension/mappings` (s JWT nebo access tokenem) s tělem obsahujícím `bankId`, `match.hostnames`, `match.pathIncludes` a definici kroků.

**Shrnutí:** Aplikace (Settings) pouze vydává pairing kód; veškerá další komunikace s API (confirm, refresh, fill-model, mappings) probíhá z rozšíření (service worker) pomocí refresh/access tokenů. JWT z webové aplikace rozšíření nepoužívá.

### 1.8 Ostatní

| Metoda | Endpoint | Popis |
|--------|----------|--------|
| GET | `/api/health` | Stav služby. Vrací `{ ok, service, llmAvailable }`. Pro kontrolu deploye. |
| – | `/uploads/*` | Statické soubory nahraných dokumentů (volitelně). |

---

## 2. Frontend (src/)

React aplikace (Vite), port 3000 v dev. Komunikace s API přes `src/lib/api.ts` (v dev proxy na `http://127.0.0.1:4000`).

### 2.1 Stránky a cesty

| Cesta | Komponenta | Popis |
|-------|------------|--------|
| `/login` | Login | Přihlášení (e-mail, heslo). |
| `/intake/:token` | Intake | Veřejný intake formulář pro klienta (upload dokumentů, odeslání). |
| `/ref/:token` | RefForm | Veřejný formulář pro tipaře – přidání leadu. |
| `/ref/:token/leads` | RefLeads | Přehled leadů tipaře (veřejný). |
| `/` | Root (layout) | Chráněná oblast – dashboard. |
| `/` | Dashboard | Přehled případů (aktivní, seznam). |
| `/case/:id` | CaseDetail | Detail případu, nahrávání souborů, extrakce. |
| `/new-case` | NewCase | Nový případ (ručně nebo z souborů). |
| `/leads` | Leads | Seznam leadů. |
| `/leads/new` | LeadsNew | Nový lead. |
| `/leads/:id/edit` | LeadsEdit | Editace leadu. |
| `/referrers` | Referrers | Seznam tipařů. |
| `/referrers/new` | ReferrersNew | Nový tipař. |
| `/referrers/:id/edit` | ReferrersEdit | Editace tipaře. |
| `/referrers/:id/leads` | ReferrerLeads | Leady tipaře (v aplikaci). |
| `/settings` | Settings | Nastavení. |

Chráněné cesty vyžadují přihlášení (AuthContext, token v localStorage). Veřejné: `/login`, `/intake/:token`, `/ref/:token`, `/ref/:token/leads`.

### 2.2 Hlavní flow

- **Přihlášení** → token se ukládá, volání `/api/auth/me` pro ověření.
- **Leady** → vytvoření leadu → (volitelně) odeslání intake linku → klient otevře intake → nahrání dokumentů → submit → konverze na případ.
- **Tipaři** → vytvoření tipaře → odeslání referrer linku → tipař přidá lead přes `/ref/:token` → lead se zobrazí v aplikaci a u tipaře na `/ref/:token/leads`.
- **Případy** → vytvoření (ručně nebo z souborů) → nahrání OP, výpisů, DP → extrakce (OCR/LLM) → úpravy a odeslání do banky.

---

## 3. Proměnné prostředí

Použití v celém monorepu (backend v `server/`, frontend v kořeni).

### 3.1 Server (server/)

| Proměnná | Povinné | Popis |
|----------|---------|--------|
| `DATABASE_URL` | ano | Connection string k DB. Lokálně: `file:./dev.db` (SQLite). Produkce: PostgreSQL (Railway). |
| `JWT_SECRET` | ano | Tajemství pro JWT (min. 32 znaků). V produkci vždy nastavit. |
| `PORT` | ne | Port serveru (výchozí 4000). Railway nastaví sám. |
| `HOST` | ne | Bind adresa (výchozí `0.0.0.0` pro Railway). |
| `JWT_EXPIRES_IN` | ne | Platnost JWT (výchozí `7d`). |
| `UPLOAD_DIR` | ne | Složka pro uploady (výchozí `./uploads` v server/). |
| `FRONTEND_URL` / `APP_URL` | doporučeno | URL frontendu pro generování odkazů (intake, tipař). Výchozí `http://localhost:3000`. |
| `REDIS_URL` | ne | Redis pro frontu úkolů (worker). Bez ní API používá synchronní fallback. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | pro SMS | Odesílání SMS (intake/tipař linky). |
| `RESEND_API_KEY`, `RESEND_FROM` | pro e-mail | Odesílání e-mailů (Resend). |
| `OPENAI_API_KEY` | ne | LLM extrakce z dokumentů. Bez ní jen regex/OCR. |
| `OPENAI_MODEL`, `OPENAI_API_BASE_URL` | ne | Model a base URL pro OpenAI. |
| `DOCTLY_API_KEY` | ne | Doctly API pro extrakci dokumentů (volitelné). |

Všechny tyto proměnné se nastavují v Railway u služby **API** (Root Directory = `server`). JWT konfigurace (`JWT_SECRET`, `JWT_EXPIRES_IN`) se čte centrálně v `server/src/lib/env.ts`.

### 3.2 Frontend

V produkci **není potřeba** žádná proměnná prostředí pro build – URL API je v kódu v `src/lib/api.ts` (v dev prázdné = proxy).  
Změna API URL: upravit `API_BASE` v `src/lib/api.ts` a znovu nasadit frontend (viz README – sekce „Změna URL API“).

---

## 4. Lokálně vs produkce (Railway)

| | Lokálně | Produkce (Railway) |
|--|--------|---------------------|
| **API** | `npm run dev:server` v `server/`, port 4000. | Služba s Root Directory = `server`, build + start. DB = Postgres. |
| **Frontend** | `npm run dev` v kořeni, port 3000, proxy `/api` → 4000. | Samostatná služba z kořene, Dockerfile build, `serve -s build`. |
| **DB** | SQLite `file:./dev.db` v `server/`. | PostgreSQL, `DATABASE_URL` z Railway Variables. |
| **API URL pro frontend** | Prázdné (proxy). | Hardcoded v `src/lib/api.ts` na URL Railway API. |
| **Kontrola** | `http://localhost:3000` (app), `http://localhost:4000/api/health` (API). | `https://<frontend-doména>`, `https://<api-doména>/api/health`. |

Spuštění všeho najednou lokálně: `npm run dev:all` (backend + frontend).

---

## 5. Testy

- **Backend** (`server/`): `npm run test` – Node.js vestavěný test runner (`node:test`). Soubory: `server/src/lib/tokens.test.ts`, `referrerStatus.test.ts`, `intakeValidation.test.ts`. Při buildu serveru se testy spouštějí automaticky (`npm run build` = test + tsc).
- **Frontend** (kořen): `npm run test` – Vitest. Testy v `src/**/*.test.{ts,tsx}` (např. `src/lib/api.test.ts`). Prostředí jsdom, mockování `fetch` a `localStorage`. V CI se spouští před buildem frontendu. **Spolupráce s rozšířením:** v `api.test.ts` je blok „browser extension – pairing“, který testuje kontrakt mezi aplikací (Nastavení) a API: volání `POST .../pairing/start` s JWT a očekávaná odpověď `userCode`, `expiresAt`.
