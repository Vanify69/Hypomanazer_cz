/**
 * Windows + Excel COM worker pro HypoManager.
 * Spusťte na PC s Microsoft Excel: npm install && npm start
 * API: POST /run { fileBase64, mapping, inputValues }
 * Nastavte na API serveru EXCEL_WORKER_URL=http://IP:PORT (např. http://192.168.1.10:4799)
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

if (process.platform !== "win32") {
  console.error("[excel-worker] Vyžaduje OS Windows.");
  process.exit(1);
}

let winax;
try {
  winax = require("winax");
} catch (e) {
  console.error("[excel-worker] Nelze načíst winax. Spusťte: npm install", e);
  process.exit(1);
}

const PORT = Number(process.env.EXCEL_WORKER_PORT || 4799);

function skipRef(ref) {
  if (!ref || !ref.sheet || !ref.cell) return true;
  return String(ref.sheet).trim().startsWith("TODO_") || String(ref.cell).trim().startsWith("TODO_");
}

function openWorksheet(wb, sheetName) {
  try {
    return wb.Worksheets.Item(sheetName);
  } catch {
    try {
      return wb.Worksheets(sheetName);
    } catch (e2) {
      throw new Error(`List „${sheetName}“ neexistuje: ${e2.message}`);
    }
  }
}

const app = express();
app.use(express.json({ limit: "50mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "hypo-excel-com-worker", platform: process.platform });
});

app.post("/run", (req, res) => {
  const { fileBase64, mapping, inputValues, preferredExt } = req.body || {};
  if (!fileBase64 || !mapping || !inputValues) {
    res.status(400).json({ ok: false, error: "Chybí fileBase64, mapping nebo inputValues." });
    return;
  }

  const extRaw = typeof preferredExt === "string" ? preferredExt.trim().toLowerCase() : ".xlsm";
  const ext = extRaw === ".xlsx" || extRaw === ".xlsm" ? extRaw : ".xlsm";

  const tmp = path.join(os.tmpdir(), "hypo-excel-" + crypto.randomBytes(8).toString("hex"));
  fs.mkdirSync(tmp, { recursive: true });
  const inPath = path.join(tmp, `in${ext}`);
  const outPath = path.join(tmp, `out${ext}`);

  let excel;
  let wb;

  try {
    fs.writeFileSync(inPath, Buffer.from(fileBase64, "base64"));

    excel = new winax.Object("Excel.Application");
    excel.Visible = false;
    excel.DisplayAlerts = false;

    wb = excel.Workbooks.Open(inPath);

    const inputs = mapping.inputs || {};
    for (const [key, ref] of Object.entries(inputs)) {
      if (skipRef(ref)) continue;
      const val = inputValues[key];
      if (val === undefined || val === null) continue;
      const ws = openWorksheet(wb, ref.sheet);
      ws.Range(ref.cell.trim()).Value2 = val;
    }

    try {
      excel.CalculateFullRebuild();
    } catch {
      excel.Calculate();
    }

    const outputs = {};
    const outputDefs = mapping.outputs || {};
    for (const [key, ref] of Object.entries(outputDefs)) {
      if (skipRef(ref)) continue;
      const ws = openWorksheet(wb, ref.sheet);
      outputs[key] = ws.Range(ref.cell.trim()).Value2;
    }

    // 52 = xlOpenXMLWorkbookMacroEnabled (.xlsm), 51 = .xlsx
    const xlFmt = ext === ".xlsx" ? 51 : 52;
    wb.SaveAs(outPath, xlFmt);
    wb.Close(false);
    wb = null;
    excel.Quit();
    excel = null;

    const outBuf = fs.readFileSync(outPath);
    res.json({
      ok: true,
      fileBase64: outBuf.toString("base64"),
      outputs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      if (wb) wb.Close(false);
    } catch {
      /* ignore */
    }
    try {
      if (excel) excel.Quit();
    } catch {
      /* ignore */
    }
    res.status(500).json({ ok: false, error: msg });
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[excel-worker] Naslouchám na http://0.0.0.0:${PORT}`);
  console.log(`[excel-worker] Nastavte EXCEL_WORKER_URL na URL tohoto stroje (např. http://192.168.x.x:${PORT})`);
});
