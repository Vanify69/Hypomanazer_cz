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
