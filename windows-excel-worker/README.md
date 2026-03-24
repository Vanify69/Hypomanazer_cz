# Windows Excel COM worker

Služba pro **přepočet bankovních .xlsm/.xlsx** přes nainstalovaný **Microsoft Excel** (stejné chování jako na desktopu, včetně maker).

## Požadavky

- Windows 10/11
- Node.js 18+
- Microsoft Excel (desktopová aplikace)
- Balíček `winax` (instaluje se přes `npm install` v tomto adresáři)

## Spuštění

```bash
cd windows-excel-worker
npm install
npm start
```

Výchozí port **4799**. Jiný port: `set EXCEL_WORKER_PORT=4800` (PowerShell: `$env:EXCEL_WORKER_PORT=4800`).

## Napojení HypoManager API

Na serveru (Railway / lokální API) nastavte proměnnou:

```text
EXCEL_WORKER_URL=http://VAŠE_IP_LOKÁLNÍ_PC:4799
```

API musí z této sítě worker vidět (VPN, SSH tunel, nebo dočasně ngrok). Railway v cloudu nevidí váš PC bez tunelu.

## Endpointy

- `GET /health` – kontrola běhu
- `POST /run` – tělo JSON: `fileBase64`, `mapping` (BankMappingConfig), `inputValues` (předpočítané hodnoty ze serveru)

## Bezpečnost

Worker nemá autentizaci. Pouštějte jen v důvěryhodné síti nebo přidejte reverse proxy s tokenem.
