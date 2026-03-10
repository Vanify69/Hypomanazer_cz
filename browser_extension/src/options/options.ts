const ADMIN_MAPPING_KEY = "adminMappingTools";

const checkbox = document.getElementById("admin-mapping-tools") as HTMLInputElement | null;

async function load() {
  const out = await chrome.storage.local.get(ADMIN_MAPPING_KEY);
  if (checkbox) checkbox.checked = !!out[ADMIN_MAPPING_KEY];
}

function save(value: boolean) {
  chrome.storage.local.set({ [ADMIN_MAPPING_KEY]: value });
}

checkbox?.addEventListener("change", () => save(checkbox.checked));
load();
