/**
 * HypoManager Bank Autofill – background service worker (MV3)
 * Autentizace, cache tokenů, fetch FillModelu, routing zpráv.
 */

import type { FillModel, FillRequest, Msg, BankMappingPack } from "../types.js";

const DEFAULT_API_BASE = "http://localhost:4000";
const FILL_MODEL_TTL_MS = 120_000; // 2 min

let accessTokenMemory: { token: string; expiresAt: number } | null = null;

/** URL API z Nastavení rozšíření (Options). Prázdné = localhost pro vývoj. */
async function getApiBase(): Promise<string> {
  const out = await chrome.storage.local.get("apiBaseUrl");
  const url = (out.apiBaseUrl as string)?.trim();
  return url || DEFAULT_API_BASE;
}

async function getAdminToken(): Promise<{ token: string; expiresAt: number } | null> {
  const s = await chrome.storage.session.get(["adminToken", "adminTokenExpiresAt"]);
  if (!s.adminToken || !s.adminTokenExpiresAt) return null;
  const exp = new Date(s.adminTokenExpiresAt as string).getTime();
  if (Number.isNaN(exp) || exp <= Date.now() + 60_000) return null;
  return { token: s.adminToken as string, expiresAt: exp };
}

async function getInstallationId(): Promise<string> {
  const out = await chrome.storage.local.get("installationId");
  if (out.installationId) return out.installationId;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ installationId: id });
  return id;
}

async function getAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (accessTokenMemory && accessTokenMemory.expiresAt > now + 60_000) {
    return accessTokenMemory.token;
  }
  const session = await chrome.storage.session.get("accessToken");
  if (session.accessToken && session.accessTokenExpiresAt) {
    const exp = new Date(session.accessTokenExpiresAt).getTime();
    if (exp > now + 60_000) return session.accessToken;
  }
  const local = await chrome.storage.local.get("refreshToken");
  if (!local.refreshToken) return null;
  const API_BASE = await getApiBase();
  const res = await fetch(`${API_BASE}/api/integrations/browser-extension/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: local.refreshToken }),
  });
  if (!res.ok) {
    await chrome.storage.local.remove("refreshToken");
    accessTokenMemory = null;
    await chrome.storage.session.remove(["accessToken", "accessTokenExpiresAt"]);
    return null;
  }
  const data = (await res.json()) as { accessToken: string; accessTokenExpiresAt: string };
  const exp = new Date(data.accessTokenExpiresAt).getTime();
  accessTokenMemory = { token: data.accessToken, expiresAt: exp };
  await chrome.storage.session.set({
    accessToken: data.accessToken,
    accessTokenExpiresAt: data.accessTokenExpiresAt,
  });
  return data.accessToken;
}

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("Žádný aktivní tab");
  return tab.id;
}

async function getActiveCaseFillModel(): Promise<FillModel | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const API_BASE = await getApiBase();
  const res = await fetch(`${API_BASE}/api/cases/active/current/fill-model`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const model = (await res.json()) as FillModel;
  return model?.version === "1.0" ? model : null;
}

/** Zkusí načíst mapping pack pro danou URL z HypoManager API. */
async function getMappingPackForUrl(url: string): Promise<BankMappingPack | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const token = await getAccessToken();
  if (!token) return null;
  const API_BASE = await getApiBase();
  const hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = u.pathname;

  const res = await fetch(
    `${API_BASE}/api/integrations/browser-extension/mappings?hostname=${encodeURIComponent(
      hostname
    )}&pathname=${encodeURIComponent(pathname)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) return null;
  const pack = (await res.json()) as BankMappingPack;
  if (!pack?.bankId || !pack?.steps?.length) return null;
  return pack;
}

async function getApplicantIndex(): Promise<number> {
  const out = await chrome.storage.session.get("applicantIndex");
  return typeof out.applicantIndex === "number" ? out.applicantIndex : 0;
}

function detectBankId(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.toLowerCase();
    if (host === "localhost" && path.includes("test-autofill")) return "test";
    if (host === "noby.cz" && path.includes("/modelation/mortgage")) return "noby";
    // TODO: podle hostu vrátit "kb" | "csob" | "cs" atd.
  } catch {
    // ignore
  }
  return "unknown";
}

/** Pošle zprávu do tabu; pokud content script neběží, vstříkne ho a zkusí znovu. */
async function sendToTabWithInjection<T>(tabId: number, payload: FillRequest): Promise<T> {
  try {
    return await chrome.tabs.sendMessage(tabId, payload) as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("Receiving end does not exist") && !msg.includes("Could not establish connection")) throw e;
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content/content-script.js"],
      });
      await new Promise((r) => setTimeout(r, 200));
    } catch (_inj) {
      throw new Error("Rozšíření nemá oprávnění pro tuto stránku. Zkus obnovit stránku (F5) a kliknout znovu na Vyplnit vše.");
    }
    return await chrome.tabs.sendMessage(tabId, payload) as T;
  }
}

async function buildFillRequest(params: {
  mode: { kind: "all" } | { kind: "section"; sectionId: string } | { kind: "field"; fieldId: string };
  tabId: number;
}): Promise<FillRequest> {
  const model = await getActiveCaseFillModel();
  if (!model) throw new Error("Nemáš aktivní případ – spáruj HypoManager a zvol případ.");
  const applicantIndex = await getApplicantIndex();
  const tab = await chrome.tabs.get(params.tabId);
  const url = tab.url ?? "";
  const bankId = detectBankId(url);
  const packFromApi = url ? await getMappingPackForUrl(url) : null;
  return {
    type: "FILL_REQUEST",
    requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    applicantIndex,
    bankId: packFromApi?.bankId ?? bankId,
    fillModel: model,
    pack: packFromApi ?? undefined,
    mode: params.mode,
  };
}

chrome.runtime.onMessage.addListener(
  (message: Msg & { type: string }, sender: chrome.runtime.MessageSender, sendResponse: (r: unknown) => void) => {
    (async () => {
      const msgType = message != null && typeof message === "object" && "type" in message ? (message as { type: string }).type : undefined;
      switch (msgType) {
        case "PAIR_SUBMIT_CODE": {
          const code = String((message as { code: string }).code ?? "").trim().toUpperCase().replace(/\s/g, "");
          if (!code) {
            sendResponse({ ok: false, error: "Zadej kód." });
            return;
          }
          const installationId = await getInstallationId();
          const API_BASE = await getApiBase();
          const confirmRes = await fetch(`${API_BASE}/api/integrations/browser-extension/pairing/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userCode: code, installationId, device: {} }),
          });
          if (!confirmRes.ok) {
            const err = (await confirmRes.json()).error ?? confirmRes.statusText;
            sendResponse({ ok: false, error: err });
            return;
          }
          const data = (await confirmRes.json()) as {
            refreshToken: string;
            accessToken: string;
            accessTokenExpiresAt: string;
          };
          await chrome.storage.local.set({ refreshToken: data.refreshToken });
          const exp = new Date(data.accessTokenExpiresAt).getTime();
          accessTokenMemory = { token: data.accessToken, expiresAt: exp };
          await chrome.storage.session.set({
            accessToken: data.accessToken,
            accessTokenExpiresAt: data.accessTokenExpiresAt,
          });
          sendResponse({ ok: true });
          return;
        }

        case "PAIR_STATUS": {
          const { refreshToken } = await chrome.storage.local.get("refreshToken");
          sendResponse({ ok: true, paired: !!refreshToken });
          return;
        }

        case "GET_ACTIVE_CASE": {
          const model = await getActiveCaseFillModel();
          sendResponse({ ok: true, model });
          return;
        }

        case "SET_APPLICANT_INDEX": {
          const applicantIndex = (message as { applicantIndex: number }).applicantIndex;
          await chrome.storage.session.set({ applicantIndex });
          sendResponse({ ok: true });
          return;
        }

        case "FILL_ALL": {
          const tabId = sender.tab?.id ?? (await getActiveTabId());
          try {
            const payload = await buildFillRequest({ mode: { kind: "all" }, tabId });
            const result = await sendToTabWithInjection(tabId, payload);
            sendResponse({ ok: true, result });
          } catch (e) {
            sendResponse({ ok: false, error: String(e) });
          }
          return;
        }

        case "FILL_SECTION": {
          const tabId = sender.tab?.id ?? (await getActiveTabId());
          try {
            const payload = await buildFillRequest({
              mode: { kind: "section", sectionId: (message as { sectionId: string }).sectionId },
              tabId,
            });
            const result = await sendToTabWithInjection(tabId, payload);
            sendResponse({ ok: true, result });
          } catch (e) {
            sendResponse({ ok: false, error: String(e) });
          }
          return;
        }

        case "FILL_FIELD": {
          const tabId = sender.tab?.id ?? (await getActiveTabId());
          try {
            const payload = await buildFillRequest({
              mode: { kind: "field", fieldId: (message as { fieldId: string }).fieldId },
              tabId,
            });
            const result = await sendToTabWithInjection(tabId, payload);
            sendResponse({ ok: true, result });
          } catch (e) {
            sendResponse({ ok: false, error: String(e) });
          }
          return;
        }

        case "RUN_DOM_SCAN": {
          const tabId = (message as { tabId: number }).tabId;
          if (typeof tabId !== "number") {
            sendResponse({ ok: false, error: "tabId required" });
            return;
          }
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId },
              func: () => {
                const fields: { selector: string; label: string; tagName: string; name: string; id: string; type: string }[] = [];
                document.querySelectorAll("input, textarea, select").forEach((el: Element, i: number) => {
                  const tag = el.tagName.toLowerCase();
                  const id = ((el as HTMLElement).id || "").trim();
                  const name = ((el as HTMLInputElement).name || "").trim();
                  const placeholder = ((el as HTMLInputElement).placeholder || "").trim();
                  const ariaLabel = (el as HTMLElement).getAttribute("aria-label")?.trim() || "";
                  let selector = "";
                  if (id) selector = tag === "input" || tag === "textarea" ? `#${id}` : `select#${id}`;
                  else if (name) selector = `${tag}[name="${name}"]`;
                  if (!selector) selector = `${tag}:nth-of-type(${i + 1})`;
                  const labelEl = (el as HTMLInputElement).labels?.[0];
                  const label = (labelEl?.textContent || "").trim() || ariaLabel || placeholder || name || id || selector;
                  fields.push({ selector, label: label.slice(0, 80), tagName: tag, name, id, type: (el as HTMLInputElement).type || "" });
                });
                return { url: window.location.href, hostname: window.location.hostname, pathname: window.location.pathname, fields };
              },
            });
            const result = results?.[0]?.result;
            if (!result) {
              sendResponse({ ok: false, error: "Nepodařilo se procházet stránku (možná nemáme oprávnění)." });
              return;
            }
            sendResponse({ ok: true, data: result });
          } catch (e) {
            sendResponse({ ok: false, error: String(e) });
          }
          return;
        }

        case "SEND_MAPPING": {
          const pack = (message as { pack: BankMappingPack }).pack;
          if (!pack?.bankId || !pack?.steps?.length) {
            sendResponse({ ok: false, error: "Neplatný mapping pack." });
            return;
          }
          const token = await getAccessToken();
          if (!token) {
            sendResponse({ ok: false, error: "Nejsi spárovaný s HypoManagerem. Nejprve spáruj v Nastavení." });
            return;
          }
          try {
            const API_BASE = await getApiBase();
            const res = await fetch(`${API_BASE}/api/integrations/browser-extension/mappings`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(pack),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              sendResponse({ ok: false, error: (data as { error?: string }).error ?? res.statusText });
              return;
            }
            sendResponse({
              ok: true,
              id: (data as { id?: string }).id,
              hostname: (data as { hostname?: string }).hostname,
              pathPrefix: (data as { pathPrefix?: string }).pathPrefix,
            });
          } catch (e) {
            sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
          }
          return;
        }

        case "ADMIN_STATUS": {
          const token = await getAdminToken();
          sendResponse({ ok: true, unlocked: !!token, expiresAt: token ? new Date(token.expiresAt).toISOString() : null });
          return;
        }

        case "ADMIN_LOCK": {
          await chrome.storage.session.remove(["adminToken", "adminTokenExpiresAt"]);
          sendResponse({ ok: true });
          return;
        }

        case "ADMIN_OTP_START": {
          const token = await getAccessToken();
          if (!token) {
            sendResponse({ ok: false, error: "Nejsi spárovaný s HypoManagerem." });
            return;
          }
          const API_BASE = await getApiBase();
          const res = await fetch(`${API_BASE}/api/integrations/browser-extension/admin/start`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            sendResponse({ ok: false, error: (data as { error?: string }).error ?? res.statusText });
            return;
          }
          sendResponse({ ok: true, expiresAt: (data as any).expiresAt, delivered: (data as any).delivered });
          return;
        }

        case "ADMIN_OTP_CONFIRM": {
          const code = String((message as { code: string }).code ?? "").trim();
          const token = await getAccessToken();
          if (!token) {
            sendResponse({ ok: false, error: "Nejsi spárovaný s HypoManagerem." });
            return;
          }
          const API_BASE = await getApiBase();
          const res = await fetch(`${API_BASE}/api/integrations/browser-extension/admin/confirm`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ code }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            sendResponse({ ok: false, error: (data as { error?: string }).error ?? res.statusText });
            return;
          }
          const adminToken = (data as any).adminToken as string;
          const adminTokenExpiresAt = (data as any).adminTokenExpiresAt as string;
          await chrome.storage.session.set({ adminToken, adminTokenExpiresAt });
          sendResponse({ ok: true, adminTokenExpiresAt });
          return;
        }

        default:
          sendResponse({
            ok: false,
            error: msgType === undefined ? "Chybí typ zprávy. Obnov rozšíření (chrome://extensions → Obnovit)." : `Neznámý typ zprávy: ${String(msgType)}`,
          });
      }
    })().catch((err) => sendResponse({ ok: false, error: String(err) }));

    return true; // keep channel open for async response
  }
);

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "fill-all") {
    try {
      const tabId = await getActiveTabId();
      const payload = await buildFillRequest({ mode: { kind: "all" }, tabId });
      await sendToTabWithInjection(tabId, payload);
    } catch (_e) {
      // tab nemusí být stránka s formulářem nebo chybí oprávnění
    }
  }
  if (command === "next-applicant") {
    const idx = await getApplicantIndex();
    const next = (idx + 1) % 4;
    await chrome.storage.session.set({ applicantIndex: next });
  }
});
