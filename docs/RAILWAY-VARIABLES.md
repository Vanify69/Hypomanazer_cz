# Proměnné prostředí pro Railway

Pokud ve službě **Hypomanazer_cz** (API) zmizely Variables, nastavte je znovu v Railway: **Projekt → Hypomanazer_cz → Variables** (záložka Variables).

---

## Služba: Hypomanazer_cz (API, Root Directory = `server`)

Následující proměnné přidejte jednu po druhé (Add Variable). Hodnoty vyplňte podle vašeho prostředí.

### Povinné

| Název | Popis | Příklad / poznámka |
|------|--------|---------------------|
| `DATABASE_URL` | Connection string k PostgreSQL | Z Railway: u služby **Postgres** zkopírujte `DATABASE_URL` (nebo použijte „Variable Reference“ a vyberte Postgres → `DATABASE_URL`). |
| `JWT_SECRET` | Tajemství pro JWT (min. 32 znaků) | Např. náhodný řetězec 32+ znaků. Bez této proměnné se v logu objeví varování a auth nebude bezpečný. |
| `NODE_ENV` | Režim (production = varování jen jednou) | Nastavte na `production`. |

### Doporučené

| Název | Popis | Příklad |
|------|--------|---------|
| `FRONTEND_URL` nebo `APP_URL` | URL React aplikace (pro generování odkazů intake/tipař) | `https://vase-frontend-doména.up.railway.app` nebo např. `https://app.hypomanazer.cz` |
| `JWT_EXPIRES_IN` | Platnost JWT | `7d` (výchozí) |

### Volitelné (server)

| Název | Popis |
|------|--------|
| `PORT` | Railway ho většinou nastaví sám. |
| `HOST` | Výchozí `0.0.0.0` – neměňte. |
| `UPLOAD_DIR` | Složka pro uploady (výchozí `./uploads`). |

### Volitelné (Redis, SMS, e-mail, LLM)

| Název | Popis |
|------|--------|
| `REDIS_URL` | Redis pro frontu úkolů (worker). Bez ní API běží se synchronním fallbackem. |
| `TWILIO_ACCOUNT_SID` | Twilio – odesílání SMS. |
| `TWILIO_AUTH_TOKEN` | Twilio. |
| `TWILIO_FROM` | Číslo odesílatele (např. +420…). |
| `RESEND_API_KEY` | Resend – odesílání e-mailů. |
| `RESEND_FROM` | E-mail odesílatele. |
| `OPENAI_API_KEY` | LLM extrakce z dokumentů. Bez ní jen regex/OCR. |
| `OPENAI_MODEL` | Např. `gpt-4o-mini`. |
| `OPENAI_API_BASE_URL` | Výchozí `https://api.openai.com/v1`. |
| `DOCTLY_API_KEY` | Doctly API (volitelné). |

### Potlačení logů (volitelné)

| Název | Hodnota | Popis |
|------|--------|--------|
| `PRISMA_HIDE_UPDATE_MESSAGE` | `1` | Potlačí Prisma banner (start skript to nastavuje). Projekt používá Prisma 7. |

**Varování „npm warn config production“:** Vzniká při buildu, pokud Railway používá `npm install --production`. V **Settings → Build** lze Build Command změnit na: `npm ci --omit=dev && npm run build` – tím se použije novější přepínač a varování zmizí.

---

## Minimální sada pro běh API

Pro to, aby API běželo a přestala se opakovat hláška o JWT_SECRET, stačí nastavit:

1. **DATABASE_URL** – z Railway Postgres (Variables u Postgres → `DATABASE_URL`).
2. **JWT_SECRET** – vlastní náhodný řetězec alespoň 32 znaků.
3. **NODE_ENV** – `production`.

Ostatní proměnné doplňte podle potřeby (odkazy na frontend, SMS, e-mail, Redis, OpenAI).

---

## Jak přidat proměnné v Railway

1. Otevřete projekt na [railway.app](https://railway.app).
2. Klikněte na službu **Hypomanazer_cz** (API).
3. Záložka **Variables**.
4. **Add Variable** (nebo **Raw Editor** pro hromadné vložení).
5. Pro `DATABASE_URL` můžete použít **Add Variable Reference** a vybrat službu Postgres a proměnnou `DATABASE_URL`.
