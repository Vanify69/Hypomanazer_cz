export {};

const ADMIN_MAPPING_KEY = "adminMappingTools";
const API_BASE_URL_KEY = "apiBaseUrl";

const checkbox = document.getElementById("admin-mapping-tools") as HTMLInputElement | null;
const apiBaseInput = document.getElementById("api-base-url") as HTMLInputElement | null;

async function load() {
  const out = await chrome.storage.local.get([ADMIN_MAPPING_KEY, API_BASE_URL_KEY]);
  if (checkbox) checkbox.checked = !!out[ADMIN_MAPPING_KEY];
  if (apiBaseInput) apiBaseInput.value = (out[API_BASE_URL_KEY] as string) || "";
}

function saveAdmin(value: boolean) {
  chrome.storage.local.set({ [ADMIN_MAPPING_KEY]: value });
}

function saveApiBase() {
  const url = apiBaseInput?.value?.trim() || "";
  chrome.storage.local.set({ [API_BASE_URL_KEY]: url });
}

checkbox?.addEventListener("change", () => saveAdmin(checkbox.checked));
apiBaseInput?.addEventListener("change", saveApiBase);
apiBaseInput?.addEventListener("blur", saveApiBase);

load();
