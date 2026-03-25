export {};

const ADMIN_MAPPING_KEY = "adminMappingTools";
const API_BASE_URL_KEY = "apiBaseUrl";

const checkbox = document.getElementById("admin-mapping-tools") as HTMLInputElement | null;
const apiBaseInput = document.getElementById("api-base-url") as HTMLInputElement | null;
const adminSwitch = document.getElementById("admin-mapping-switch") as HTMLButtonElement | null;
const apiStatus = document.getElementById("api-url-status") as HTMLElement | null;

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function updateApiStatus(url: string) {
  if (!apiStatus) return;
  const value = url.trim();
  if (!value) {
    apiStatus.className = "status";
    apiStatus.textContent = "";
    return;
  }
  if (isValidUrl(value)) {
    apiStatus.className = "status show valid";
    apiStatus.textContent = "URL je ve správném formátu.";
  } else {
    apiStatus.className = "status show invalid";
    apiStatus.textContent = "Neplatná URL. Použij například https://api.hypomanazer.cz.";
  }
}

function updateSwitchVisual(enabled: boolean) {
  if (!adminSwitch) return;
  adminSwitch.classList.toggle("on", enabled);
  adminSwitch.setAttribute("aria-pressed", enabled ? "true" : "false");
}

async function load() {
  const out = await chrome.storage.local.get([ADMIN_MAPPING_KEY, API_BASE_URL_KEY]);
  const enabled = !!out[ADMIN_MAPPING_KEY];
  if (checkbox) checkbox.checked = enabled;
  updateSwitchVisual(enabled);
  const url = (out[API_BASE_URL_KEY] as string) || "";
  if (apiBaseInput) apiBaseInput.value = url;
  updateApiStatus(url);
}

function saveAdmin(value: boolean) {
  chrome.storage.local.set({ [ADMIN_MAPPING_KEY]: value });
  if (checkbox) checkbox.checked = value;
  updateSwitchVisual(value);
}

function saveApiBase() {
  const url = apiBaseInput?.value?.trim() || "";
  chrome.storage.local.set({ [API_BASE_URL_KEY]: url });
  updateApiStatus(url);
}

checkbox?.addEventListener("change", () => saveAdmin(checkbox.checked));
apiBaseInput?.addEventListener("change", saveApiBase);
apiBaseInput?.addEventListener("blur", saveApiBase);
apiBaseInput?.addEventListener("input", () => updateApiStatus(apiBaseInput.value));
adminSwitch?.addEventListener("click", () => saveAdmin(!(checkbox?.checked ?? false)));

load();
