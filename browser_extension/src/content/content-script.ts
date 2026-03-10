/**
 * HypoManager Bank Autofill – content script
 * Běží na bankovních doménách, vyplňuje pole podle FILL_REQUEST, vrací FillResult.
 * Prohledává i same-origin iframe (formuláře často bývají uvnitř iframe).
 */
import type { FillRequest, FillResult } from "../types.js";
import type { BankMappingPack } from "../types.js";
import {
  pickFirstExisting,
  findInputByLabel,
  setValueWithEvents,
  setSelectValue,
  resolveValue,
  applyTransforms,
  waitForAnySelector,
} from "./fieldEngine.js";
import { getPackForPage } from "./mappingPacks.js";

const SPA_WAIT_MS = 6000;

/** Vrátí všechny selektory z packu (detectAny + pole), aby jsme na ně mohli počkat. */
function getAllSelectors(pack: BankMappingPack): string[] {
  const set = new Set<string>();
  for (const step of pack.steps) {
    step.detectAny.forEach((s) => set.add(s));
    for (const f of step.fields) f.selectors.forEach((s) => set.add(s));
  }
  return [...set];
}

function runFillInDocument(
  req: FillRequest,
  pack: BankMappingPack,
  root: Document
): { filled: FillResult["filled"]; missing: FillResult["missing"]; errors: FillResult["errors"] } {
  const filled: FillResult["filled"] = [];
  const missing: FillResult["missing"] = [];
  const errors: FillResult["errors"] = [];
  const { fillModel, applicantIndex, mode } = req;

  for (const step of pack.steps) {
    const detectEl = pickFirstExisting(step.detectAny, root);
    if (!detectEl && mode.kind === "all") continue;

    for (const field of step.fields) {
      if (mode.kind === "field" && mode.fieldId !== field.fieldId) continue;
      if (mode.kind === "section" && mode.sectionId !== step.stepId) continue;

      let el: Element | null = pickFirstExisting(field.selectors, root);
      if (!el && field.label) el = findInputByLabel(root, field.label);
      if (!el) {
        missing.push({ fieldId: field.fieldId, label: field.label, reason: "not_found" });
        continue;
      }

      const raw = resolveValue(fillModel, applicantIndex, field.valueFrom);
      if (raw === undefined || raw === null) {
        missing.push({ fieldId: field.fieldId, label: field.label, reason: "not_found" });
        continue;
      }

      const value = applyTransforms(String(raw), field.transform);

      try {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          if (el.readOnly) {
            missing.push({ fieldId: field.fieldId, label: field.label, reason: "readonly" });
            continue;
          }
          setValueWithEvents(el, value);
        } else if (el instanceof HTMLSelectElement) {
          setSelectValue(el, value);
        } else {
          missing.push({ fieldId: field.fieldId, label: field.label, reason: "not_found" });
          continue;
        }
        filled.push({ fieldId: field.fieldId, label: field.label });
      } catch (err) {
        errors.push({ fieldId: field.fieldId, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  return { filled, missing, errors };
}

async function runFill(req: FillRequest): Promise<FillResult> {
  const startedAt = new Date().toISOString();
  const filled: FillResult["filled"] = [];
  const missing: FillResult["missing"] = [];
  const errors: FillResult["errors"] = [];

  const { bankId, mode } = req;
  const pack: BankMappingPack | null =
    req.pack ?? getPackForPage(window.location.hostname, window.location.pathname);

  if (!pack) {
    errors.push({ error: `Pro tuto stránku (${window.location.hostname}) není k dispozici mapping. Otevři testovací stránku: http://localhost:4000/test-autofill.html` });
    return {
      type: "FILL_RESULT",
      requestId: req.requestId,
      bankId,
      filled,
      missing,
      errors,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  }

  const docs: Document[] = [document];
  try {
    document.querySelectorAll("iframe").forEach((frame) => {
      try {
        const doc = frame.contentDocument;
        if (doc) docs.push(doc);
      } catch {
        // cross-origin iframe – contentDocument není dostupný
      }
    });
  } catch {
    // ignore
  }

  const allSelectors = getAllSelectors(pack);
  let best = { filled: [] as FillResult["filled"], missing: [] as FillResult["missing"], errors: [] as FillResult["errors"] };

  for (const doc of docs) {
    if (allSelectors.length === 0) {
      const result = runFillInDocument(req, pack, doc);
      if (result.filled.length + result.missing.length > best.filled.length + best.missing.length) best = result;
      continue;
    }
    try {
      await waitForAnySelector(allSelectors, SPA_WAIT_MS, doc);
    } catch {
      continue;
    }
    const result = runFillInDocument(req, pack, doc);
    if (result.filled.length + result.missing.length > best.filled.length + best.missing.length) {
      best = result;
    }
  }
  filled.push(...best.filled);
  missing.push(...best.missing);
  errors.push(...best.errors);

  const finishedAt = new Date().toISOString();
  return {
    type: "FILL_RESULT",
    requestId: req.requestId,
    bankId: pack.bankId,
    filled,
    missing,
    errors,
    startedAt,
    finishedAt,
  };
}

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (r: unknown) => void) => {
    (async () => {
      if (message && typeof message === "object" && "type" in message && (message as { type: string }).type !== "FILL_REQUEST") {
        sendResponse({ ok: false, error: "Unsupported" });
        return;
      }
      const req = message as FillRequest;
      const result = await runFill(req);
      sendResponse(result);
    })().catch((err) =>
      sendResponse({
        type: "FILL_RESULT",
        requestId: (message as FillRequest)?.requestId ?? "unknown",
        bankId: (message as FillRequest)?.bankId ?? "unknown",
        filled: [],
        missing: [],
        errors: [{ error: String(err) }],
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      } as FillResult)
    );
    return true;
  }
);
