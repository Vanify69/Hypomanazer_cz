export {};

const ADMIN_MAPPING_KEY = "adminMappingTools";
const API_BASE_URL_KEY = "apiBaseUrl";
const ADMIN_PASSWORD_HASH_KEY = "adminPasswordHash";

const checkbox = document.getElementById("admin-mapping-tools") as HTMLInputElement | null;
const apiBaseInput = document.getElementById("api-base-url") as HTMLInputElement | null;
const adminPasswordInput = document.getElementById("admin-password") as HTMLInputElement | null;
const setAdminPasswordBtn = document.getElementById("set-admin-password") as HTMLButtonElement | null;
const clearAdminPasswordBtn = document.getElementById("clear-admin-password") as HTMLButtonElement | null;
const adminPasswordStatus = document.getElementById("admin-password-status") as HTMLElement | null;

async function load() {
  const out = await chrome.storage.local.get([ADMIN_MAPPING_KEY, API_BASE_URL_KEY, ADMIN_PASSWORD_HASH_KEY]);
  if (checkbox) checkbox.checked = !!out[ADMIN_MAPPING_KEY];
  if (apiBaseInput) apiBaseInput.value = (out[API_BASE_URL_KEY] as string) || "";
  if (adminPasswordStatus) {
    adminPasswordStatus.textContent = out[ADMIN_PASSWORD_HASH_KEY]
      ? "Heslo je nastavené."
      : "Heslo není nastavené.";
  }
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

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

setAdminPasswordBtn?.addEventListener("click", async () => {
  const pwd = adminPasswordInput?.value ?? "";
  if (pwd.trim().length < 6) {
    if (adminPasswordStatus) adminPasswordStatus.textContent = "Heslo musí mít alespoň 6 znaků.";
    return;
  }
  const hash = await sha256Hex(pwd.trim());
  await chrome.storage.local.set({ [ADMIN_PASSWORD_HASH_KEY]: hash });
  if (adminPasswordInput) adminPasswordInput.value = "";
  if (adminPasswordStatus) adminPasswordStatus.textContent = "Heslo uloženo. Admin sekce bude vyžadovat odemčení.";
});

clearAdminPasswordBtn?.addEventListener("click", async () => {
  await chrome.storage.local.remove(ADMIN_PASSWORD_HASH_KEY);
  if (adminPasswordInput) adminPasswordInput.value = "";
  if (adminPasswordStatus) adminPasswordStatus.textContent = "Heslo odebráno.";
});

load();
