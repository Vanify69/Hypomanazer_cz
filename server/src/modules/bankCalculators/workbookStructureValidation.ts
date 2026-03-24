import type { BankMappingConfig, CellRef } from "./types.js";
import { ExcelJsWorkbookDriver } from "./excelJsWorkbookDriver.js";
import { isPlaceholderCell, isPlaceholderSheet } from "./excelMapping.js";

function collectRefs(mapping: BankMappingConfig): CellRef[] {
  const refs: CellRef[] = [];
  for (const ref of Object.values(mapping.inputs)) {
    if (ref) refs.push(ref);
  }
  for (const ref of Object.values(mapping.outputs)) {
    if (ref) refs.push(ref);
  }
  return refs;
}

/**
 * Ověří, že v workbooku existují listy a buňky z mapování (ExcelJS / OOXML).
 * Přeskakuje zástupné TODO_* listy a buňky.
 */
export async function validateWorkbookStructure(
  buffer: Buffer,
  mapping: BankMappingConfig
): Promise<{ ok: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const driver = new ExcelJsWorkbookDriver();

  try {
    await driver.loadFromBuffer(buffer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      errors: [`Soubor nelze načíst jako Excel (OOXML): ${msg}`],
      warnings: [],
    };
  }

  const refs = collectRefs(mapping);
  let skipped = 0;
  for (const ref of refs) {
    if (isPlaceholderSheet(ref.sheet) || isPlaceholderCell(ref.cell)) {
      skipped++;
      continue;
    }
    if (!driver.hasSheet(ref.sheet)) {
      errors.push(`Chybí list „${ref.sheet}“ (buňka ${ref.cell}).`);
      continue;
    }
    try {
      driver.getCellRawValue(ref);
    } catch {
      errors.push(`Neplatná adresa buňky „${ref.sheet}!${ref.cell}“.`);
    }
  }

  if (skipped > 0) {
    warnings.push(
      `${skipped} položek mapování má zástupný list/buňku (TODO_*) – doplňte reálné adresy v rb.mapping.ts / ucb.mapping.ts.`
    );
  }

  if (refs.length > 0 && skipped === refs.length) {
    warnings.push("Všechny položky mapování jsou zástupné – struktura šablony se neověřuje.");
  }

  return { ok: errors.length === 0, errors, warnings };
}
