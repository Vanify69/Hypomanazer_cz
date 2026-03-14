# HypoManažer – Kalendář, úkoly a Google Calendar integrace

Dokumentace pro implementaci nové agendy kalendáře s úkoly, schůzkami, připomínkami
a synchronizací do Google Calendar (viditelné na všech zařízeních).

---

## Přehled plánovaných funkcí

| Funkce | Stav | Popis |
|--------|------|-------|
| **Kalendář (agenda)** | ✅ Hotovo | Stránka s FullCalendar (měsíc/týden/den), CRUD událostí, drag & drop přesun |
| **Úkoly** | ✅ Hotovo | Přiřazení úkolů k případům/klientům, termíny, dokončování, záložka v detailu případu |
| **Google Calendar sync** | ✅ Hotovo | OAuth2 připojení, obousměrná synchronizace událostí, auto-sync při CRUD |
| **Email notifikace (Resend)** | ✅ Hotovo | Potvrzení vytvoření události + BullMQ delayed připomínky |
| **Dashboard widget** | ✅ Hotovo | Nadcházející události na hlavní stránce |
| **Detail případu — Kalendář** | ✅ Hotovo | Záložka s filtrovanými událostmi a quick-add formulářem |

---

## Současný stav projektu (relevantní části)

### Architektura

- **Frontend:** React 18 + Vite + react-router + Radix UI / shadcn + Tailwind CSS + PWA
- **Backend:** Express 4 + Prisma (SQLite dev / PostgreSQL prod) + BullMQ + Redis
- **Auth:** Vlastní JWT (email/password), middleware `requireAuth`
- **Email:** Resend API (`server/src/lib/email.ts`) — žádný nodemailer/SMTP
- **Deploy:** Railway

### Co už existuje a lze využít

| Položka | Soubor | Využití |
|---------|--------|---------|
| shadcn Calendar widget | `src/components/ui/calendar.tsx` | Date-picker pro formuláře událostí |
| Resend email provider | `server/src/lib/email.ts` | Rozšířit o šablony pro kalendář |
| BullMQ worker | `server/src/worker.ts` | Přidat delayed jobs pro připomínky |
| Auth middleware | `server/src/middleware/auth.ts` | Ochrana nových endpointů |
| Router pattern | `server/src/index.ts` | Registrace nových routes |

### Co NEEXISTUJE a musí se vytvořit

- Žádný kalendářový model v Prisma schema
- Žádné calendar/task API routes
- Žádná Google OAuth integrace
- Žádné Google-related env proměnné
- Žádná frontend stránka pro kalendář
- Žádný task/todo systém

---

## Fáze 1 — Interní kalendář (bez Google)

### 1.1 Prisma model

Přidat do `server/prisma/schema.prisma` i `server/prisma/schema.postgresql.prisma`:

```prisma
model CalendarEvent {
  id              String    @id @default(cuid())
  title           String
  description     String?
  type            String    // "meeting" | "task" | "reminder" | "call"
  startAt         DateTime
  endAt           DateTime?
  allDay          Boolean   @default(false)
  location        String?

  // Vazby na existující entity
  caseId          String?
  case            Case?     @relation(fields: [caseId], references: [id])
  leadId          String?
  lead            Lead?     @relation(fields: [leadId], references: [id])

  // Vlastník a přiřazená osoba
  createdById     String
  createdBy       User      @relation("EventCreator", fields: [createdById], references: [id])
  assignedToId    String?
  assignedTo      User?     @relation("EventAssignee", fields: [assignedToId], references: [id])

  // Google Calendar sync (Fáze 3)
  googleEventId   String?   @unique
  googleCalendarId String?
  lastSyncedAt    DateTime?

  // Připomínka
  reminderMinutes Int?      // např. 15 = upozornění 15 min předem

  // Stav
  status          String    @default("active") // "active" | "completed" | "cancelled"
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

Po přidání modelu spustit `prisma db push`.

### 1.2 Backend — nové soubory

```
server/src/
├── routes/
│   └── calendar.ts              # CRUD endpointy pro události
├── lib/
│   └── calendar.ts              # Business logika (vytváření, filtrování, notifikace)
```

Registrace v `server/src/index.ts`:

```typescript
import { calendarRouter } from "./routes/calendar";
// ...
app.use("/api/calendar", requireAuth, calendarRouter);
```

### 1.3 API endpointy — Kalendář

| Metoda | Endpoint | Účel |
|--------|----------|------|
| GET | `/api/calendar/events` | Seznam událostí (query: `dateFrom`, `dateTo`, `type`, `caseId`, `status`) |
| GET | `/api/calendar/events/:id` | Detail události |
| POST | `/api/calendar/events` | Vytvoření události / úkolu / připomínky |
| PUT | `/api/calendar/events/:id` | Úprava události |
| DELETE | `/api/calendar/events/:id` | Smazání události |
| PATCH | `/api/calendar/events/:id/complete` | Označení úkolu jako splněného |

**Payload pro POST `/api/calendar/events`:**

```json
{
  "title": "Zavolat klientovi Novák",
  "type": "call",
  "startAt": "2026-03-15T10:00:00Z",
  "endAt": "2026-03-15T10:30:00Z",
  "reminderMinutes": 15,
  "caseId": "clxyz...",
  "description": "Probrat podmínky ČSOB"
}
```

**Typy událostí:**

| Typ | Ikona | Popis |
|-----|-------|-------|
| `meeting` | 📅 | Schůzka s klientem, bankou |
| `task` | ✅ | Úkol k vyřízení (má stav completed) |
| `call` | 📞 | Připomínka na telefonát klientovi |
| `reminder` | 🔔 | Obecné upozornění (termín smlouvy, kontrola dokumentů) |

### 1.4 Frontend — nové soubory

```
src/
├── pages/
│   └── Calendar.tsx                # Hlavní stránka kalendáře
├── components/
│   └── calendar/
│       ├── CalendarView.tsx        # Měsíční/týdenní/denní zobrazení (FullCalendar)
│       ├── EventForm.tsx           # Modal pro vytvoření/úpravu události
│       ├── EventDetail.tsx         # Detail události (sidebar nebo modal)
│       └── EventTypeSelector.tsx   # Výběr typu: schůzka/úkol/hovor/připomínka
```

Nová route v `src/routes.ts`:

```typescript
{ path: 'calendar', lazy: () => import('./pages/Calendar') }
```

### 1.5 Nové API funkce v `src/lib/api.ts`

```typescript
// Kalendář
export const getCalendarEvents = (params: {
  dateFrom: string;
  dateTo: string;
  type?: string;
  caseId?: string;
}) =>
  apiRequest(`/api/calendar/events?${new URLSearchParams(params)}`);

export const getCalendarEvent = (id: string) =>
  apiRequest(`/api/calendar/events/${id}`);

export const createCalendarEvent = (data: {
  title: string;
  type: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  caseId?: string;
  leadId?: string;
  assignedToId?: string;
  reminderMinutes?: number;
}) =>
  apiRequest('/api/calendar/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateCalendarEvent = (id: string, data: Record<string, unknown>) =>
  apiRequest(`/api/calendar/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteCalendarEvent = (id: string) =>
  apiRequest(`/api/calendar/events/${id}`, { method: 'DELETE' });

export const completeCalendarEvent = (id: string) =>
  apiRequest(`/api/calendar/events/${id}/complete`, { method: 'PATCH' });
```

### 1.6 NPM závislosti — frontend

```
@fullcalendar/react           # Kalendářové zobrazení (měsíc/týden/den)
@fullcalendar/daygrid         # Měsíční grid
@fullcalendar/timegrid        # Týdenní/denní zobrazení s časovou osou
@fullcalendar/interaction     # Drag & drop, klikání na události
```

Alternativa: `react-big-calendar` (jednodušší, méně funkcí) nebo vlastní implementace.

---

## Fáze 2 — Email notifikace přes Resend

### 2.1 Nové email šablony

Rozšířit `server/src/lib/email.ts` o:

```typescript
export function buildCalendarInviteEmailBody(event: {
  title: string;
  type: string;
  startAt: Date;
  endAt?: Date;
  description?: string;
  calendarUrl: string;
}): string {
  // HTML šablona pro pozvánku / připomínku
}

export function buildTaskAssignedEmailBody(task: {
  title: string;
  dueDate: Date;
  assignedByName: string;
  taskUrl: string;
}): string {
  // HTML šablona pro přiřazení úkolu
}
```

### 2.2 Kdy se emaily odesílají

| Situace | Příjemce | Šablona |
|---------|----------|---------|
| Vytvoření události s `assignedToId` | Přiřazená osoba | calendar_invite |
| Vytvoření úkolu s `assignedToId` | Přiřazená osoba | task_assigned |
| Blížící se připomínka (`reminderMinutes`) | Vlastník události | reminder |

### 2.3 Připomínky — BullMQ delayed jobs

Při vytvoření události s `reminderMinutes` přidat delayed job do BullMQ:

```typescript
// V server/src/lib/calendar.ts
import { emailQueue } from "./queue";

const reminderTime = new Date(event.startAt.getTime() - event.reminderMinutes * 60000);
const delay = reminderTime.getTime() - Date.now();

if (delay > 0) {
  await emailQueue.add('calendar-reminder', {
    eventId: event.id,
    userId: event.createdById,
  }, { delay });
}
```

Worker v `server/src/worker.ts` zpracuje job a odešle email přes Resend.

---

## Fáze 3 — Google Calendar sync

### 3.1 Google Cloud Console — nastavení

1. [Google Cloud Console](https://console.cloud.google.com/) → vytvořit/vybrat projekt
2. Zapnout **Google Calendar API**
3. Vytvořit **OAuth 2.0 Client ID** (typ: Web application)
   - Authorized redirect URIs:
     - Produkce: `https://vase-domena.cz/api/integrations/google/callback`
     - Dev: `http://localhost:4000/api/integrations/google/callback`
4. Požadované scopes:
   - `https://www.googleapis.com/auth/calendar` (čtení + zápis)
   - `https://www.googleapis.com/auth/userinfo.email` (identifikace)

### 3.2 Environment proměnné

Přidat do `server/.env.example` a `server/.env`:

```env
# Google OAuth (pro Calendar sync)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/integrations/google/callback
```

### 3.3 Prisma model — tokeny

```prisma
model GoogleOAuthToken {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  email         String
  accessToken   String
  refreshToken  String
  expiresAt     DateTime
  scopes        String   // JSON array povolených scopes
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 3.4 Backend — nové soubory

```
server/src/
├── routes/
│   └── google-integration.ts    # OAuth flow + Calendar sync endpointy
├── lib/
│   ├── google-auth.ts           # OAuth2 client, token management, refresh
│   └── google-calendar.ts       # Google Calendar API wrapper (CRUD events)
```

Registrace v `server/src/index.ts`:

```typescript
import { googleIntegrationRouter } from "./routes/google-integration";
// ...
app.use("/api/integrations/google", googleIntegrationRouter);
// Callback endpoint je veřejný (bez requireAuth) — viz poznámka níže
```

### 3.5 API endpointy — Google integrace

| Metoda | Endpoint | Auth | Účel |
|--------|----------|------|------|
| GET | `/api/integrations/google/connect` | ano | Vrátí OAuth URL pro přesměrování uživatele |
| GET | `/api/integrations/google/callback` | ne* | OAuth callback — výměna authorization code za tokeny |
| GET | `/api/integrations/google/status` | ano | Stav připojení (connected, email, scopes) |
| DELETE | `/api/integrations/google/disconnect` | ano | Odpojení Google účtu, smazání tokenů |
| POST | `/api/integrations/google/calendar/sync` | ano | Hromadná sync všech událostí → Google Calendar |
| POST | `/api/integrations/google/calendar/sync/:eventId` | ano | Sync jedné události → Google Calendar |

*Callback endpoint je veřejný, ale ověřuje se přes `state` parameter (obsahuje userId + CSRF token).

### 3.6 NPM závislosti — backend

```
googleapis            # Google Calendar API klient
google-auth-library   # OAuth2 token management
```

### 3.7 OAuth flow

```
1. Uživatel klikne "Připojit Google účet" (Settings)
2. Frontend volá GET /api/integrations/google/connect
3. Backend vrátí OAuth URL s parametry (client_id, redirect_uri, scopes, state)
4. Frontend otevře popup s OAuth URL
5. Uživatel se přihlásí do Google a povolí přístup
6. Google přesměruje na callback URL s authorization code
7. Backend vymění code za access_token + refresh_token
8. Tokeny se uloží do GoogleOAuthToken (per user)
9. Popup se zavře, frontend zobrazí "Připojeno" + email
```

### 3.8 Synchronizace událostí

Při CRUD operaci s CalendarEvent na backendu:

```
1. Ověřit, že uživatel má GoogleOAuthToken
2. Pokud ano — refreshnout token pokud expiroval
3. Zavolat Google Calendar API:
   - Vytvoření: calendar.events.insert → uložit googleEventId
   - Úprava: calendar.events.update (podle googleEventId)
   - Smazání: calendar.events.delete (podle googleEventId)
4. Aktualizovat lastSyncedAt
```

### 3.9 Frontend — Google integrace

```
src/
├── components/
│   └── calendar/
│       └── GoogleCalendarSync.tsx  # Tlačítko/karta pro propojení s Google
├── lib/
│   └── google-oauth.ts            # Popup OAuth flow helper
```

Nové API funkce v `src/lib/api.ts`:

```typescript
// Google integrace
export const getGoogleConnectUrl = () =>
  apiRequest('/api/integrations/google/connect');

export const getGoogleStatus = () =>
  apiRequest('/api/integrations/google/status');

export const disconnectGoogle = () =>
  apiRequest('/api/integrations/google/disconnect', { method: 'DELETE' });

export const syncCalendarToGoogle = () =>
  apiRequest('/api/integrations/google/calendar/sync', { method: 'POST' });

export const syncEventToGoogle = (eventId: string) =>
  apiRequest(`/api/integrations/google/calendar/sync/${eventId}`, { method: 'POST' });
```

Komponenta `GoogleCalendarSync` se umístí do **Settings** stránky (nová sekce "Google integrace").

---

## Jak bude sync fungovat na zařízení

1. **Nastavení → Google integrace** → klik "Připojit Google účet"
2. Otevře se Google OAuth popup → uživatel povolí přístup ke kalendáři
3. Backend uloží tokeny do `GoogleOAuthToken`
4. Při vytvoření/úpravě události v HypoManažeru:
   - Backend automaticky zavolá Google Calendar API
   - Událost se objeví v Google Calendar uživatele
   - Na **telefonu, tabletu, PC** — všude kde má uživatel Google Calendar — se událost zobrazí
5. Připomínky (`reminderMinutes`) se nastaví i v Google Calendar → telefon pošle **push notifikaci**

**Sub-kalendář (volitelné):** Backend může vytvořit separátní kalendář "HypoManažer" přes
`calendar.calendars.insert`. Uživatel ho uvidí jako samostatný barevný kalendář v Google Calendar
a může si ho zapnout/vypnout nezávisle na ostatních.

---

## Fáze 4 — Pokročilé funkce

| Funkce | Stav | Popis |
|--------|------|-------|
| Dashboard widget | ✅ Hotovo | Nadcházející události/úkoly na hlavní stránce (`src/components/dashboard/UpcomingEventsWidget.tsx`) |
| Detail případu — tab | ✅ Hotovo | Záložka "Kalendář" v detailu případu — filtrované události pro daný případ (`src/components/cases/CaseCalendarTab.tsx`) |
| Drag & drop | ✅ Hotovo | Přesun událostí přetažením + resize v kalendáři (FullCalendar interaction: `eventDrop`, `eventResize`) |
| Obousměrná sync | ✅ Částečně | Pull z Google Calendar existuje (`pullEventsFromGoogle`), spouští se při hromadné sync |
| Recurring events | ❌ Do budoucna | Opakující se události (každý týden schůzka s klientem) |
| Outlook/iCal sync | ❌ Do budoucna | Export .ics souboru nebo CalDAV integrace pro ne-Google uživatele |

---

## Implementační checklist

### Fáze 1 — Interní kalendář

- [ ] Přidat `CalendarEvent` model do obou Prisma schémat
- [ ] Přidat relace na `Case`, `Lead`, `User` modely
- [ ] Spustit `prisma db push`
- [ ] Vytvořit `server/src/routes/calendar.ts` (CRUD)
- [ ] Vytvořit `server/src/lib/calendar.ts` (business logika)
- [ ] Registrovat router v `server/src/index.ts`
- [ ] Nainstalovat FullCalendar balíčky (frontend)
- [ ] Vytvořit `src/pages/Calendar.tsx`
- [ ] Vytvořit `src/components/calendar/CalendarView.tsx`
- [ ] Vytvořit `src/components/calendar/EventForm.tsx`
- [ ] Vytvořit `src/components/calendar/EventDetail.tsx`
- [ ] Vytvořit `src/components/calendar/EventTypeSelector.tsx`
- [ ] Přidat route `/calendar` do `src/routes.ts`
- [ ] Přidat odkaz do navigace (sidebar/header)
- [ ] Přidat API funkce do `src/lib/api.ts`

### Fáze 2 — Email notifikace

- [x] Rozšířit `server/src/lib/email.ts` o calendar/task šablony
- [x] Odeslat email při vytvoření události vlastníkovi
- [x] Přidat BullMQ delayed job pro připomínky (`reminderMinutes`)
- [x] Zpracovat reminder job v `server/src/worker.ts`
- [x] Přeplánovat/zrušit připomínku při úpravě, dokončení nebo smazání události

### Fáze 3 — Google Calendar sync

- [x] Přidat `GoogleOAuthToken` model do Prisma (obě schémata)
- [x] Nainstalovat `googleapis` + `google-auth-library` (backend)
- [x] Vytvořit `server/src/lib/google-auth.ts` (OAuth2 flow, token refresh, revoke)
- [x] Vytvořit `server/src/lib/google-calendar.ts` (push, delete, sync all, pull from Google)
- [x] Vytvořit `server/src/routes/google-integration.ts` (connect, callback, status, disconnect, sync)
- [x] Registrovat router v `server/src/index.ts`
- [x] Vytvořit `src/lib/google-oauth.ts` (popup flow)
- [x] Přidat Google API funkce do `src/lib/api.ts`
- [x] Vytvořit `src/components/settings/GoogleCalendarCard.tsx`
- [x] Přidat sekci "Google integrace" do Settings stránky
- [x] Automatická sync při CRUD operacích s událostmi (calendar.ts: create, update, delete)
- [ ] Vytvořit projekt v Google Cloud Console (ruční krok)
- [ ] Zapnout Google Calendar API (ruční krok)
- [ ] Vytvořit OAuth 2.0 Client ID (ruční krok)
- [ ] Přidat env proměnné (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)

### Fáze 4 — Pokročilé funkce

- [x] Vytvořit `src/components/dashboard/UpcomingEventsWidget.tsx` (5 nadcházejících událostí)
- [x] Přidat widget na Dashboard (`src/pages/Dashboard.tsx`)
- [x] Vytvořit `src/components/cases/CaseCalendarTab.tsx` (filtrované události pro případ + quick-add)
- [x] Přidat záložku Kalendář do `src/pages/CaseDetail.tsx`
- [x] Implementovat drag & drop v CalendarPage (`editable`, `eventDrop`, `eventResize`)
- [ ] Recurring events (opakující se události) — do budoucna
- [ ] Outlook/iCal export (.ics) — do budoucna

---

## Poznámky k původní dokumentaci (insureCRM)

Původní dokumentace z insureCRM/leasingCRM předpokládá NestJS backend s moduly,
controllers a services. HypoManažer používá **plain Express** — proto jsou všechny
vzory přepsány na Express routes + lib moduly.

| Původní sekce (insureCRM) | Stav v HypoManažer |
|---------------------------|-------------------|
| Gmail API (odesílání emailů klientům) | Nepotřeba — priorita je kalendář, ne odesílání emailů z CRM |
| mailto: odkazy | Nepotřeba — nemáme detail klienta s email akcemi |
| SMTP / nodemailer | Nepoužíváme — máme Resend API |
| Email šablony v DB | Zbytečná složitost — šablony přímo v kódu v `email.ts` |
| Gmail Webhook / Pub/Sub | Nepotřeba — není Gmail integrace |
| NestJS moduly/guards/services | Přepsáno na Express routes + lib |
| Ticket systém | Neexistuje a není potřeba |
| Google Places API | Nesouvisí s kalendářem — případně samostatná implementace |
