/**
 * Parser DAP FO (daňové přiznání fyzických osob) z Doctly exportů.
 * Návrh: extrakce do Figma-ready JSON s meta, rows (kanonické klíče r31_…), normalizace čísel.
 */

export type SourceFormat = "HTML" | "CSV" | "JSON" | "TEXT_OCR" | "MARKDOWN";
export type ExpenseMethod = "PAUSAL" | "SKUTECNE" | "NEZNAMY";

export interface ParsedDapFo {
  schemaVersion: "1.0.0";
  meta: {
    rokZdanovaciObdobi: number | null;
    dic: string | null;
    dicNormalized: string | null;
    dicConfidence: "direct" | "derived_from_rc" | "none";
    rodneCislo?: string | null;
    icoCandidate?: string | null;
    /** Doplněno z ARES (převažující CZ-NACE). */
    czNacePrevazujici?: string | null;
    zpusobUplatneniVydaju: ExpenseMethod;
    methodSource: "checkbox" | "ratio_101_102" | "unknown";
    methodEvidence: string[];
    sourceFormat: SourceFormat;
    warnings: string[];
  };
  rows: Record<string, number | null>;
  rowsRaw?: Record<string, string | null>;
  rawText?: string;
}

interface Entry {
  rowId: string;
  label?: string;
  rawValue: string | null;
}

/** Mapování řádek → kanonický klíč a popis (podle specifikace). */
export const ROW_MAP: Array<{ rowId: string; key: string; label: string }> = [
  { rowId: "31", key: "r31_uhrnPrijmuOdVsechZamestnavatelu", label: "Úhrn příjmů od všech zaměstnavatelů" },
  { rowId: "32", key: "r32_neobsazeno", label: "(neobsazeno)" },
  { rowId: "33", key: "r33_danZaplacenaVZahraniciPar6odst13", label: "Daň zaplacená v zahraničí podle § 6 odst. 13" },
  { rowId: "34", key: "r34_dilciZakladDanePar6", label: "Dílčí základ daně podle § 6" },
  { rowId: "35", key: "r35_uhrnPrijmuZeZahraniciPar6", label: "Úhrn příjmů ze zahraničí podle § 6" },
  { rowId: "36", key: "r36_dilciZakladDaneZavislaCinnostPar6", label: "Dílčí základ daně ze závislé činnosti (§ 6)" },
  { rowId: "37", key: "r37_dilciZakladDanePar7", label: "Dílčí základ daně (§ 7)" },
  { rowId: "38", key: "r38_dilciZakladDanePar8", label: "Dílčí základ daně (§ 8)" },
  { rowId: "39", key: "r39_dilciZakladDanePar9", label: "Dílčí základ daně (§ 9)" },
  { rowId: "40", key: "r40_dilciZakladDanePar10", label: "Dílčí základ daně (§ 10)" },
  { rowId: "41", key: "r41_uhrnRadku37az40", label: "Úhrn řádků 37–40" },
  { rowId: "42", key: "r42_zakladDane", label: "Základ daně" },
  { rowId: "43", key: "r43_neobsazeno", label: "(neobsazeno)" },
  { rowId: "44", key: "r44_uplatnovanaZtrata", label: "Uplatňovaná ztráta" },
  { rowId: "45", key: "r45_zakladDanePoOdeceteniZtraty", label: "Základ daně po odečtení ztráty" },
  { rowId: "46", key: "r46_daryPar15odst1", label: "Dary (§15 odst. 1)" },
  { rowId: "47", key: "r47_urokyPar15odst3a4", label: "Úroky (§15 odst. 3 a 4)" },
  { rowId: "48", key: "r48_penzePar15a", label: "Penzijní produkty (§15a)" },
  { rowId: "49", key: "r49_zivotniPojisteniPar15a", label: "Životní pojištění (§15a)" },
  { rowId: "50", key: "r50_dlouhodobyInvesticniProduktPar15a", label: "Dlouhodobý investiční produkt (§15a)" },
  { rowId: "51", key: "r51_pojisteniDlouhodobePecePar15c", label: "Pojištění dlouhodobé péče (§15c)" },
  { rowId: "52", key: "r52_vyzkumAVyvojPar34odst4", label: "Výzkum a vývoj (§34 odst. 4)" },
  { rowId: "53", key: "r53_podporaOdbornehoVzdelavaniPar34odst4", label: "Podpora odborného vzdělávání (§34 odst. 4)" },
  { rowId: "54", key: "r54_uhrnNezdanitelnychCasti", label: "Úhrn nezdanitelných částí" },
  { rowId: "55", key: "r55_zakladDaneSnizeny", label: "Základ daně snížený" },
  { rowId: "56", key: "r56_zakladDaneZaokrouhlenyNaCelaStaKcDolu", label: "Základ daně zaokrouhlený na sta dolů" },
  { rowId: "57", key: "r57_danPodlePar16", label: "Daň podle §16" },
  { rowId: "58", key: "r58_danPodlePar16NeboPriloha3Radek330", label: "Daň podle §16 / příloha 3" },
  { rowId: "59", key: "r59_neobsazeno", label: "(neobsazeno)" },
  { rowId: "60", key: "r60_danZaokrouhlenaNaCeleKcNahoru", label: "Daň zaokrouhlená nahoru" },
  { rowId: "61", key: "r61_danovaZtrata", label: "Daňová ztráta" },
  { rowId: "62", key: "r62_slevyCelkemPar35odst1", label: "Slevy celkem (§35 odst.1)" },
  { rowId: "62a", key: "r62a_slevaZaZastavenouExekuciPar35odst4", label: "Sleva za zastavenou exekuci (§35 odst.4)" },
  { rowId: "63", key: "r63_slevaPar35aNebo35b", label: "Sleva (§35a/§35b)" },
  { rowId: "64", key: "r64_slevaNaPoplatnika", label: "Sleva na poplatníka" },
  { rowId: "65a", key: "r65a_slevaNaManzelkuManzela", label: "Sleva na manželku/manžela" },
  { rowId: "65b", key: "r65b_slevaNaManzelkuManzelaZTPP", label: "Sleva na manželku/manžela (ZTP/P)" },
  { rowId: "66", key: "r66_slevaInvalidita1a2", label: "Sleva invalidita 1–2" },
  { rowId: "67", key: "r67_slevaInvalidita3", label: "Sleva invalidita 3" },
  { rowId: "68", key: "r68_slevaDrzitelZTPP", label: "Sleva ZTP/P" },
  { rowId: "69", key: "r69_neobsazeno", label: "(neobsazeno)" },
  { rowId: "69a", key: "r69a_neobsazeno", label: "(neobsazeno)" },
  { rowId: "69b", key: "r69b_neobsazeno", label: "(neobsazeno)" },
  { rowId: "70", key: "r70_uhrnSlevNaDani", label: "Úhrn slev" },
  { rowId: "71", key: "r71_danPoSlevach", label: "Daň po slevách" },
  { rowId: "72", key: "r72_danoveZvyhodneniNaDite", label: "Zvýhodnění na dítě" },
  { rowId: "73", key: "r73_slevaNaDaniZDite", label: "Sleva na dani (dítě)" },
  { rowId: "74", key: "r74_danPoSlevePar35c", label: "Daň po slevě (§35c)" },
  { rowId: "74a", key: "r74a_danSamostatnyZakladPar16a", label: "Daň (§16a)" },
  { rowId: "75", key: "r75_danCelkem", label: "Daň celkem" },
  { rowId: "76", key: "r76_danovyBonus", label: "Daňový bonus" },
  { rowId: "77", key: "r77_danPoUpraveODanovyBonus", label: "Daň po úpravě o bonus" },
  { rowId: "77a", key: "r77a_danovyBonusPoOdpocetuDane", label: "Bonus po odpočtu daně" },
  { rowId: "78", key: "r78_posledniZnamaDan", label: "Poslední známá daň" },
  { rowId: "79", key: "r79_zjistenaDanPar141Dr", label: "Zjištěná daň (§141)" },
  { rowId: "80", key: "r80_rozdilRadku79a78", label: "Rozdíl 79–78" },
  { rowId: "81", key: "r81_posledniZnamaDanovaZtrata", label: "Poslední známá ztráta" },
  { rowId: "82", key: "r82_zjistenaZtrataPar141Dr", label: "Zjištěná ztráta (§141)" },
  { rowId: "83", key: "r83_rozdilRadku82a81", label: "Rozdíl 82–81" },
  { rowId: "84", key: "r84_uhrnSrazenychZaloh", label: "Úhrn sražených záloh" },
  { rowId: "85", key: "r85_zaplacenoNaZalohachPoplatnikem", label: "Zaplaceno poplatníkem" },
  { rowId: "86", key: "r86_uhrnZalohPausalniRezimPar38lk", label: "Zálohy v paušálním režimu" },
  { rowId: "87", key: "r87_srazenaDanPar36odst6", label: "Sražená daň (§36/6)" },
  { rowId: "87a", key: "r87a_srazenaDanPar36odst7", label: "Sražená daň (§36/7)" },
  { rowId: "88", key: "r88_zajistenaDanPar38e", label: "Zajištěná daň (§38e)" },
  { rowId: "89", key: "r89_uhrnVyplacenychMesicnichBonusuPar35d", label: "Vyplacené bonusy (§35d)" },
  { rowId: "90", key: "r90_zaplacenaDanovaPovinnostPar38gb", label: "Zaplacená daňová povinnost (§38gb)" },
  { rowId: "91", key: "r91_zbyvaDoplatit", label: "Zbývá doplatit / přeplatek" },
  ...Array.from({ length: 9 }, (_, i) => ({
    rowId: String(92 + i),
    key: `r${92 + i}_rezervovano`,
    label: "Rezervováno",
  })),
  { rowId: "101", key: "r101_prijmyPar7", label: "Příjmy podle §7" },
  { rowId: "102", key: "r102_vydajePar7", label: "Výdaje podle §7" },
  { rowId: "103", key: "r103_neobsazeno", label: "(neobsazeno)" },
  { rowId: "104", key: "r104_rozdilPrijmyAVydaje", label: "Rozdíl příjmy–výdaje" },
  { rowId: "105", key: "r105_upravyZvysujici", label: "Úpravy zvyšující" },
  { rowId: "106", key: "r106_upravySnizujici", label: "Úpravy snižující" },
  { rowId: "107", key: "r107_castPrijmuNaSpolupracujiciOsobuPar13", label: "Část příjmů na spolupracující osobu (§13)" },
  { rowId: "108", key: "r108_castVydajuNaSpolupracujiciOsobuPar13", label: "Část výdajů na spolupracující osobu (§13)" },
  { rowId: "109", key: "r109_castPrijmuJakoSpolupracujiciOsobaPar13", label: "Část příjmů jako spolupracující osoba (§13)" },
  { rowId: "110", key: "r110_castVydajuJakoSpolupracujiciOsobaPar13", label: "Část výdajů jako spolupracující osoba (§13)" },
  { rowId: "111", key: "r111_neobsazeno", label: "(neobsazeno)" },
  { rowId: "112", key: "r112_podilSpolecnikaVosKomplementareKs", label: "Podíl společníka v.o.s./k.s." },
  { rowId: "113", key: "r113_dilciZakladDanePar7", label: "Dílčí základ daně (§7)" },
];

const VALID_ROW_IDS = new Set(ROW_MAP.map((x) => x.rowId));
const ROWID_TO_KEY = new Map(ROW_MAP.map((x) => [x.rowId, x.key]));

/** Pro legacy API: kanonický klíč → číslo řádku (31, 62a, …). */
export const KEY_TO_ROWID = new Map(ROW_MAP.map((x) => [x.key, x.rowId]));

function detectSourceFormat(input: unknown): SourceFormat {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) return "JSON";
  const s = String(input ?? "").trim();
  if (s.startsWith("{") || s.startsWith("[")) return "JSON";
  if (/<table|<tr|<td|<html/i.test(s)) return "HTML";
  if (s.includes("\n") && (s.includes(";") || s.includes(",")) && !s.includes("|")) return "CSV";
  if (s.includes("|") && s.includes("\n")) return "MARKDOWN";
  return "TEXT_OCR";
}

/** Normalizace čísla: NBSP, minus, Kč, mezery, čárka, závorky. */
function normalizeNumber(raw: string | null): number | null {
  if (raw == null) return null;
  let s = raw.replace(/\u00A0/g, " ").replace(/[−–—]/g, "-").trim();
  if (!s) return null;
  s = s.replace(/\b(Kč|CZK)\b/gi, "").trim();
  const paren = /^\((.*)\)\s*$/.exec(s);
  if (paren) s = "-" + paren[1].trim();
  s = s.replace(/\s+/g, "").replace(/,/g, ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const num = parseFloat(s);
  return Number.isNaN(num) ? null : Math.round(num);
}

/** True pokud je hodnota jen číslo řádku (např. "72" pro řádek 72) – nesmí se použít jako částka. */
function isRowNumberAsValue(rawValue: string | null, rowId: string): boolean {
  if (!rawValue?.trim()) return false;
  const num = normalizeNumber(rawValue);
  if (num === null) return false;
  const rowNum = parseInt(rowId.replace(/[a-z]/g, ""), 10);
  return !Number.isNaN(rowNum) && num === rowNum;
}

/** Inline regex: řádek + label + hodnota (OCR text). */
const ROW_INLINE = /^\s*(?<row>\d{2,3}[a-z]?)\s+(?<label>.+?)\s+(?<value>-?\(?\d[\d\s]*([,.]\d+)?\)?)\s*(Kč|CZK)?\s*$/i;

function extractEntriesFromText(text: string): Entry[] {
  const entries: Entry[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("##") || /^[-|:\s]+$/.test(trimmed)) continue;

    if (trimmed.includes("|") || trimmed.includes("\t")) {
      const sep = trimmed.includes("|") ? "|" : "\t";
      const cells = trimmed
        .split(sep)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cells.length < 2) continue;

      const rowCellIdx = cells.findIndex((c) => /^\d{2,3}[a-z]?$/.test(c) || /^\d{2,3}[a-z]?\b/.test(c));
      if (rowCellIdx >= 0) {
        const match = cells[rowCellIdx].match(/^(\d{2,3}[a-z]?)/);
        const rowId = match ? match[1].toLowerCase() : null;
        if (!rowId || !VALID_ROW_IDS.has(rowId)) continue;

        let rawValue: string | null = null;
        for (let i = cells.length - 1; i >= 0; i--) {
          const cand = cells[i];
          if (normalizeNumber(cand) !== null) {
            if (isRowNumberAsValue(cand, rowId)) continue;
            rawValue = cand;
            break;
          }
          if (/^(0|0\s*Kč)$/i.test(cand)) {
            rawValue = cand;
            break;
          }
        }
        entries.push({ rowId, label: cells[rowCellIdx + 1], rawValue });
        continue;
      }
    }

    const m = ROW_INLINE.exec(trimmed);
    if (m?.groups?.row) {
      const rowId = m.groups.row.toLowerCase();
      if (!VALID_ROW_IDS.has(rowId)) continue;
      let rawVal: string | null = m.groups.value ?? null;
      if (rawVal && isRowNumberAsValue(rawVal, rowId)) rawVal = null;
      entries.push({ rowId, label: m.groups.label, rawValue: rawVal });
    }
  }
  return entries;
}

function extractEntriesFromCsv(text: string): Entry[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const first = lines[0];
  const delim = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const entries: Entry[] = [];
  const header = first.toLowerCase().split(delim).map((c) => c.trim());
  const rowCol = header.findIndex((h) => /row|řádek|line/.test(h));
  const valueCol = header.findIndex((h) => /value|hodnota/.test(h));
  const usePos = rowCol < 0 || valueCol < 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delim).map((c) => c.trim());
    if (cells.length < 2) continue;
    const rowCell = usePos ? cells[0] : cells[rowCol >= 0 ? rowCol : 0];
    const valueCell = usePos ? cells[cells.length - 1] : cells[valueCol >= 0 ? valueCol : cells.length - 1];
    const match = rowCell.match(/^(\d{2,3}[a-z]?)/);
    const rowId = match ? match[1].toLowerCase() : null;
    if (!rowId || !VALID_ROW_IDS.has(rowId)) continue;
    entries.push({ rowId, rawValue: valueCell || null });
  }
  return entries;
}

function extractEntriesFromJson(obj: unknown): Entry[] {
  const entries: Entry[] = [];
  if (obj == null || typeof obj !== "object") return entries;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      entries.push(...extractEntriesFromJson(item));
    }
    return entries;
  }

  const o = obj as Record<string, unknown>;
  if (typeof o.row === "string" && (typeof o.value === "string" || typeof o.value === "number")) {
    const rowId = o.row.match(/^(\d{2,3}[a-z]?)/)?.[1]?.toLowerCase();
    if (rowId && VALID_ROW_IDS.has(rowId)) {
      entries.push({
        rowId,
        label: typeof o.label === "string" ? o.label : undefined,
        rawValue: String(o.value),
      });
    }
    return entries;
  }

  for (const [k, v] of Object.entries(o)) {
    const rowId = k.match(/^(\d{2,3}[a-z]?)$/)?.[1]?.toLowerCase();
    if (rowId && VALID_ROW_IDS.has(rowId) && (typeof v === "string" || typeof v === "number")) {
      entries.push({ rowId, rawValue: String(v) });
    } else if (typeof v === "object" && v !== null) {
      entries.push(...extractEntriesFromJson(v));
    }
  }
  return entries;
}

function initRows(): { rows: Record<string, number | null>; rowsRaw: Record<string, string | null> } {
  const rows: Record<string, number | null> = {};
  const rowsRaw: Record<string, string | null> = {};
  for (const { key } of ROW_MAP) {
    rows[key] = null;
    rowsRaw[key] = null;
  }
  return { rows, rowsRaw };
}

function detectYear(fullText: string): number | null {
  const m = /(zdaňovací období|kalendářní rok)\s*\(?\s*(20\d{2})/i.exec(fullText)
    ?? /(kalendářní rok|rok)\s+(\d{4})/i.exec(fullText);
  if (!m) return null;
  const y = Number(m[2]);
  const now = new Date().getFullYear();
  if (y < 1993 || y > now + 1) return null;
  return y;
}

function detectDic(fullText: string): {
  dic: string | null;
  normalized: string | null;
  confidence: "direct" | "derived_from_rc" | "none";
  rodneCislo?: string | null;
  icoCandidate?: string | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  let dic: string | null =
    fullText.match(/(DIČ|Daňové identifikační číslo|Tax identification number)\s*[:\-]?\s*(C\s*Z\s*[0-9\s]*)/i)?.[2]
      ?.replace(/\s+/g, "")
      .toUpperCase() ?? null;
  if (!dic) {
    const m2 = fullText.match(/\bC\s*Z\s*\d[\d\s]{7,12}\b/i);
    dic = m2?.[0]?.replace(/\s+/g, "").toUpperCase() ?? null;
  }
  const rcMatch = fullText.match(/(Rodné číslo|Personal identification number)\s*[:\-]?\s*(\d{6}\s*\/\s*\d{3,4})/i);
  const rc = rcMatch?.[2]?.replace(/\s+/g, "").trim() ?? null;
  const rcDigits = rc ? rc.replace("/", "").replace(/\s/g, "") : null;

  if (!dic) {
    return { dic: null, normalized: null, confidence: "none", rodneCislo: rc, warnings };
  }
  if (dic === "CZ") {
    warnings.push("DIČ obsahuje pouze prefix CZ.");
    if (rcDigits && rcDigits.length >= 9) {
      const derived = "CZ" + rcDigits;
      return {
        dic: derived,
        normalized: derived,
        confidence: "derived_from_rc",
        rodneCislo: rc,
        warnings,
      };
    }
    return { dic: null, normalized: null, confidence: "none", rodneCislo: rc, warnings };
  }
  // Platné DIČ: CZ + 8 číslic (IČO) nebo CZ + 9–10 číslic (rodné číslo). Jinak jde např. o CZ-NACE (CZ02…).
  const isValidIco = /^CZ\d{8}$/.test(dic);
  const isValidRc = /^CZ\d{9,10}$/.test(dic);
  if (!isValidIco && !isValidRc) {
    warnings.push(`Z textu bylo vytaženo „${dic}“, což není platné DIČ (očekáváno CZ + 8 číslic nebo CZ + 9–10 číslic).`);
    return { dic: null, normalized: null, confidence: "none", rodneCislo: rc, warnings };
  }
  const mIco = /^CZ(\d{8})$/.exec(dic);
  const icoCandidate = mIco ? mIco[1] : null;
  return { dic, normalized: dic, confidence: "direct", rodneCislo: rc, icoCandidate, warnings };
}

function detectExpenseMethod(
  fullText: string,
  rows: Record<string, number | null>
): { method: ExpenseMethod; source: "checkbox" | "ratio_101_102" | "unknown"; evidence: string[] } {
  const evidence: string[] = [];
  const checked = "(☒|\\bX\\b|\\btrue\\b|\\b1\\b)";
  const hasPausal = new RegExp(
    `${checked}.{0,60}Uplatňuji\\s+výdaje\\s+procentem|Uplatňuji\\s+výdaje\\s+procentem.{0,60}${checked}`,
    "i"
  ).test(fullText);
  const hasSkutecne = new RegExp(
    `${checked}.{0,40}Vedu\\s+daňovou\\s+evidenci|${checked}.{0,40}Vedu\\s+účetnictví`,
    "i"
  ).test(fullText);
  if (hasPausal) return { method: "PAUSAL", source: "checkbox", evidence: ["checkbox:uplatnuji_vydaje_procentem=true"] };
  if (hasSkutecne) return { method: "SKUTECNE", source: "checkbox", evidence: ["checkbox:danova_evidence_nebo_ucetnictvi=true"] };

  const prijmy = rows["r101_prijmyPar7"];
  const vydaje = rows["r102_vydajePar7"];
  if (typeof prijmy === "number" && prijmy > 0 && typeof vydaje === "number") {
    const ratio = vydaje / prijmy;
    const allowed = [0.8, 0.6, 0.4, 0.3];
    const hit = allowed.find((a) => Math.abs(ratio - a) <= 0.005);
    if (hit != null) return { method: "PAUSAL", source: "ratio_101_102", evidence: [`ratio_101_102≈${hit}`] };
    return { method: "SKUTECNE", source: "ratio_101_102", evidence: [`ratio_101_102=${ratio.toFixed(4)}`] };
  }
  return { method: "NEZNAMY", source: "unknown", evidence };
}

/** Z HTML vytáhne text (odstraní tagy) a parsuje jako text. */
function extractEntriesFromHtml(html: string): Entry[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return extractEntriesFromText(text);
}

function extractEntries(input: string, format: SourceFormat): Entry[] {
  if (format === "HTML") return extractEntriesFromHtml(input);
  if (format === "CSV") return extractEntriesFromCsv(input);
  if (format === "JSON") {
    try {
      const obj = JSON.parse(input);
      return extractEntriesFromJson(obj);
    } catch {
      return extractEntriesFromText(input);
    }
  }
  return extractEntriesFromText(input);
}

/** Legacy tvar pro stávající API a frontend (řádek "31" → hodnota). */
export interface DapLegacyResult {
  lines: Record<string, number>;
  ic?: string;
  dic?: string;
  czNace?: string;
  zpusobVydaju?: string;
  rokZdanovaciObdobi?: number;
  rawText?: string;
}

/** Převod Parsed na legacy tvar (pro API odpověď a zpětnou kompatibilitu). */
export function convertParsedToLegacy(parsed: ParsedDapFo): DapLegacyResult {
  const lines: Record<string, number> = {};
  for (const [key, val] of Object.entries(parsed.rows)) {
    const rowId = KEY_TO_ROWID.get(key);
    if (rowId != null) lines[rowId] = val ?? 0;
  }
  let zpusobVydaju: string | undefined;
  if (parsed.meta.zpusobUplatneniVydaju === "PAUSAL") zpusobVydaju = "Výdaje procentem z příjmů (paušál)";
  else if (parsed.meta.zpusobUplatneniVydaju === "SKUTECNE") zpusobVydaju = "Skutečné výdaje (daňová evidence / účetnictví)";
  else if (parsed.meta.zpusobUplatneniVydaju === "NEZNAMY") zpusobVydaju = undefined;

  return {
    lines,
    ic: parsed.meta.icoCandidate ?? undefined,
    dic: parsed.meta.dicNormalized ?? undefined,
    czNace: parsed.meta.czNacePrevazujici ?? undefined,
    zpusobVydaju,
    rokZdanovaciObdobi: parsed.meta.rokZdanovaciObdobi ?? undefined,
    rawText: parsed.rawText,
  };
}

/**
 * Hlavní parsovací funkce: z raw textu (nebo JSON) vrátí ParsedDapFo s meta a rows (všechny klíče, chybějící = null).
 */
export function parseDoctlyDapFo(input: unknown, rawText?: string): ParsedDapFo {
  const sourceFormat = detectSourceFormat(input);
  const text = typeof input === "string" ? input : JSON.stringify(input);
  const { rows, rowsRaw } = initRows();
  const entries = extractEntries(text, sourceFormat);

  for (const e of entries) {
    const key = ROWID_TO_KEY.get(e.rowId);
    if (!key) continue;
    const value = isRowNumberAsValue(e.rawValue, e.rowId) ? null : e.rawValue;
    rowsRaw[key] = value;
    rows[key] = normalizeNumber(value);
  }

  const year = detectYear(text);
  const dicInfo = detectDic(text);
  const methodInfo = detectExpenseMethod(text, rows);

  return {
    schemaVersion: "1.0.0",
    meta: {
      rokZdanovaciObdobi: year,
      dic: dicInfo.dic,
      dicNormalized: dicInfo.normalized,
      dicConfidence: dicInfo.confidence,
      rodneCislo: dicInfo.rodneCislo ?? null,
      icoCandidate: dicInfo.icoCandidate ?? null,
      zpusobUplatneniVydaju: methodInfo.method,
      methodSource: methodInfo.source,
      methodEvidence: methodInfo.evidence,
      sourceFormat,
      warnings: dicInfo.warnings,
    },
    rows,
    rowsRaw,
    rawText,
  };
}
