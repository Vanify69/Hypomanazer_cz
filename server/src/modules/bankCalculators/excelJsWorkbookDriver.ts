import ExcelJS from "exceljs";
import type { CellRef } from "./types.js";
import type { ExcelWorkbookDriver } from "./excelWorkbookDriver.js";

export class ExcelJsWorkbookDriver implements ExcelWorkbookDriver {
  private wb = new ExcelJS.Workbook();

  async loadFromBuffer(buffer: Buffer): Promise<void> {
    // exceljs očekává vlastní typ Buffer – Node Buffer předáváme přes unknown
    await this.wb.xlsx.load(Buffer.from(buffer) as unknown as ExcelJS.Buffer);
  }

  getSheetNames(): string[] {
    return this.wb.worksheets.map((ws) => ws.name);
  }

  hasSheet(name: string): boolean {
    return this.wb.getWorksheet(name) != null;
  }

  setCellValue(ref: CellRef, value: string | number | boolean | null): void {
    const ws = this.wb.getWorksheet(ref.sheet);
    if (!ws) throw new Error(`List neexistuje: "${ref.sheet}"`);
    const cell = ws.getCell(ref.cell.trim());
    if (value === null || value === undefined) {
      cell.value = null;
      return;
    }
    cell.value = value;
  }

  getCellRawValue(ref: CellRef): unknown {
    const ws = this.wb.getWorksheet(ref.sheet);
    if (!ws) return undefined;
    const cell = ws.getCell(ref.cell.trim());
    const v = cell.value;
    if (v == null) return undefined;
    if (typeof v === "object" && v !== null && "result" in v) {
      return (v as { result?: unknown }).result;
    }
    return v;
  }

  async writeToBuffer(): Promise<Buffer> {
    const arr = await this.wb.xlsx.writeBuffer();
    return Buffer.from(arr);
  }
}
