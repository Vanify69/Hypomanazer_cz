import type { WorkbookHandle } from "./types.js";

/**
 * Abstrakce přepočtu workbooku (.xlsm + makra).
 * TODO: Implementace přes Excel COM (desktop) nebo Windows worker – viz mock níže.
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
