/**
 * Extrakce příjmů z výpisů z běžného účtu (BU).
 * Hledá příjem od zaměstnavatele (mzda, plat), agreguje po měsících a volitelně vrací
 * zaměstnavatele, jednotlivé transakce a ostatní příjmy (důchod, výživné, …).
 */

/** Jedna položka příjmu (řádek z výpisu). */
export interface VypisEntry {
  datum: string;
  popis: string;
  castka: number;
  platce?: string; // plátce / zaměstnavatel – pro agregaci podle firmy
}

/** Pravidelný ostatní příjem (důchod, výživné, …). */
export interface OstatniPrijemPravidelny {
  typ: string;
  castka: number;
  mesicne?: boolean;
}

/** Rozšířený výstup z výpisů: měsíční součty + zaměstnavatel + transakce. */
export interface VypisyExtractResult {
  mesic1?: number;
  mesic2?: number;
  mesic3?: number;
  mesic4?: number;
  mesic5?: number;
  mesic6?: number;
  zamestnavatel?: string;
  zamestnavatelIc?: string;
  prumernaMzda?: number;
  employmentEntries?: VypisEntry[];
  otherRegularIncome?: OstatniPrijemPravidelny[];
  otherIncomeEntries?: VypisEntry[];
}

import path from "path";
import fs from "fs";
import { recognizeText } from "./ocr.js";
import { isImageFile } from "./ocr.js";

async function getTextFromPdf(filePath: string): Promise<string> {
  const buf = fs.readFileSync(filePath);
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const result = await parser.getText();
    return (result?.text ?? "") as string;
  } finally {
    await parser.destroy();
  }
}

/**
 * Text z výpisu – vždy jen pdf-parse + Tesseract, bez Doctly (výpisy jsou často desítky stránek).
 */
export async function getTextFromFile(filePath: string): Promise<string> {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return "";
  const ext = path.extname(fullPath).toLowerCase();
  if (ext === ".pdf") return getTextFromPdf(fullPath);
  if (isImageFile(fullPath)) return recognizeText(fullPath, { useDoctly: false });
  return "";
}

/** Odstraní diakritiku pro porovnání jmen (ě→e, š→s, …). */
export function normalizeNameForMatch(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Z textu výpisu z účtu vytáhne jméno držitele účtu (pro přiřazení k osobě).
 * Hledá typické řádky bank: "Majitel účtu:", "Držitel účtu:", "Jméno:", "Účet vedený na:", atd.
 */
export function extractAccountHolderFromText(text: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const patterns = [
    /(?:majitel|držitel)\s*(?:účtu)?\s*[:\s]+([^\n\d]{2,60})/i,
    /(?:jméno\s*(?:a\s*)?příjmení|jméno)\s*[:\s]+([^\n\d]{2,60})/i,
    /účet\s*(?:vedený\s*)?(?:na|u)\s*[:\s]+([^\n\d]{2,60})/i,
    /(?:účtu?\s*)?(?:na\s+jméno|v\s+jménu)\s*[:\s]+([^\n\d]{2,60})/i,
    /(?:klient|vlastník)\s*[:\s]+([^\n\d]{2,60})/i,
  ];
  for (const line of lines.slice(0, 30)) {
    for (const re of patterns) {
      const m = line.match(re);
      if (m) {
        const name = m[1].replace(/\s+/g, " ").replace(/[,;].*$/, "").trim();
        if (name.length >= 3 && !/^\d+$/.test(name)) return name;
      }
    }
  }
  return null;
}

/** Klíčová slova pro příjem od zaměstnavatele / obecný příjem na účet */
const EMPLOYER_INCOME_KEYWORDS = [
  "mzda", "plat", "zaměstnavatel", "příjem", "prevod", "převod", "salary", "wage",
  "vyplata", "výplata", "odmena", "odměna", "firma", "s.r.o", "a.s.", "v.o.s",
  "kredit", "připsáno", "převod příchozí", "příjem na účet", "inkaso", "připsáno na účet",
  "příchozí úhrada", "přichozí uhrada", "uhrada okamžitá", "uhrada okamzita",
];

/** Vzor MZ + čísla = mzda (např. MZ202508) – banky používají tento kód pro výplatu. */
const MZ_SALARY_PATTERN = /\bMZ\d{4,}\b/i;

/** Slova označující výdej (bereme jen příjem) */
const DEBIT_KEYWORDS = ["výdej", "debet", "odepsáno", "platba", "odchod"];

/** Vyhledá rok v dokumentu (pro doplnění DD.MM.). */
function findYearInText(text: string): string {
  const m = text.match(/20\d{2}/);
  return m ? m[0] : String(new Date().getFullYear());
}

/** Více formátů data: YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, D.M.YYYY, DD.MM. (bez roku) */
function getMonthKeyFromLine(line: string, prevLine?: string, fallbackYear?: string): string | null {
  const search = `${prevLine ?? ""} ${line}`;
  // 2024-01-15 nebo 2024.01.15
  const iso = search.match(/(20\d{2})[-.](\d{1,2})[-.](\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, "0")}`;
  // 15.1.2024 nebo 15/1/2024
  const dmy = search.match(/(\d{1,2})[-./](\d{1,2})[-./]20(\d{2})/);
  if (dmy) return `20${dmy[3]}-${String(dmy[2]).padStart(2, "0")}`;
  // 12.09. nebo 12.9. (jen DD.MM. – rok doplníme)
  const short = search.match(/(\d{1,2})\.(\d{1,2})\.?(?:\s|$|[^\d])/);
  if (short && fallbackYear) return `${fallbackYear}-${String(short[2]).padStart(2, "0")}`;
  return null;
}

/** Z bloku textu vytáhne název plátce (firma s.r.o., a.s., v.o.s.). */
function extractPayerFromBlock(block: string): string | undefined {
  const match = block.match(
    /([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽa-záčďéěíňóřšťúůýž0-9\s.,\-&]{2,50})\s*(?:s\.r\.o\.|a\.s\.|v\.o\.s\.)/i
  );
  if (match) {
    const name = match[0].replace(/\s+/g, " ").trim();
    if (name.length >= 4 && name.length <= 60 && !/^\d+/.test(name)) return name;
  }
  return undefined;
}

/** Je řádek/blok indikátorem mzdy? (MZ pattern nebo příchozí úhrada + typický kontext) */
function isSalaryIndicator(text: string): boolean {
  const lower = text.toLowerCase();
  if (MZ_SALARY_PATTERN.test(text)) return true;
  if (lower.includes("příchozí úhrada") || lower.includes("přichozí uhrada")) return true;
  return EMPLOYER_INCOME_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Z řádku vytáhne jednu částku v Kč (formáty: 39 270, 39270, 39270,00).
 */
function parseAmountFromLine(line: string): number | null {
  const normalized = line.replace(/\s/g, "").replace(",", ".");
  const match = normalized.match(/(\d{2,8}(?:\.\d{2})?)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return num >= 100 && num <= 99999999 ? Math.round(num) : null;
}

/**
 * Vrátí všechny částky z řádku včetně znaménka: [výdej?, příjem?].
 * Hledá vzory: -39 270 / 39 270 / 39 270,00 (mezery jako oddělovač tisíců).
 */
function parseAllAmountsFromLine(line: string): { value: number; isCredit: boolean }[] {
  const result: { value: number; isCredit: boolean }[] = [];
  // Částky s volitelným minus na začátku (před číslem nebo na začátku řádku)
  const regex = /(?:^|[^\d])(\-?)\s*([\d\s]{1,15})(?:[,.](\d{2}))?(?=\s|$|[^\d])/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    const raw = (m[1] === "-" ? "-" : "") + m[2].replace(/\s/g, "") + (m[3] ?? "");
    const num = parseFloat(raw.replace(",", "."));
    if (!Number.isNaN(num) && Math.abs(num) >= 100 && Math.abs(num) <= 99999999) {
      result.push({ value: Math.round(Math.abs(num)), isCredit: num >= 0 });
    }
  }
  return result;
}

/**
 * Z textu výpisu najde příjmy a agreguje po měsících.
 * Podporuje: řádky s klíčovým slovem + částka; sloupec Příjem/Kredit; dva sloupce Výdej|Příjem; více formátů data.
 */
export function parseVypisyFromText(text: string): Record<string, number> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const amountsByMonth: Record<string, number> = {};
  let incomeColumnIndex: number | null = null;
  const fallbackYear = findYearInText(text);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : undefined;
    const lower = line.toLowerCase();
    const monthKey = getMonthKeyFromLine(line, prevLine, fallbackYear) ?? "unknown";

    // Detekce hlavičky tabulky: Příjem / Výdej nebo Kredit / Debet
    if (
      (lower.includes("příjem") || lower.includes("kredit")) &&
      (lower.includes("výdej") || lower.includes("debet"))
    ) {
      const amounts = parseAllAmountsFromLine(line);
      if (amounts.length === 0) {
        const tokens = line.split(/\s{2,}|\t/);
        const idxPrijem = tokens.findIndex((t) => /příjem|kredit/i.test(t));
        if (idxPrijem >= 0) incomeColumnIndex = idxPrijem;
      }
      continue;
    }
    if (lower.match(/^\s*(datum|datum\s+valuty)/i) && lower.includes("příjem")) {
      const tokens = line.split(/\s{2,}|\t/);
      const idxPrijem = tokens.findIndex((t) => /příjem|kredit/i.test(t));
      if (idxPrijem >= 0) incomeColumnIndex = idxPrijem;
      continue;
    }

    const hasIncomeKeyword = isSalaryIndicator(line) || EMPLOYER_INCOME_KEYWORDS.some((k) => lower.includes(k));
    const hasDebitKeyword = DEBIT_KEYWORDS.some((k) => lower.includes(k));
    const amounts = parseAllAmountsFromLine(line);

    if (amounts.length === 0) {
      const single = parseAmountFromLine(line);
      if (single != null && hasIncomeKeyword && !hasDebitKeyword) {
        amountsByMonth[monthKey] = (amountsByMonth[monthKey] ?? 0) + single;
      }
      continue;
    }

    // Dva a více sloupců (výdej | příjem) – bereme příjem podle hlavičky nebo kladnou částku
    if (amounts.length >= 2) {
      const credits = amounts.filter((a) => a.isCredit);
      let incomeAmount: number | null = null;
      if (incomeColumnIndex !== null) {
        const tokens = line.split(/\s{2,}|\t/);
        const cell = tokens[incomeColumnIndex];
        if (cell != null) {
          const n = parseFloat(cell.replace(/\s/g, "").replace(",", "."));
          if (!Number.isNaN(n) && n > 0) incomeAmount = Math.round(n);
        }
      }
      if (incomeAmount == null && credits.length >= 1) {
        incomeAmount = credits.length === 1 ? credits[0].value : Math.max(...credits.map((c) => c.value));
      }
      if (incomeAmount == null && amounts.length === 2) {
        incomeAmount = amounts[1].isCredit ? amounts[1].value : amounts[0].isCredit ? amounts[0].value : null;
      }
      if (
        incomeAmount != null &&
        (incomeColumnIndex !== null || hasIncomeKeyword || (credits.length > 0 && !hasDebitKeyword))
      ) {
        amountsByMonth[monthKey] = (amountsByMonth[monthKey] ?? 0) + incomeAmount;
      }
      continue;
    }

    // Jedna částka
    const single = amounts[0];
    if (single.isCredit && (hasIncomeKeyword || lower.includes("+")) && !hasDebitKeyword) {
      amountsByMonth[monthKey] = (amountsByMonth[monthKey] ?? 0) + single.value;
    }
  }

  if (Object.keys(amountsByMonth).length > 0) {
    const sortedMonths = Object.entries(amountsByMonth)
      .filter(([k]) => k !== "unknown")
      .sort(([a], [b]) => b.localeCompare(a));
    const result: Record<string, number> = {};
    sortedMonths.slice(0, 6).forEach(([, val], idx) => {
      result[`mesic${idx + 1}`] = val;
    });
    if (Object.keys(result).length > 0) return result;
    if (amountsByMonth["unknown"] != null) return { mesic1: amountsByMonth["unknown"] };
  }

  const allAmounts: number[] = [];
  for (const line of lines) {
    const amount = parseAmountFromLine(line);
    if (amount != null && amount >= 10000 && amount <= 500000) allAmounts.push(amount);
  }
  if (allAmounts.length > 0) {
    const max = Math.max(...allAmounts);
    return { mesic1: max };
  }
  return {};
}

/** Klíčová slova pro ostatní příjmy (ne mzda). */
const OTHER_INCOME_KEYWORDS = [
  "důchod", "duchod", "invalidní", "starobní", "výživné", "vyživné", "výsluha", "vysluha",
  "dávka", "podpora", "renta", "pension",
];

/** Z řádku vytáhne datum ve formátu DD. M. YYYY, DD.MM.YYYY nebo DD.MM. */
function extractDatumFromLine(line: string, prevLine?: string, fallbackYear?: string): string {
  const search = `${prevLine ?? ""} ${line}`;
  const dmy = search.match(/(\d{1,2})[.\s](\d{1,2})[.\s]20(\d{2})/);
  if (dmy) return `${parseInt(dmy[1], 10)}. ${parseInt(dmy[2], 10)}. 20${dmy[3]}`;
  const iso = search.match(/(20\d{2})[-.](\d{1,2})[-.](\d{1,2})/);
  if (iso) return `${parseInt(iso[3], 10)}. ${parseInt(iso[2], 10)}. ${iso[1]}`;
  const short = search.match(/(\d{1,2})\.(\d{1,2})\.?(?:\s|$|[^\d])/);
  if (short && fallbackYear) return `${parseInt(short[1], 10)}. ${parseInt(short[2], 10)}. ${fallbackYear}`;
  return "";
}

/**
 * Z textu výpisu vytáhne jednotlivé řádky příjmů (datum, popis, částka, plátce) a rozdělí na mzdu vs. ostatní.
 * Rozpoznává MZ pattern (MZ202508), příchozí úhrada, plátce (ARIA PURA s.r.o.) a agreguje podle zaměstnavatele.
 */
function parseEntriesFromText(text: string): { employment: VypisEntry[]; other: VypisEntry[] } {
  const employment: VypisEntry[] = [];
  const other: VypisEntry[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fallbackYear = findYearInText(text);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : undefined;
    const lower = line.toLowerCase();
    const amounts = parseAllAmountsFromLine(line);
    const creditAmounts = amounts.filter((a) => a.isCredit);
    if (creditAmounts.length === 0) continue;
    const salaryRange = creditAmounts.filter((c) => c.value >= 5000 && c.value <= 500000);
    const amount = salaryRange.length > 0
      ? Math.max(...salaryRange.map((c) => c.value))
      : Math.max(...creditAmounts.map((c) => c.value));
    if (amount < 100) continue;

    const hasEmploymentKw = isSalaryIndicator(line) || EMPLOYER_INCOME_KEYWORDS.some((k) => lower.includes(k));
    const hasOtherKw = OTHER_INCOME_KEYWORDS.some((k) => lower.includes(k));
    const hasDebitKw = DEBIT_KEYWORDS.some((k) => lower.includes(k));
    if (hasDebitKw) continue;

    const datum = extractDatumFromLine(line, prevLine, fallbackYear);
    const block = [prevLine, line, lines[i + 1], lines[i + 2]]
      .filter(Boolean)
      .join(" ");
    const platce = extractPayerFromBlock(block);
    const popis = line
      .replace(/\d{1,2}[.\s]\d{1,2}[.\s]20\d{2}/g, "")
      .replace(/\d{1,2}\.\d{1,2}\.?(?:\s|$)/g, "")
      .replace(/[\d\s]{6,}/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "Mzda";

    const entry: VypisEntry = { datum, popis, castka: amount };
    if (platce) entry.platce = platce;

    if (hasOtherKw) {
      other.push(entry);
    } else if (hasEmploymentKw || (amount >= 8000 && amount <= 500000)) {
      employment.push(entry);
    }
  }

  employment.sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
  other.sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
  return { employment, other };
}

/** Z ostatních příjmů vytvoří pravidelné (stejná částka opakovaná = měsíční). */
function buildOtherRegularIncome(other: VypisEntry[]): OstatniPrijemPravidelny[] {
  const byLabel = new Map<string, number[]>();
  for (const e of other) {
    const label = e.popis.slice(0, 40).trim() || "Ostatní příjem";
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label)!.push(e.castka);
  }
  const result: OstatniPrijemPravidelny[] = [];
  for (const [typ, amounts] of byLabel) {
    const unique = [...new Set(amounts)];
    if (unique.length === 1 && amounts.length >= 2) {
      result.push({ typ, castka: unique[0], mesicne: true });
    }
  }
  return result;
}

/**
 * Z textu vytáhne název a IČ plátce/zaměstnavatele.
 * Hledá v hlavičce, popisech a především v bloku textu firmy s.r.o./a.s.
 */
function parseEmployerFromText(text: string, employmentEntries?: VypisEntry[]): { name?: string; ic?: string } {
  let name: string | undefined;
  let ic: string | undefined;
  const icPattern = /\bI[ČC]\s*[:\s]*(\d{8})\b/i;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines.slice(0, 100)) {
    const icMatch = line.match(icPattern);
    if (icMatch) ic = icMatch[1];
    const payer = extractPayerFromBlock(line);
    if (payer && (!name || payer.length > name.length)) name = payer;
  }
  const namePatterns = [
    /(?:plátce|platce|zaměstnavatel|úhrada od)\s*[:\s]+([A-Za-z0-9\s.,\-&]+(?:s\.r\.o\.|a\.s\.|v\.o\.s\.)?)/i,
    /(?:mzda|plat)\s*[-–]\s*([A-Za-z0-9\s.,\-&]+(?:s\.r\.o\.|a\.s\.)?)/i,
  ];
  for (const line of lines.slice(0, 80)) {
    for (const re of namePatterns) {
      const m = line.match(re);
      if (m) {
        const n = m[1].replace(/\s+/g, " ").trim();
        if (n.length >= 3 && n.length <= 60) name = n;
      }
    }
  }
  if (!name && employmentEntries && employmentEntries.length > 0) {
    const byPayer = new Map<string, number>();
    for (const e of employmentEntries) {
      const p = e.platce ?? "Neznámý plátce";
      byPayer.set(p, (byPayer.get(p) ?? 0) + e.castka);
    }
    let best: { name: string; sum: number } | null = null;
    for (const [n, sum] of byPayer) {
      if (n !== "Neznámý plátce" && (!best || sum > best.sum)) best = { name: n, sum };
    }
    if (best) name = best.name;
  }
  return { name, ic };
}

/**
 * Z jednoho souboru (PDF/obrázek) vrátí vytažené příjmy včetně zaměstnavatele a jednotlivých transakcí.
 */
export async function extractVypisyFromFile(filePath: string): Promise<VypisyExtractResult> {
  const text = await getTextFromFile(filePath);
  if (!text.trim()) {
    console.log("[extractVypisy] Prázdný text:", path.basename(filePath));
    return {};
  }
  const monthly = parseVypisyFromText(text);
  const { employment, other } = parseEntriesFromText(text);
  const employer = parseEmployerFromText(text, employment);
  const otherRegular = buildOtherRegularIncome(other);

  const result: VypisyExtractResult = { ...monthly };
  if (employer.name) result.zamestnavatel = employer.name;
  if (employer.ic) result.zamestnavatelIc = employer.ic;
  if (employment.length > 0) {
    const sum = employment.reduce((a, e) => a + e.castka, 0);
    result.prumernaMzda = Math.round(sum / employment.length);
    result.employmentEntries = employment.slice(0, 24);
  }
  if (otherRegular.length > 0) result.otherRegularIncome = otherRegular;
  if (other.length > 0) result.otherIncomeEntries = other.slice(0, 24);

  if (Object.keys(monthly).length > 0 || result.zamestnavatel || (result.employmentEntries?.length ?? 0) > 0) {
    console.log("[extractVypisy] Vytaženo:", Object.keys(monthly).length, "měsíců | zaměstnavatel:", !!result.zamestnavatel, "| soubor:", path.basename(filePath));
  }
  return result;
}

/**
 * Sloučí více výstupů z výpisů (6 souborů = 6 měsíců) do jednoho objektu.
 * Zachová mesic1..mesic6 a sloučí employmentEntries, otherIncomeEntries, otherRegularIncome; zaměstnavatel z prvního.
 */
export function mergeVypisyMonths(fileResults: VypisyExtractResult[]): VypisyExtractResult {
  const merged: VypisyExtractResult = {};
  fileResults.forEach((res, idx) => {
    const key = `mesic${idx + 1}` as "mesic1" | "mesic2" | "mesic3" | "mesic4" | "mesic5" | "mesic6";
    const val = res.mesic1 ?? res[key] ?? (res as Record<string, number>)[`mesic${idx + 1}`];
    if (typeof val === "number" && val > 0) (merged as Record<string, number>)[key] = val;
  });
  const allEmployment = fileResults
    .flatMap((r) => r.employmentEntries ?? [])
    .sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
  if (allEmployment.length > 0) {
    const byPayer = new Map<string, number>();
    for (const e of allEmployment) {
      const p = e.platce ?? e.popis ?? "Neznámý";
      byPayer.set(p, (byPayer.get(p) ?? 0) + e.castka);
    }
    let bestPayer: { name: string; sum: number } | null = null;
    for (const [name, sum] of byPayer) {
      if (name !== "Neznámý" && name.length >= 4 && (!bestPayer || sum > bestPayer.sum)) bestPayer = { name, sum };
    }
    if (bestPayer) merged.zamestnavatel = bestPayer.name;
  }
  const first = fileResults[0];
  if (!merged.zamestnavatel && first?.zamestnavatel) merged.zamestnavatel = first.zamestnavatel;
  if (first?.zamestnavatelIc) merged.zamestnavatelIc = first.zamestnavatelIc;
  if (allEmployment.length > 0) {
    merged.employmentEntries = allEmployment.slice(0, 36);
    const sum = allEmployment.reduce((a, e) => a + e.castka, 0);
    merged.prumernaMzda = Math.round(sum / allEmployment.length);
  }
  const allOther = fileResults.flatMap((r) => r.otherIncomeEntries ?? []);
  if (allOther.length > 0) merged.otherIncomeEntries = allOther.slice(0, 36);
  const allRegular = fileResults.flatMap((r) => r.otherRegularIncome ?? []);
  const seenTyp = new Set<string>();
  merged.otherRegularIncome = allRegular.filter((r) => {
    if (seenTyp.has(r.typ)) return false;
    seenTyp.add(r.typ);
    return true;
  });
  return merged;
}
