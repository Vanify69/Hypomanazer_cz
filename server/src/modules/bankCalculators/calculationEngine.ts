import type { WorkbookHandle } from "./types.js";

/**
 * Abstrakce přepočtu workbooku (.xlsm + makra).
 * Plný přepočet: nastavte EXCEL_WORKER_URL na službu windows-excel-worker (COM + Excel na Windows).
 * Bez něj se používá MockCalculationEngine – výstupy z šablony mohou číst ExcelJS (bez přepočtu vzorců).
 */
export interface CalculationEngine {
  recalculate(handle: WorkbookHandle): Promise<void>;
}

export class MockCalculationEngine implements CalculationEngine {
  async recalculate(_handle: WorkbookHandle): Promise<void> {
    // TODO: Nahradit skutečným přepočtem šablony (makra / full calculation).
    void _handle;
  }
}
