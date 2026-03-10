/**
 * Field engine – hledání polí, nastavení hodnot včetně React-friendly eventů.
 */
import type { FillModel } from "../types.js";

export function pickFirstExisting(selectors: string[], root: Document | Element = document): Element | null {
  for (const s of selectors) {
    try {
      const el = root.querySelector(s);
      if (el) return el;
    } catch {
      // neplatný selektor
    }
  }
  return null;
}

/** Normalizuje text pro porovnání (lowercase, bez diakritiky, zmenšené mezery). */
function normalizeLabelText(s: string): string {
  const t = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return t;
}

/**
 * Najde input/select/textarea podle textu přidruženého labelu.
 * Použitelné tam, kde ID mění (např. SPA s dynamickými UUID).
 * Hledá <label> s textem obsahujícím hledaný text (nebo naopak) a vrátí přidružený prvek.
 */
export function findInputByLabel(
  root: Document | Element,
  labelSearchText: string
): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  const doc = root instanceof Document ? root : root.ownerDocument ?? document;
  const container = root instanceof Document ? root.body : root;
  if (!container) return null;

  const searchNorm = normalizeLabelText(labelSearchText);
  if (!searchNorm) return null;

  const labels = Array.from(container.querySelectorAll("label"));
  for (const label of labels) {
    const labelText = (label.textContent ?? "").trim();
    const labelNorm = normalizeLabelText(labelText);
    if (!labelNorm) continue;
    // Shoda: hledaný text je obsažen v labelu nebo label je obsažen v hledaném textu (např. "Výše úvěru" vs "KčVýše úvěru")
    if (!labelNorm.includes(searchNorm) && !searchNorm.includes(labelNorm)) continue;

    let input: Element | null = null;
    if (label.htmlFor && doc) {
      const byId = doc.getElementById(label.htmlFor);
      if (byId && container.contains(byId)) input = byId;
    }
    if (!input) input = label.querySelector("input, select, textarea");
    if (!input) {
      const next = label.nextElementSibling;
      if (next?.matches?.("input, select, textarea")) input = next;
    }
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement) {
      return input;
    }
  }
  return null;
}

export function waitForAnySelector(
  selectors: string[],
  timeoutMs = 8000,
  root: Document | Element = document
): Promise<Element> {
  const existing = pickFirstExisting(selectors, root);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const obs = new MutationObserver(() => {
      const el = pickFirstExisting(selectors, root);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });
    obs.observe(root === document ? document.documentElement : root, {
      childList: true,
      subtree: true,
    });
    const t = setTimeout(() => {
      obs.disconnect();
      reject(new Error(`Timeout: žádný z selektorů nenalezen: ${selectors.slice(0, 2).join(", ")}`));
    }, timeoutMs);
  });
}

function getNativeInputValueSetter(el: HTMLInputElement | HTMLTextAreaElement): ((v: string) => void) | undefined {
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  return desc?.set as ((v: string) => void) | undefined;
}

export function setValueWithEvents(el: Element, value: string): void {
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
    throw new Error("setValueWithEvents: element musí být input nebo textarea");
  }
  const setter = getNativeInputValueSetter(el);
  if (setter) setter.call(el, value);
  else (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function setSelectValue(el: Element, value: string): void {
  if (!(el instanceof HTMLSelectElement)) throw new Error("setSelectValue: element musí být select");
  el.value = value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

export function resolveValue(
  fillModel: FillModel,
  applicantIndex: number,
  valueFrom: { source: string; path?: string; value?: string | number }
): string | number | undefined {
  if (valueFrom.source === "const" && valueFrom.value !== undefined) {
    return String(valueFrom.value);
  }
  if (valueFrom.source === "applicant" && valueFrom.path) {
    const applicant = fillModel.applicants?.[applicantIndex];
    if (!applicant) return undefined;
    const v = getByPath(applicant, valueFrom.path);
    if (v === undefined || v === null) return undefined;
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o.street !== undefined || o.city !== undefined || o.zip !== undefined) {
        const parts = [o.street, o.houseNumber, o.zip, o.city].filter(Boolean).map(String);
        return parts.join(", ");
      }
      return JSON.stringify(v);
    }
    return String(v);
  }
  if (valueFrom.source === "loan" && valueFrom.path && fillModel.loan) {
    const v = getByPath(fillModel.loan, valueFrom.path);
    if (v === undefined || v === null) return undefined;
    return String(v);
  }
  if (valueFrom.source === "property" && valueFrom.path && fillModel.property) {
    const v = getByPath(fillModel.property, valueFrom.path);
    if (v === undefined || v === null) return undefined;
    return String(v);
  }
  return undefined;
}

export function applyTransforms(
  value: string,
  transforms?: Array<"trim" | "upper" | "digitsOnly">
): string {
  let out = value;
  if (!transforms?.length) return out;
  for (const t of transforms) {
    if (t === "trim") out = out.trim();
    else if (t === "upper") out = out.toUpperCase();
    else if (t === "digitsOnly") out = out.replace(/\D/g, "");
  }
  return out;
}
