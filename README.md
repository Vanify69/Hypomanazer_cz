# Hypo – zprostředkovatel hypoték

## Vývoj

**Spuštění frontendu i API najednou (doporučeno):**
```bash
npm run dev:all
```
Spustí backend na portu 4000 a Vite na portu 3000. V terminálu uvidíte výstupy obou (označené `api` a `vite`).

**Samostatně:**
- Pouze frontend: `npm run dev` (port 3000). API musí běžet zvlášť, jinak v terminálu uvidíte chyby proxy (ECONNREFUSED).
- Pouze API: `npm run dev:server` (port 4000; běží z adresáře `server`).

Po prvním klonu nebo po změně závislostí v `server/` spusťte v `server/`: `npm install` a případně `npx prisma generate`.

---

## Nasazení na Railway (API)

Aby API běželo na Railway a reagovalo na doménu (např. hypomanazer.cz):

1. **Root Directory**  
   V nastavení služby nastavte **Root Directory** na `server` (ne kořen repozitáře). Railway tak bude buildovat a spouštět backend z `server/`.

2. **Build**  
   Není potřeba měnit – Railway použije `npm install` a `npm run build` z `server/package.json`.

3. **Start**  
   Použije se `npm run start` (v `server/` už obsahuje `prisma generate`, `prisma db push` a spuštění serveru).

4. **Proměnné prostředí (Variables)**  
   U služby API nastavte alespoň:
   - `DATABASE_URL` – connection string z Railway Postgres (Variables u Postgres služby, např. `DATABASE_URL` nebo „Add Variable Reference“).
   - `JWT_SECRET` – náhodný dlouhý řetězec (min. 32 znaků).  
   `PORT` Railway nastaví sám.

5. **Port**  
   V **Settings → Public Networking** ponechejte výchozí chování (Railway předá `PORT` aplikaci). API naslouchá na `process.env.PORT` (výchozí 4000) a na `0.0.0.0`, takže proxy se k němu připojí.

6. **Kontrola**  
   Po deployi otevřete `https://vaše-doména/api/health` – měl by vrátit JSON `{"ok":true,"service":"hypomanager-api",...}`.

**Frontend:** Aplikace má API v `server/` a React frontend v kořeni repozitáře. Kód frontendu už v projektu je – nic dalšího se neinstaluje. Pro plnou „online“ aplikaci je potřeba frontend **nasadit** (viz níže).

---

## Nasazení na Railway (React frontend)

Aby React aplikace (přihlášení, leady, případy) běžela na Railway (např. na subdoméně app.hypomanazer.cz):

1. **Nová služba**  
   V Railway projektu přidejte další službu („+ New“ → např. „GitHub Repo“ a vyberte stejný repozitář).

2. **Root Directory**  
   Nechte **prázdné** (nebo `.`) – build i start se spouštějí z **kořene** repozitáře (kde je `package.json` s Vite a `build`/`start`).

3. **Build**  
   Railway použije `npm install` a `npm run build` z kořene. Výstup je ve složce `build/`.

4. **Start**  
   Použije se `npm run start` – servíruje obsah `build/` přes `serve` na `PORT` (Railway ho nastaví sám).

5. **Proměnná VITE_API_URL (důležité)**  
   Frontend volá API podle `VITE_API_URL`. Tato proměnná se **zapisuje do buildu při `npm run build`**, takže ji musíte nastavit u této služby v **Variables** před buildem.  
   - Název: `VITE_API_URL`  
   - Hodnota: plná URL API, např. `https://hypomanazercz-production.up.railway.app` nebo později `https://api.hypomanazer.cz`.  
   Bez ní by production build volal `http://localhost:4000` a přihlášení by nefungovalo.

6. **Port**  
   V **Settings → Public Networking** ponechejte výchozí chování (aplikace naslouchá na `PORT`).

7. **Doména**  
   Pro app subdoménu přidejte v této službě **Custom Domain** např. `app.hypomanazer.cz` a u poskytovatele DNS nastavte CNAME `app` na adresu, kterou Railway ukáže.

**Shrnutí:** Druhá služba = kořen repo, build + start z kořene, **VITE_API_URL** = URL vašeho API. Po deployi otevřete URL služby – uvidíte přihlašovací stránku Hypo aplikace.

---

## Plán: doména hypomanazer.cz a prezentace (do budoucna)

Cílová struktura:

| Adresa | Účel |
|--------|------|
| **hypomanazer.cz** / **www.hypomanazer.cz** | Prezentační / marketingový web o produktu. Odtud bude směřovat marketing a CTA („Přihlásit se“, „Vstoupit do systému“). |
| **app.hypomanazer.cz** | React aplikace HypoManažer – přihlášení, dashboard, leady, případy. API může zůstat na Railway nebo být na **api.hypomanazer.cz**. |

**Chování pro uživatele:**

- **Nepřihlášený:** Na hypomanazer.cz vidí prezentaci. Odkaz „Přihlásit se“ vede na app.hypomanazer.cz (přihlašovací stránka).
- **Přihlášený:** Při návštěvě hypomanazer.cz lze detekovat platné přihlášení a **přesměrovat rovnou do systému** (app.hypomanazer.cz / dashboard), aby se dostal do aplikace bez zbytečného kroku.

**Technicky:** Prezentace = statický web nebo jednoduchý CMS na hlavní doméně. React app = nasazení na app subdoménu, volání stávajícího API, JWT přihlášení; po přihlášení redirect na dashboard. Detekce „už přihlášen“ při načtení hlavní domény (cookie/JWT) a redirect na app subdoménu.

React frontend je už v kořeni repo – až budete chtít app.hypomanazer.cz v provozu, stačí ho **nasadit** (build + hostování na této subdoméně), ne doinstalovávat.
