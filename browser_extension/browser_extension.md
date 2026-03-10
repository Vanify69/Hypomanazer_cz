# Integrace HypoManageru s browser extension pro automatické vyplňování bankovních formulářů

## Exekutivní shrnutí

Cílem je vyvinout **rozšíření do prohlížeče** (primárně Manifest V3 pro Chromium) které se bezpečně **spáruje s HypoManagerem**, načte z něj „aktivní případ“ jako **normalizovaný FillModel** a na doménách bank provede **automatické vyplnění formulářových polí** pomocí content scriptu + konfigurovatelných „mapping packů“. Klíčové technické rozhodnutí je, že **síťová komunikace s HypoManager API běží v background/service workeru** (ne v content scriptu), protože content skripty iniciují requesty „jménem webu“, do kterého jsou injektované, a podléhají stejnému origin policy, zatímco skripty běžící v extension origin (service worker / extension page) mohou dělat cross‑origin requesty, pokud má rozšíření **host permissions**. citeturn0search3turn0search0turn0search4

Integrace musí řešit: (a) bezpečné **pairing/handshake** bez čtení JWT z `localStorage` HypoManageru (zadání: JWT je dnes v localStorage), (b) minimalizaci oprávnění (whitelist domén), (c) krátké TTL pro citlivá data v rozšíření (preferovat session/in‑memory), (d) robustní „field engine“ pro SPA bank (React/Vue/Angular) včetně čekání na DOM a správného vyvolání eventů, (e) údržbu mappingů kvůli změnám UI bank.

---

## Rozsah produktu a UX MVP

**Kontext (známé z podkladů, nelze ověřit veřejně):** HypoManager má REST API, existuje endpoint `GET /api/cases/active/current`, datový model je konzistentní (jméno, příjmení, RC, adresa, příjmy/výdaje, výše úvěru, účel) a autentizace je dnes přes JWT uložené v `localStorage` (citlivé; extension to nemá bezpečně číst). **Nespecifikováno:** reálné domény HypoManageru, seznam konkrétních bank a jejich hostnames, přesný datový model případů, role a oprávnění uživatelů.

### Cíle MVP

MVP je záměrně „jedna banka“ a „nejmenší bezpečný krok“:

- Rozšíření pro **Chrome/Edge/Opera (Chromium)** s Manifest V3 (MV3) se service workerem jako background. MV3 používá `background.service_worker` jako hlavní event handler rozšíření. citeturn1search16turn1search0turn5search15  
- **Pairing flow** přes jednorázový pairing kód (device‑code styl), aby rozšíření nemuselo číst HypoManager JWT z webového storage.  
- Na bankovních doménách: popup → vybrat žadatele (1–4) → „Vyplnit vše“ (nebo sekce) → report (vyplněno / nenalezeno / chyby).  
- Klávesové zkratky (např. Ctrl+Shift+1–8) definované přes `commands` v manifestu a obsloužené přes Commands API. citeturn1search1turn1search17  
- Field engine schopný vyplnit standardní `<input>`, `<textarea>`, `<select>`, plus běžné „controlled“ komponenty (React) pomocí nastavení value + dispatch eventů; doplněné o `waitForSelector` a `MutationObserver` pro SPA. MutationObserver je standardní API pro sledování změn v DOM. citeturn1search3  
- Mapping pack pro 1 banku ve formátu TS/JSON (schéma níže), aby se dal snadno patchovat.

### Ne‑cíle

- Obcházení anti‑automation/anti‑bot opatření bank, injektování skriptů do bank „mimo povolené mechaniky“ nebo pokusy obejít sandboxy/odlišné origin iframy.  
- Automatické odesílání žádosti („submit“) bez vědomé akce uživatele.  
- Dlouhodobé ukládání citlivých dat (RC, příjmy) v rozšíření; v MVP jen krátké TTL cache.  
- „Remote code execution“ (stahování spustitelného JS) – v MV3 je prosazované přísnější bezpečnostní pojetí; externí logiku nelze spouštět jako v MV2 (např. `eval`, `new Function`, injektování libovolných stringů). citeturn5search12turn5search8  
- Cross‑browser „one‑click pairing“ přes messaging z webové stránky do extension (viz níže: Firefox to pro web‑page messaging nepodporuje).

### Podporované prohlížeče po fázích

- Fáze 1: Chrome, Edge, Opera (Chromium) – 1 kódová báze, MV3.  
- Fáze 2: Firefox – WebExtensions; doporučeno psát proti `browser` API + polyfill, aby se sjednotily promisy/api namespace. citeturn2search3turn2search19  
- Fáze 3: Safari – Safari Web Extensions se balí přes Safari Web Extension Packager / Xcode a distribuce vyžaduje podpis a app packaging. citeturn0search2turn0search18turn0search6  

---

## Bezpečnost a compliance design

### Oprávnění a whitelist domén

Rozšíření musí používat princip minimálních oprávnění: v manifestu explicitně deklarovat pouze nutné `permissions` a `host_permissions`. Chrome dokumentace rozlišuje „permissions“ (API oprávnění) a „host permissions“ (na jaké URL může extension sahat). citeturn0search0turn0search4  
Doporučení:
- `host_permissions` pouze pro HypoManager origin (např. `https://app.hypomanager.tld/*`) a pro bankovní portály (konkrétní hostnames, nikoli `<all_urls>`).  
- (Volitelně) runtime žádosti o host access pro nové banky pomocí Permissions API (např. aby uživatel vědomě povolil konkrétní banku). Chrome má API pro host access request. citeturn0search12turn3search0  

### Síťová komunikace a CORS

- Content scripts iniciují requesty „jménem“ stránky (banky), takže jsou limitované stejným origin policy toho webu. citeturn0search3  
- Extension service worker / extension page (extension origin) může dělat cross‑origin requesty na HypoManager API, pokud má rozšíření host permissions pro HypoManager URL. citeturn0search3turn0search4  

### Tokeny, storage a TTL

**Zásada:** citlivé věci udržet v paměti co nejkratší dobu:  
- Access token: držet **in‑memory** v service workeru + fallback v `storage.session` (nepersistuje na disk, je v paměti po dobu session, čistí se při restartu prohlížeče / reloadu extension). citeturn1search2turn1search10turn5search13  
- Refresh token: pokud nutné, uložit v `storage.local` (persistuje) + zavést server‑side revokaci a rotaci refresh tokenů (viz API návrh).  
- FillModel (data případu): držet v `storage.session` s krátkým TTL (např. 60–180 s) a po vyplnění explicitně „zapomenout“.

**Poznámka k session storage a content scriptům:** `storage.session` není standardně dostupné v content scriptech (jen v „trusted contexts“) a lze ho zpřístupnit přes `setAccessLevel` – my to **nedoporučujeme** (zbytečné rozšíření povrchu). citeturn5search0turn3search6turn1search2  

### Maskování logů

- Veškeré logy v produkci maskovat: RC, čísla dokladů, celé adresy (min. ulice+č.p.), e‑mail/telefon (min. částečně).  
- Debug režim (options) povolí detailnější logy, ale stále lokálně (bez odesílání) a s varováním.

### Pairing/handshake – proč nepoužít messaging z HypoManager webu

Web‑page → extension messaging přes `externally_connectable` existuje v Chrome (a obecně v Chromium) a manifest klíč určuje, které weby se mohou připojit přes `runtime.connect`/`runtime.sendMessage`. citeturn3search1turn4view0  
Ale MDN explicitně uvádí, že v **Firefoxu komunikace webových stránek s rozšířením přes tyto API není podporovaná** (viz poznámka na MDN). citeturn4view0turn3search2  
Proto MVP pairing navrhujeme **cross‑browser kompatibilně** přes jednorázový pairing kód (uživatel jej přepíše / vloží do popupu).

---

## Technická architektura a message protokoly

### High‑level architektura

- **Background (MV3 service worker)**: autentizace vůči HypoManageru, cache tokenů, fetch FillModelu, routing message protokolů. MV3 service worker se definuje v manifestu v `background.service_worker`. citeturn1search16turn1search0  
- **Content script**: běží pouze na bankovních doménách, detekuje banku/step, vyplňuje pole, vrací report. Content scripts se deklarují v manifestu pod `content_scripts`; lze nastavit injektáž do všech framů přes `all_frames`. citeturn2search1turn2search13  
- **Popup (action default_popup)**: UI pro pairing, volbu žadatele, akce vyplnění. `default_popup` se definuje v `action` v manifestu. citeturn2search0  
- **Options page**: správa bank/hostů, debug režim, export diagnostiky.  
- (Volitelně) **Scripting API** pro dynamickou injektáž helperů / debug overlay; vyžaduje `scripting` permission a host access. citeturn2search2turn2search6  

### Kopírovatelný návrh `manifest.json` (MV3)

```json
{
  "manifest_version": 3,
  "name": "HypoManager Bank Autofill",
  "version": "0.1.0",
  "description": "Bezpečné vyplňování bankovních formulářů z aktivního případu v HypoManageru.",
  "action": {
    "default_popup": "popup/index.html",
    "default_title": "HypoManager Autofill"
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "permissions": [
    "storage",
    "commands"
  ],
  "host_permissions": [
    "https://<HYPOMANAGER_HOST>/*",
    "https://<BANK1_HOST>/*",
    "https://<BANK2_HOST>/*"
  ],
  "optional_host_permissions": [
    "https://<FUTURE_BANK_HOSTS>/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "https://<BANK1_HOST>/*",
        "https://<BANK2_HOST>/*"
      ],
      "js": [
        "content/content-script.js"
      ],
      "run_at": "document_idle",
      "all_frames": true
    }
  ],
  "commands": {
    "fill-all": {
      "suggested_key": {
        "default": "Ctrl+Shift+0"
      },
      "description": "Vyplnit všechna dostupná pole"
    },
    "fill-field-1": {
      "suggested_key": {
        "default": "Ctrl+Shift+1"
      },
      "description": "Vyplnit mapované pole 1 (např. jméno)"
    },
    "fill-field-2": {
      "suggested_key": {
        "default": "Ctrl+Shift+2"
      },
      "description": "Vyplnit mapované pole 2 (např. příjmení)"
    },
    "next-applicant": {
      "suggested_key": {
        "default": "Ctrl+Shift+9"
      },
      "description": "Přepnout na dalšího žadatele"
    }
  },
  "options_page": "options/index.html",
  "icons": {
    "16": "assets/icon16.png",
    "32": "assets/icon32.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
```

Poznámky k manifestu (důležité pro implementaci):
- `commands` jsou nativní mechanika pro klávesové zkratky; deklarují se v manifestu a obsluhují přes Commands API. citeturn1search1turn1search17  
- `all_frames: true` injektuje content script i do frame/iframe, které matchují URL pravidla; jinak jen top frame. citeturn2search1turn2search13  
- CSP pro extension pages je konfigurovatelné přes `content_security_policy`; defaultně rozšíření CSP mají a omezují nebezpečné praktiky typu `eval`. citeturn5search2turn5search8turn5search12  

### Message passing protokol

Chrome i MDN doporučují pro jednorázové request/response použít `runtime.sendMessage` / `tabs.sendMessage` (JSON‑serializovatelný payload). citeturn0search5turn0search1  

**Základní typy zpráv:**

- Popup → Background:  
  - `PAIR_SUBMIT_CODE` (uživatel vloží pairing code)  
  - `GET_ACTIVE_CASE`  
  - `FILL_ALL` / `FILL_SECTION` / `FILL_FIELD`  
  - `SET_APPLICANT_INDEX`  

- Background → Content script (tab):  
  - `FILL_REQUEST` (obsahuje FillModel + mapping instrukce + context)  

- Content script → Background (odpověď):  
  - `FILL_RESULT` (report: vyplněno, nenalezeno, chyby, step)

**Kopírovatelný TypeScript návrh message typů:**

```ts
export type Msg =
  | { type: "PAIR_SUBMIT_CODE"; code: string }
  | { type: "PAIR_STATUS" }
  | { type: "GET_ACTIVE_CASE" }
  | { type: "SET_APPLICANT_INDEX"; applicantIndex: number }
  | { type: "FILL_ALL" }
  | { type: "FILL_SECTION"; sectionId: string }
  | { type: "FILL_FIELD"; fieldId: string };

export type FillRequest = {
  type: "FILL_REQUEST";
  requestId: string;
  applicantIndex: number;
  bankId: string;
  fillModel: FillModel;
  mode: { kind: "all" } | { kind: "section"; sectionId: string } | { kind: "field"; fieldId: string };
};

export type FillResult = {
  type: "FILL_RESULT";
  requestId: string;
  bankId: string;
  stepId?: string;
  filled: Array<{ fieldId: string; label: string }>;
  missing: Array<{ fieldId: string; label: string; reason: "not_found" | "not_visible" | "readonly" }>;
  errors: Array<{ fieldId?: string; error: string }>;
  startedAt: string;
  finishedAt: string;
};
```

**Ukázkové handlery (copy‑paste skeleton):**

```ts
// background/service-worker.ts
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "PAIR_SUBMIT_CODE":
        // 1) exchange code -> refresh+access token
        // 2) persist refresh token (local), access token (session/memory)
        sendResponse({ ok: true });
        return;

      case "GET_ACTIVE_CASE": {
        const model = await getActiveCaseFillModel(); // fetch via host_permissions
        sendResponse({ ok: true, model });
        return;
      }

      case "FILL_ALL": {
        const tabId = sender.tab?.id ?? (await getActiveTabId());
        const payload: FillRequest = await buildFillRequest({ mode: { kind: "all" }, tabId });
        const result = await chrome.tabs.sendMessage(tabId, payload);
        sendResponse({ ok: true, result });
        return;
      }

      default:
        sendResponse({ ok: false, error: "UnknownMessageType" });
    }
  })().catch((err) => sendResponse({ ok: false, error: String(err) }));

  // IMPORTANT: keep channel open for async response
  return true;
});
```

```ts
// content/content-script.ts
chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
  (async () => {
    if (message?.type !== "FILL_REQUEST") {
      sendResponse({ ok: false, error: "Unsupported" });
      return;
    }

    const req = message as FillRequest;
    const result: FillResult = await runFill(req);
    sendResponse(result);
  })().catch((err) => sendResponse({
    type: "FILL_RESULT",
    requestId: message?.requestId ?? "unknown",
    bankId: message?.bankId ?? "unknown",
    filled: [],
    missing: [],
    errors: [{ error: String(err) }],
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString()
  }));

  return true;
});
```

---

## HypoManager API změny a pairing flow

### Přehled: co přesně se musí v HypoManageru změnit

Protože současná autentizace používá JWT v `localStorage` (a rozšíření ho nemá bezpečně ani portable číst), HypoManager musí přidat **integration autentizaci** pro rozšíření:

- Uživatelsky iniciovaný **pairing kód** (krátké TTL) v HypoManager UI.  
- Backend endpoint na výměnu pairing kódu za **refresh token** (dlouhodobý, revokovatelný) a **access token** (krátký TTL).  
- Endpoint pro export **FillModelu** (normalizovaný datový objekt určený pro vyplňování).

### Tabulka endpointů (metody, payloady, odpovědi)

| Endpoint | Metoda | Auth | Request payload | Response | Poznámky |
|---|---:|---|---|---|---|
| `/api/integrations/browser-extension/pairing/start` | POST | HypoManager session (běžné přihlášení) | `{ "deviceName": "...", "requestedScopes": ["cases:read","fill:read"] }` | `{ "pairingId": "...", "userCode": "ABCD-EFGH", "expiresAt": "..." }` | Vytvoří krátký pairing kód zobrazený v HypoManager UI. |
| `/api/integrations/browser-extension/pairing/confirm` | POST | **bez** (kód) | `{ "userCode": "ABCD-EFGH", "installationId": "uuid", "device": { ... } }` | `{ "refreshToken": "...", "accessToken": "...", "accessTokenExpiresAt": "...", "scopes": [...] }` | Volá rozšíření z background SW přes host_permissions. |
| `/api/integrations/browser-extension/token/refresh` | POST | refresh token | `{ "refreshToken": "..." }` | `{ "accessToken": "...", "accessTokenExpiresAt": "...", "refreshToken": "..."? }` | Doporučeno rotovat refresh token (vracet nový). |
| `/api/cases/active/current` | GET | access token | — | (stávající) | Existuje dle zadání; může vracet „Case“ – rozšíření ale potřebuje FillModel. |
| `/api/cases/active/current/fill-model` | GET | access token | — | `FillModel` | Doporučený nový endpoint: vrací normalizovaná data pro vyplňování. |
| `/api/integrations/browser-extension/pairings` | GET | access token | — | `{ "devices": [...] }` | (Volitelné) Správa spárovaných zařízení v HM UI. |
| `/api/integrations/browser-extension/revoke` | POST | access token | `{ "installationId": "uuid" }` | `{ "ok": true }` | (Volitelné) Revokace refresh tokenu. |

**Nespecifikováno:** jaké auth HM dnes používá krom localStorage JWT (cookies?), zda existuje „session“ pro UI, jak řešit multi‑tenant, RBAC, audit logy.

### FillModel – přesný návrh payloadu (TypeScript + JSON příklad)

**Copy‑paste TypeScript definice:**

```ts
export type FillModel = {
  version: "1.0";
  caseId: string;
  updatedAt: string; // ISO

  applicants: Array<{
    applicantId: string;
    role: "primary" | "coapplicant" | "other";
    firstName: string;
    lastName: string;

    birthNumber?: string;     // RC (citlivé)
    dateOfBirth?: string;     // ISO YYYY-MM-DD (fallback, pokud RC chybí)

    phone?: string;
    email?: string;

    address?: {
      street?: string;
      houseNumber?: string;
      city?: string;
      zip?: string;
      countryCode?: string; // např. "CZ"
    };

    employment?: {
      status?:
        | "employee"
        | "selfEmployed"
        | "maternity"
        | "retired"
        | "student"
        | "unemployed"
        | "other";
      employerName?: string;
      contractType?: string;     // nespecifikováno – záleží na HM modelu
      probation?: boolean;
    };

    income?: {
      netMonthly?: number;       // CZK
      grossMonthly?: number;     // CZK
      otherMonthly?: number;     // CZK
    };

    expenses?: {
      totalMonthly?: number;     // CZK
    };
  }>;

  loan?: {
    amount?: number;             // CZK
    purpose?: "purchase" | "refinance" | "construction" | "other";
    maturityYears?: number;
    fixationYears?: number;
    ltv?: number;                // 0-100
  };

  property?: {
    type?: "flat" | "house" | "land" | "other"; // nespecifikováno
    value?: number;             // CZK
    address?: {
      street?: string;
      houseNumber?: string;
      city?: string;
      zip?: string;
      countryCode?: string;
    };
  };
};
```

**Copy‑paste JSON příklad:**

```json
{
  "version": "1.0",
  "caseId": "CASE-123",
  "updatedAt": "2026-03-04T10:15:00.000Z",
  "applicants": [
    {
      "applicantId": "A1",
      "role": "primary",
      "firstName": "Jan",
      "lastName": "Novák",
      "birthNumber": "800101/1234",
      "phone": "+420777000111",
      "email": "jan.novak@example.com",
      "address": {
        "street": "Dlouhá",
        "houseNumber": "12",
        "city": "Praha",
        "zip": "11000",
        "countryCode": "CZ"
      },
      "employment": {
        "status": "employee",
        "employerName": "ACME s.r.o.",
        "probation": false
      },
      "income": {
        "netMonthly": 55000
      },
      "expenses": {
        "totalMonthly": 12000
      }
    }
  ],
  "loan": {
    "amount": 4500000,
    "purpose": "purchase",
    "maturityYears": 30,
    "fixationYears": 5,
    "ltv": 80
  },
  "property": {
    "type": "flat",
    "value": 5600000,
    "address": {
      "city": "Praha",
      "zip": "11000",
      "countryCode": "CZ"
    }
  }
}
```

### Návrh pairing flow (sekvenční kroky, TTL, refresh, UX)

**Cíl:** bezpečný, cross‑browser kompatibilní pairing bez web‑page messagingu.

**Sekvence:**

1) Uživatel otevře HypoManager → Nastavení → Integrace → „Rozšíření pro prohlížeč“. Klikne **„Vygenerovat kód“**.  
2) HypoManager zavolá `POST /api/integrations/browser-extension/pairing/start` a zobrazí `userCode` (např. `ABCD-EFGH`) + odpočet expirace.  
3) Uživatel otevře popup rozšíření → sekce Pairing → vloží kód → „Spárovat“.  
4) Rozšíření (background SW) zavolá `POST /api/integrations/browser-extension/pairing/confirm` s `userCode` + `installationId` (náhodné UUID uložené v `storage.local`) a dostane `refreshToken` + `accessToken`.  
5) Rozšíření uloží `refreshToken` do `storage.local` (revokovatelný) a `accessToken` do paměti a/nebo `storage.session` (TTL). citeturn1search2turn5search13  
6) Při expiraci access tokenu background SW volá `/token/refresh`. Pokud server rotuje refresh token, extension uloží nový a starý zahodí.  
7) V HypoManageru je v UI vidět seznam spárovaných zařízení + možnost revokace.

**Doporučené TTL (parametry, lze změnit):**
- Pairing `userCode`: 5 minut, jednorázové použití.  
- Access token: 10–15 minut.  
- Refresh token: 30–90 dní s rotací; revokace kdykoliv.

**UX chování v rozšíření:**
- Pokud není spárováno → popup ukazuje „Není spárováno“ + pole pro kód + link/tooltip „Kód získáš v HypoManageru v Nastavení → Integrace“.  
- Pokud refresh selže (401/revoked) → automaticky odhlásit (smazat refresh token) a vyžádat nové spárování.

### Pseudokód: handler pro `pairing/confirm` (backend)

```pseudo
POST /api/integrations/browser-extension/pairing/confirm
  input: userCode, installationId, device
  validate:
    - userCode exists, not expired, not used
    - installationId is UUID-like
  lookup: pairingRecord by userCode
  if not found or expired or used -> 400

  userId = pairingRecord.userId
  scopes = pairingRecord.requestedScopes

  // mark one-time code used (atomic transaction)
  pairingRecord.usedAt = now()
  save(pairingRecord)

  // issue tokens
  refreshToken = issueRefreshToken(userId, installationId, scopes, rotationEnabled=true)
  accessToken  = issueAccessToken(userId, installationId, scopes, ttl=15m)

  return 200 {
    refreshToken,
    accessToken,
    accessTokenExpiresAt,
    scopes,
    deviceRegisteredAt: now()
  }
```

---

## Bankovní mapping packy a Field Engine

### Formát mapping packů (TS/JSON schema + příklad)

**Princip:** mapping pack je „data“, která říkají **jaké pole na stránce hledat** a **jakou hodnotu z FillModelu do něj vložit**. Doporučení pro MVP: mapping packy držet **v repozitáři** (TS/JSON) a vydávat update rozšíření při změně bank UI (nejjednodušší na compliance a review).

**Copy‑paste TypeScript schéma:**

```ts
export type BankId = "kb" | "csob" | "cs" | string;

export type BankMappingPack = {
  bankId: BankId;
  version: string; // např. "kb-2026-03-04"
  match: {
    hostnames: string[];
    pathIncludes?: string[];
  };

  steps: Array<{
    stepId: string;
    detectAny: string[]; // when any selector exists => step active
    fields: Array<{
      fieldId: string;
      label: string;
      selectors: string[]; // CSS selectors in priority order
      kind: "text" | "number" | "date" | "select";
      valueFrom:
        | { source: "applicant"; path: string }  // např. "firstName"
        | { source: "loan"; path: string }       // např. "amount"
        | { source: "property"; path: string }
        | { source: "const"; value: string | number };

      transform?: Array<"trim" | "upper" | "digitsOnly">;
      required?: boolean;
    }>;
  }>;
};
```

**Copy‑paste příklad (zkrácený) pro jednu banku – „kb“ (hostnames nespecifikováno, doplňte):**

```json
{
  "bankId": "kb",
  "version": "kb-2026-03-04",
  "match": {
    "hostnames": ["<KB_PORTAL_HOST>"]
  },
  "steps": [
    {
      "stepId": "client-basic",
      "detectAny": ["form#clientForm", "[data-step='client']"],
      "fields": [
        {
          "fieldId": "applicant.firstName",
          "label": "Jméno",
          "selectors": ["input[name='firstName']", "input#firstName"],
          "kind": "text",
          "valueFrom": { "source": "applicant", "path": "firstName" },
          "transform": ["trim"],
          "required": true
        },
        {
          "fieldId": "applicant.lastName",
          "label": "Příjmení",
          "selectors": ["input[name='lastName']", "input#lastName"],
          "kind": "text",
          "valueFrom": { "source": "applicant", "path": "lastName" },
          "transform": ["trim"],
          "required": true
        },
        {
          "fieldId": "applicant.birthNumber",
          "label": "Rodné číslo",
          "selectors": ["input[name='birthNumber']", "input#birthNumber"],
          "kind": "text",
          "valueFrom": { "source": "applicant", "path": "birthNumber" },
          "transform": ["trim"],
          "required": false
        }
      ]
    }
  ]
}
```

### Field engine techniky (praktický implementační návod)

**Požadavky z praxe (bankovní SPA):** DOM se mění, pole mohou být v různých krocích, některé komponenty jsou „controlled“ (React) a nestačí jen `input.value = ...`. Proto implementujte engine s těmito stavebními bloky:

1) `waitForSelector` + timeout  
2) `MutationObserver` pro odchyt, kdy se objeví step/pole (standardní API). citeturn1search3  
3) `setValueWithEvents` pro `<input>/<textarea>`:
   - nastavit hodnotu přes „native setter“ (kvůli Reactu)  
   - vyvolat `input` event a `change` event (některé UI reagují až na change; na textových inputech se change typicky vyvolá až při ztrátě focusu). citeturn1search15  
4) `select` handling: nastavit `value`, dispatch change  
5) Iframe handling:
   - content_scripts `all_frames: true` injektuje i do framů, které splňují match pattern. citeturn2search1  
   - cross‑origin iframe nelze ovládat z content scriptu (MVP: reportovat jako „nelze“)

**Copy‑paste helpery (content script):**

```ts
export async function waitForSelector(sel: string, timeoutMs = 10000): Promise<Element> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(sel);
    if (el) return el;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`waitForSelector timeout: ${sel}`);
}

function getNativeInputValueSetter(el: HTMLInputElement | HTMLTextAreaElement) {
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  return desc?.set;
}

export function setValueWithEvents(el: Element, value: string) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    throw new Error("setValueWithEvents: not an input/textarea");
  }

  const setter = getNativeInputValueSetter(el);
  if (setter) setter.call(el, value);
  else (el as any).value = value;

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function pickFirstExisting(selectors: string[]): Element | null {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}
```

**MutationObserver pattern (detekce kroku/stepu):**

```ts
export function waitForAnySelector(selectors: string[], timeoutMs = 10000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const found = () => pickFirstExisting(selectors);
    const existing = found();
    if (existing) return resolve(existing);

    const obs = new MutationObserver(() => {
      const el = found();
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => {
      obs.disconnect();
      reject(new Error(`waitForAnySelector timeout: ${selectors.join(",")}`));
    }, timeoutMs);
  });
}
```

### Poznámka k dynamické injektáži (scripting API)

Pokud budete chtít některé helpery injektovat jen „na vyžádání“ (např. debug overlay), MV3 doporučuje použít `chrome.scripting.executeScript`, k čemuž je potřeba `scripting` permission a host rights (host_permissions nebo activeTab). citeturn2search2turn2search6  

---

## Testování, CI/build a provozní údržba

### Testování

**Unit testy (Node/Vitest/Jest):**
- Transformace (`trim`, `digitsOnly`, formátování dat)  
- Resolver `valueFrom` (path traversal v FillModelu)  
- Maskování logů (např. RC → `********/****`)  

**Integrační testy (Playwright):**  
- Hostované „mock bank pages“ (statické HTML/JS) simulující:
  - standardní inputy  
  - React-like controlled input (simulované handlerem na `input`)  
  - dynamické přidávání polí (MutationObserver scénář)  
- Playwright spustit jako e2e: nainstalovat unpacked extension + otevřít mock bank page + ověřit vyplnění.

*(Oficiální zdroj pro Playwright není v tomto výstupu citovaný, protože zadání explicitně vyžaduje primárně MDN/Chrome/Apple zdroje; pokud chceš, doplním v další iteraci i oficiální odkazy Playwright docs.)* **Nespecifikováno:** zda máte možnost sandbox prostředí bank pro automatické testy.

### CI/build targets a balení pro prohlížeče

Doporučený stack:
- TypeScript + bundler (Vite/esbuild/webpack)  
- build output: `dist/chrome`, `dist/firefox`, `dist/safari` (safari jako vstup pro packager)

#### Tabulka rozdílů build/packaging pro prohlížeče

| Prohlížeč | Standard | Manifest | Balení/distribuce | Specifické kroky |
|---|---|---|---|---|
| Chrome / Edge / Opera | Chromium Extensions | MV3 | Chrome Web Store / Edge Add-ons / Opera Add-ons | Background jako service worker (`background.service_worker`). citeturn1search16turn1search0 |
| Firefox | WebExtensions | MV2/MV3 (dle API) | AMO (addons.mozilla.org) | Doporučeno psát proti `browser` API a použít polyfill pro Chromium. citeturn2search3turn2search19 |
| Safari | Safari Web Extensions | WebExtensions‑like + Xcode wrapper | App Store (podepsaná app) | Použít Safari Web Extension Packager, který vytvoří Xcode projekt a app, která extension instaluje; pro distribuci je potřeba podpis. citeturn0search2turn0search18turn0search10 |

### Provozní údržba mappingů (banky mění UI)

**Riziko:** UI bank se pravidelně mění → selektory přestanou fungovat → vyplnění selže.

Doporučený proces:
- Každý mapping pack má `version` a interní „selector health“ diagnostiku (kolik polí nalezeno).  
- Při velkém poklesu úspěšnosti (např. <60 % polí nalezeno) rozšíření:
  - ukáže uživateli varování „Mapa banky je pravděpodobně zastaralá“  
  - nabídne export diagnostiky (bez citlivých dat)  
- Patchování:
  - Hotfix mappingu v repozitáři → release extension (nejčistší)  
  - (Phase 2, volitelné) konfigurační „mapping override“ jako data; pozor na omezení MV3 a review politiky – nesmí to být remote code. MV3 klade důraz na to, aby nebylo možné spouštět externí kód a aby logika byla v bundle. citeturn5search12  

---

## Odhad práce, milníky a GitHub issue šablony

### Tabulka milníků a odhad času

| Milník | Výstup | Odhad (dny) | Poznámky |
|---|---|---:|---|
| Skeleton extension (MV3) | manifest, service worker, popup, content script, messaging | 2–3 | MV3 SW + message passing dle oficiálních doporučení. citeturn1search16turn0search5 |
| HypoManager pairing + tokeny | nové endpointy + UI pro kód + token exchange v extension | 3–6 | Závisí na backend auth architektuře (nespecifikováno). |
| FillModel export | `/fill-model` endpoint + TS typy + validace | 2–4 | Doporučeno verzovat `FillModel.version`. |
| Field engine core | waitForSelector, MutationObserver, setValueWithEvents, report | 3–6 | MutationObserver standard. citeturn1search3 |
| Mapping pack pro 1 banku | step detection + 20–50 polí | 3–8 | Největší variabilita dle složitosti banky (nespecifikováno). |
| Zkratky + žadatelé 1–4 | commands, applicant switching, persistence | 1–3 | Commands API + manifest `commands`. citeturn1search1turn1search17 |
| Testy + mock bank pages | unit + Playwright e2e | 3–6 | Mocky jsou realistická cesta bez bank sandboxu. |
| Release pipeline | build targets chrome/firefox + docs | 2–4 | Safari až ve fázi 3. citeturn0search2turn0search18 |

**Celkem MVP (1 banka):** typicky 17–40 dnů (záleží na rozsahu mappingu, auth změnách a testování). **Nespecifikováno:** počet polí pro MVP, konkrétní banka a dostupnost test prostředí.

### Bezpečnostní checklist (akceptační kritéria)

- [ ] `host_permissions` jen whitelist HypoManager + konkrétní bank domény (žádné `<all_urls>`). citeturn0search0turn0search4  
- [ ] HypoManager JWT z `localStorage` se **nikde nečte** (ani content script, ani injected script).  
- [ ] Access token má krátké TTL a drží se pouze in‑memory / `storage.session`. citeturn1search2turn5search13  
- [ ] FillModel se cachuje jen s TTL a po dokončení se čistí.  
- [ ] Logy jsou maskované a neobsahují RC v plaintext.  
- [ ] CSP pro extension pages je striktní, žádný remote JS. citeturn5search2turn5search12turn5search8  
- [ ] Content script nikdy neposílá FillModel ven do DOM (žádné `window.*` leak), pouze lokálně vyplňuje.  
- [ ] Diagnostika exportuje jen metadata (fieldId, selector status), ne hodnoty.

### GitHub issue šablony (copy‑paste)

#### Issue: MVP – základ rozšíření (MV3 skeleton)

```md
## Cíl
Vybudovat skeleton browser extension (Chromium MV3) pro HypoManager Autofill:
- manifest MV3 + background service worker
- popup UI
- content script injekce na bankovní domény
- message passing popup ↔ background ↔ content

## Akceptační kritéria
- [ ] MV3 service worker definovaný v manifestu a funkční (loguje start a přijímá zprávy)
- [ ] Popup umí poslat zprávu do background a dostat odpověď
- [ ] Background umí poslat zprávu do content scriptu v aktivním tabu
- [ ] Content script přijímá FillRequest a vrací FillResult (zatím mock)

## Poznámky
- Použít one-time messaging runtime.sendMessage/tabs.sendMessage.
```

#### Issue: HypoManager – pairing kód a token exchange

```md
## Cíl
Implementovat bezpečný pairing flow HypoManager ↔ Extension bez čtení JWT z localStorage.

## Backend změny
- [ ] POST /api/integrations/browser-extension/pairing/start (vydá userCode + expiresAt)
- [ ] POST /api/integrations/browser-extension/pairing/confirm (code -> refresh+access)
- [ ] POST /api/integrations/browser-extension/token/refresh (refresh -> access, rotace refresh)

## Frontend HypoManager UI
- [ ] Stránka Integrace: vygenerovat kód + odpočet expirace
- [ ] Seznam spárovaných zařízení + revoke (volitelné)

## Extension
- [ ] Popup: input pro userCode + tlačítko "Spárovat"
- [ ] Background: uloží refresh token do storage.local, access do session/in-memory
- [ ] Při 401 refresh selže => vyžádat nové spárování

## Akceptační kritéria
- [ ] Pairing code je jednorázový a expirovaný kód nejde použít
- [ ] Refresh token lze revokovat
- [ ] Access token má krátké TTL a není persistovaný na disk
```

#### Issue: FillModel endpoint + validace

```md
## Cíl
Zavést endpoint pro FillModel a zajistit jeho kompatibilitu pro mapping engine.

## Backend
- [ ] GET /api/cases/active/current/fill-model vrací FillModel v1.0
- [ ] FillModel obsahuje applicants[1..4], loan, property + updatedAt

## Extension
- [ ] Background fetch FillModel přes host_permissions
- [ ] Cache v storage.session s TTL (např. 120s)

## Akceptační kritéria
- [ ] FillModel je verzovaný (field version: "1.0")
- [ ] Null/optional fieldy jsou konzistentní (žádné překvapivé typy)
```

#### Issue: Field engine + mapping pack pro banku X

```md
## Cíl
Implementovat field engine a mapping pack pro banku <BANK_ID>.

## Field engine
- [ ] waitForSelector + timeout
- [ ] MutationObserver waitForAnySelector
- [ ] setValueWithEvents (native setter + input/change)
- [ ] report: filled/missing/errors

## Mapping pack
- [ ] definovat steps + detectAny selektory
- [ ] zmapovat min. 20 klíčových polí pro žadatele a úvěr
- [ ] fallback selektory pro každé pole

## Akceptační kritéria
- [ ] na mock stránkách: 100% polí vyplněno
- [ ] na reálné bance: >= 70% mapovaných polí vyplněno (zbytek report missing)
- [ ] žádná citlivá data v logu
```

---

### Poznámky k oficiálním zdrojům použitém v návrhu

- MV3 background jako service worker a jeho deklarace v manifestu: Chrome docs. citeturn1search16turn1search0  
- Message passing `runtime.sendMessage` / `tabs.sendMessage`: Chrome docs + MDN. citeturn0search5turn0search1  
- Host permissions + cross‑origin network requests: Chrome docs. citeturn0search3turn0search0turn0search4  
- Storage session jako in‑memory a jeho chování: Chrome docs + MDN. citeturn1search2turn5search13turn1search10  
- Content scripts a `all_frames`: Chrome docs. citeturn2search1turn2search13  
- Cross‑browser přístup a polyfill: MDN. citeturn2search3turn2search19  
- Safari packaging/distribuce: Apple Developer dokumentace. citeturn0search2turn0search18turn0search10  
- Externally connectable a omezení ve Firefoxu pro web‑page → extension messaging: MDN/Chrome. citeturn4view0turn3search1  

