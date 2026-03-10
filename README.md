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

**Frontend:** Aplikace má API v `server/` a React frontend v kořeni. Pro plnou „online“ aplikaci je potřeba nasadit i frontend (např. Vite build na jinou službu / static host, nebo servírovat z Expressu – viz dokumentace projektu).
