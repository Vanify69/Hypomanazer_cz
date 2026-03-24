import type { CellRef } from "./types.js";

/**
 * Abstrakce nad konkrétní knihovnou (ExcelJS) nebo COM – zápis/čtení buněk.
 */
export interface ExcelWorkbookDriver {
  loadFromBuffer(buffer: Buffer): Promise<void>;
  getSheetNames(): string[];
  hasSheet(name: string): boolean;
  setCellValue(ref: CellRef, value: string | number | boolean | null): void;
  getCellRawValue(ref: CellRef): unknown;
  writeToBuffer(): Promise<Buffer>;
}
