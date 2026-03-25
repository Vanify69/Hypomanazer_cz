/**
 * HypoManager Bank Autofill – popup UI
 * Pairing, výběr žadatele, akce vyplnění, zobrazení reportu, admin: procházení DOM a export mapping packu.
 */

export {};

const pairForm = document.getElementById("pair-form") as HTMLFormElement | null;
const pairCodeInput = document.getElementById("pair-code") as HTMLInputElement | null;
const pairStatus = document.getElementById("pair-status") as HTMLElement | null;
const loadCaseBtn = document.getElementById("load-case") as HTMLButtonElement | null;
const fillAllBtn = document.getElementById("fill-all") as HTMLButtonElement | null;
const caseInfo = document.getElementById("case-info") as HTMLElement | null;
const fillReport = document.getElementById("fill-report") as HTMLElement | null;
const adminSection = document.getElementById("admin-mapping-section") as HTMLElement | null;
const domScanBtn = document.getElementById("dom-scan-btn") as HTMLButtonElement | null;
const domScanStatus = document.getElementById("dom-scan-status") as HTMLElement | null;
const domMappingList = document.getElementById("dom-mapping-list") as HTMLElement | null;
const exportMappingBtn = document.getElementById("export-mapping-btn") as HTMLButtonElement | null;
const sendMappingBtn = document.getElementById("send-mapping-btn") as HTMLButtonElement | null;
const sendMappingStatus = document.getElementById("send-mapping-status") as HTMLElement | null;
const exportOutput = document.getElementById("export-output") as HTMLTextAreaElement | null;
const adminSendCodeBtn = document.getElementById("admin-send-code-btn") as HTMLButtonElement | null;
const adminOtpCodeInput = document.getElementById("admin-otp-code") as HTMLInputElement | null;
const adminVerifyCodeBtn = document.getElementById("admin-verify-code-btn") as HTMLButtonElement | null;
const adminLockBtn = document.getElementById("admin-lock-btn") as HTMLButtonElement | null;
const adminLockStatus = document.getElementById("admin-lock-status") as HTMLElement | null;

const MAPPING_PATH_OPTIONS: { value: string; label: string; source: "applicant" | "loan" | "property"; path: string }[] = [
  { value: "", label: "— nemapovat", source: "applicant", path: "" },
  { value: "applicant.firstName", label: "Jméno", source: "applicant", path: "firstName" },
  { value: "applicant.lastName", label: "Příjmení", source: "applicant", path: "lastName" },
  { value: "applicant.birthNumber", label: "Rodné číslo", source: "applicant", path: "birthNumber" },
  { value: "applicant.dateOfBirth", label: "Datum narození", source: "applicant", path: "dateOfBirth" },
  { value: "applicant.address", label: "Adresa", source: "applicant", path: "address" },
  { value: "applicant.income.netMonthly", label: "Příjmy (měsíc)", source: "applicant", path: "income.netMonthly" },
  { value: "applicant.expenses.totalMonthly", label: "Výdaje (měsíc)", source: "applicant", path: "expenses.totalMonthly" },
  { value: "loan.amount", label: "Výše úvěru", source: "loan", path: "amount" },
  { value: "loan.purpose", label: "Účel úvěru", source: "loan", path: "purpose" },
  { value: "property.value", label: "Odhad ceny nemovitosti", source: "property", path: "value" },
];

/** Klíčová slova pro auto-navržení fieldId podle textu labelu (normalizovaná: lowercase, bez diakritiky). */
const LABEL_KEYWORDS: { value: string; keywords: string[] }[] = [
  { value: "applicant.firstName", keywords: ["jmeno", "krestni", "first name", "jmeno zadatele"] },
  { value: "applicant.lastName", keywords: ["prijmeni", "last name", "příjmení", "prijmeni zadatele"] },
  { value: "applicant.birthNumber", keywords: ["rodne cislo", "rc", "birth number", "rodné číslo"] },
  { value: "applicant.dateOfBirth", keywords: ["datum narozeni", "datum narození", "date of birth", "narozen"] },
  { value: "applicant.address", keywords: ["adresa", "address", "ulice", "mesto", "psc", "obec"] },
  { value: "applicant.income.netMonthly", keywords: ["prijmy", "příjmy", "income", "mesic", "měsíc", "cisty"] },
  { value: "applicant.expenses.totalMonthly", keywords: ["vydaje", "výdaje", "expenses", "mesicni"] },
  { value: "loan.amount", keywords: ["vyse uveru", "výše úvěru", "castka", "částka", "amount", "kc", "kč"] },
  { value: "loan.purpose", keywords: ["ucel", "účel", "purpose", "finalita"] },
  { value: "property.value", keywords: ["cena nemovitosti", "odhad", "odhad ceny", "property", "hodnota"] },
];

function normalizeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Navrhne fieldId podle textu labelu/placeholder z naskenovaného pole. */
function suggestFieldId(labelText: string, placeholderOrName?: string): string {
  const combined = `${labelText} ${placeholderOrName ?? ""}`.trim();
  const norm = normalizeForMatch(combined);
  if (!norm) return "";
  let best = "";
  let bestScore = 0;
  for (const { value, keywords } of LABEL_KEYWORDS) {
    for (const kw of keywords) {
      const kwNorm = normalizeForMatch(kw);
      if (!kwNorm) continue;
      if (norm.includes(kwNorm) || kwNorm.includes(norm)) {
        const score = Math.min(norm.length, kwNorm.length);
        if (score > bestScore) {
          bestScore = score;
          best = value;
        }
      }
    }
  }
  return best;
}

type ScanField = { selector: string; label: string; tagName: string; name: string; id: string; type: string };
let lastScanData: { url: string; hostname: string; pathname: string; fields: ScanField[] } | null = null;
const fieldMappingChoices: Record<number, string> = {};

function showPairStatus(paired: boolean) {
  if (!pairStatus) return;
  pairStatus.textContent = paired ? "Spárováno s HypoManagerem" : "Není spárováno";
  pairStatus.className = paired ? "status-chip ok" : "status-chip warn";
}

function showAdminLockStatus(text: string) {
  if (!adminLockStatus) return;
  adminLockStatus.textContent = text;
}

function setAdminControlsEnabled(enabled: boolean) {
  if (domScanBtn) domScanBtn.disabled = !enabled;
  if (exportMappingBtn) exportMappingBtn.disabled = !enabled;
  if (sendMappingBtn) sendMappingBtn.disabled = !enabled;
  if (adminOtpCodeInput) adminOtpCodeInput.disabled = enabled;
  if (adminVerifyCodeBtn) adminVerifyCodeBtn.disabled = enabled;
  if (adminLockBtn) adminLockBtn.disabled = !enabled;
}

async function init() {
  const res = await chrome.runtime.sendMessage({ type: "PAIR_STATUS" });
  showPairStatus(res?.paired ?? false);
  const { adminMappingTools } = await chrome.storage.local.get("adminMappingTools");
  if (adminSection) adminSection.hidden = !adminMappingTools;
  if (!adminMappingTools) return;
  const status = await chrome.runtime.sendMessage({ type: "ADMIN_STATUS" });
  if (status?.ok && status.unlocked) {
    showAdminLockStatus(`Admin režim je odemčený do ${new Date(status.expiresAt).toLocaleString("cs-CZ")}.`);
    setAdminControlsEnabled(true);
  } else {
    showAdminLockStatus("Admin režim je zamčený. Klikni „Poslat kód“, pak zadej kód z e‑mailu.");
    setAdminControlsEnabled(false);
  }
}

pairForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = pairCodeInput?.value?.trim();
  if (!code) return;
  const res = await chrome.runtime.sendMessage({ type: "PAIR_SUBMIT_CODE", code });
  if (res?.ok) {
    showPairStatus(true);
    pairCodeInput!.value = "";
  } else {
    pairStatus!.textContent = "Chyba: " + (res?.error ?? "neznámá");
    pairStatus!.className = "status-chip error";
  }
});

loadCaseBtn?.addEventListener("click", async () => {
  if (!caseInfo) return;
  caseInfo.textContent = "Načítám…";
  const res = await chrome.runtime.sendMessage({ type: "GET_ACTIVE_CASE" });
  if (res?.ok && res.model) {
    const m = res.model;
    caseInfo.textContent = `Případ ${m.caseId} · ${m.applicants?.length ?? 0} žadatel(é)`;
  } else {
    caseInfo.textContent = res?.error ?? "Žádný aktivní případ";
  }
});

fillAllBtn?.addEventListener("click", async () => {
  if (!fillReport) return;
  fillReport.textContent = "Vyplňuji…";
  const res = await chrome.runtime.sendMessage({ type: "FILL_ALL" });
  if (res?.ok && res.result) {
    const r = res.result;
    const filled = r.filled?.length ?? 0;
    const missing = r.missing?.length ?? 0;
    const errors = r.errors?.length ?? 0;
    fillReport.innerHTML = [
      `<strong>Vyplněno:</strong> ${filled}`,
      `<strong>Nenalezeno:</strong> ${missing}`,
      `<strong>Chyby:</strong> ${errors}`,
    ].join(" · ");
  } else {
    fillReport.textContent = "Chyba: " + (res?.error ?? "neznámá");
  }
});

// --- Admin: procházení DOM a export mapping packu ---
domScanBtn?.addEventListener("click", async () => {
  if (!domScanStatus || !domMappingList) return;
  domScanStatus.textContent = "Načítám pole ze stránky…";
  domMappingList.innerHTML = "";
  lastScanData = null;
  Object.keys(fieldMappingChoices).forEach((k) => delete fieldMappingChoices[Number(k)]);
  if (exportMappingBtn) exportMappingBtn.disabled = true;
  if (sendMappingBtn) sendMappingBtn.disabled = true;
  if (exportOutput) exportOutput.value = "";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    domScanStatus.textContent = "Žádná aktivní záložka.";
    return;
  }
  const res = await chrome.runtime.sendMessage({ type: "RUN_DOM_SCAN", tabId: tab.id });
  if (!res?.ok) {
    domScanStatus.textContent = "Chyba: " + (res?.error ?? "neznámá");
    return;
  }
  const data = res.data as { url: string; hostname: string; pathname: string; fields: ScanField[] } | null;
  lastScanData = data;
  if (!data?.fields?.length) {
    domScanStatus.textContent = `Nalezeno 0 polí (${data?.hostname ?? ""}${data?.pathname ?? ""})`;
    return;
  }
  domScanStatus.textContent = `Nalezeno ${data.fields.length} polí (${data.hostname}${data.pathname})`;
  if (exportMappingBtn) exportMappingBtn.disabled = false;
  if (sendMappingBtn) sendMappingBtn.disabled = false;
  if (sendMappingStatus) sendMappingStatus.textContent = "";

  data.fields.forEach((f: ScanField, i: number) => {
    const row = document.createElement("div");
    row.className = "dom-row";
    const sel = document.createElement("span");
    sel.className = "sel";
    sel.title = f.selector;
    sel.textContent = f.label || f.selector || `#${i}`;
    const select = document.createElement("select");
    select.dataset.index = String(i);
    MAPPING_PATH_OPTIONS.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      select.appendChild(o);
    });
    const suggested = suggestFieldId(f.label, f.name);
    if (suggested) {
      select.value = suggested;
      fieldMappingChoices[i] = suggested;
    }
    select.addEventListener("change", () => {
      fieldMappingChoices[i] = select.value;
    });
    row.appendChild(sel);
    row.appendChild(select);
    domMappingList.appendChild(row);
  });
});

function buildPackFromScanData(): Record<string, unknown> | null {
  if (!lastScanData) return null;
  const hostname = lastScanData.hostname.replace(/^www\./, "");
  const pathPart = lastScanData.pathname || "/";
  const fields = lastScanData.fields
    .map((f, i) => ({ ...f, mapping: fieldMappingChoices[i] }))
    .filter((f) => f.mapping);
  if (!fields.length) return null;
  const valueFrom = (val: string) => {
    if (!val) return null;
    const opt = MAPPING_PATH_OPTIONS.find((o) => o.value === val);
    if (!opt || !opt.path) return null;
    return { source: opt.source, path: opt.path };
  };
  const looksLikeDynamicId = (sel: string) => /#f_[a-f0-9-]{30,}/i.test(sel);
  const useStableDetect = fields.some((f) => looksLikeDynamicId(f.selector));
  const detectAny = useStableDetect ? ["#q-app"] : fields.slice(0, 2).map((f) => f.selector);

  return {
    bankId: hostname.split(".")[0] || "bank",
    version: `${hostname}-${new Date().toISOString().slice(0, 10)}`,
    match: { hostnames: [hostname], pathIncludes: [pathPart] },
    steps: [
      {
        stepId: "main",
        detectAny: detectAny.length ? detectAny : ["#q-app"],
        fields: fields.map((f) => ({
          fieldId: (f.mapping as string).replace(/\./g, "_"),
          label: f.label || f.selector,
          selectors: [f.selector],
          kind: f.tagName === "select" ? "select" : f.type === "number" ? "number" : "text",
          valueFrom: valueFrom(f.mapping as string),
        })),
      },
    ],
  };
}

exportMappingBtn?.addEventListener("click", () => {
  const pack = buildPackFromScanData();
  if (!exportOutput) return;
  if (!pack) {
    exportOutput.value = "Nejdříve namapuj alespoň jedno pole.";
    return;
  }
  exportOutput.value = JSON.stringify(pack, null, 2);
});

sendMappingBtn?.addEventListener("click", async () => {
  const pack = buildPackFromScanData();
  if (!pack || !sendMappingStatus) {
    if (sendMappingStatus && !pack) sendMappingStatus.textContent = "Nejdříve namapuj alespoň jedno pole.";
    return;
  }
  sendMappingStatus.textContent = "Odesílám…";
  sendMappingStatus.className = "send-status";
  const res = await chrome.runtime.sendMessage({ type: "SEND_MAPPING", pack });
  if (res?.ok) {
    sendMappingStatus.textContent = `Uloženo pro ${res.hostname ?? ""}${res.pathPrefix ?? ""}. Na této stránce bude rozšíření používat tento mapping.`;
    sendMappingStatus.className = "send-status ok";
  } else {
    sendMappingStatus.textContent = "Chyba: " + (res?.error ?? "neznámá");
    sendMappingStatus.className = "send-status error";
  }
});

adminSendCodeBtn?.addEventListener("click", async () => {
  showAdminLockStatus("Odesílám kód na e‑mail…");
  const res = await chrome.runtime.sendMessage({ type: "ADMIN_OTP_START" });
  if (res?.ok) {
    const exp = res.expiresAt ? new Date(res.expiresAt).toLocaleString("cs-CZ") : "";
    showAdminLockStatus(`Kód byl odeslán na e‑mail. Platnost do ${exp}.`);
  } else {
    showAdminLockStatus("Chyba: " + (res?.error ?? "neznámá"));
  }
});

adminVerifyCodeBtn?.addEventListener("click", async () => {
  const code = adminOtpCodeInput?.value?.trim() ?? "";
  if (!code) {
    showAdminLockStatus("Zadej kód z e‑mailu.");
    return;
  }
  showAdminLockStatus("Ověřuji kód…");
  const res = await chrome.runtime.sendMessage({ type: "ADMIN_OTP_CONFIRM", code });
  if (res?.ok) {
    if (adminOtpCodeInput) adminOtpCodeInput.value = "";
    const exp = res.adminTokenExpiresAt ? new Date(res.adminTokenExpiresAt).toLocaleString("cs-CZ") : "";
    showAdminLockStatus(`Admin režim je odemčený do ${exp}.`);
    setAdminControlsEnabled(true);
  } else {
    showAdminLockStatus("Chyba: " + (res?.error ?? "neznámá"));
  }
});

adminLockBtn?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "ADMIN_LOCK" });
  showAdminLockStatus("Admin režim je zamčený.");
  setAdminControlsEnabled(false);
});

init();
