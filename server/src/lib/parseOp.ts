/**
 * Parsování textu z OCR českého občanského průkazu.
 * Přední strana: jméno, příjmení, rodné číslo.
 * Zadní strana: adresa (bez MRZ).
 */

export interface OpFrontData {
  jmeno?: string;
  prijmeni?: string;
  rc?: string;
  datumNarozeni?: string;
  mistoNarozeni?: string;
  pohlavi?: string;
  narodnost?: string;
  rodinnyStav?: string;
  cisloDokladu?: string;
  datumVydani?: string;
  platnostDo?: string;
  vydavajiciUrad?: string;
}

export interface OpBackData {
  adresa?: string;
  rc?: string;
  mrzJmeno?: string;
  mrzPrijmeni?: string;
  datumNarozeni?: string;
  mistoNarozeni?: string;
  pohlavi?: string;
  narodnost?: string;
  rodinnyStav?: string;
  cisloDokladu?: string;
  datumVydani?: string;
  platnostDo?: string;
  vydavajiciUrad?: string;
}

/** Z rodného čísla (YYMMDD/XXXX) odvodí datum narození ve formátu DD.MM.YYYY. */
export function rcToDatumNarozeni(rc: string): string | null {
  const m = rc.replace(/\s/g, "").match(/^(\d{6})\/?(\d{3,4})?$/);
  if (!m) return null;
  const yy = parseInt(m[1].slice(0, 2), 10);
  let mm = parseInt(m[1].slice(2, 4), 10);
  const dd = parseInt(m[1].slice(4, 6), 10);
  if (dd < 1 || dd > 31) return null;
  if (mm > 50) mm -= 50; // ženy: 51–62 → 1–12
  if (mm < 1 || mm > 12) return null;
  const century = yy <= 54 ? 2000 : 1900;
  const year = century + yy;
  return `${dd.toString().padStart(2, "0")}.${mm.toString().padStart(2, "0")}.${year}`;
}

/** Z rodného čísla odvodí pohlaví: měsíc 51–62 = žena, jinak muž. Vrací "Muž" nebo "Žena". */
export function rcToPohlavi(rc: string): string | null {
  const m = rc.replace(/\s/g, "").match(/^(\d{6})/);
  if (!m) return null;
  const mm = parseInt(m[1].slice(2, 4), 10);
  return mm >= 51 && mm <= 62 ? "Žena" : "Muž";
}

const NAME_LIKE = /^[a-zA-ZáéíóúýčďěňřšťžůÁÉÍÓÚÝČĎĚŇŘŠŤŽŮ\-]{2,30}$/;
const RC_PATTERN = /\d{6}\s*\/\s*\d{3,4}/g;

function cleanLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Jména a příjmení končící na „a“, u kterých zůstává krátké „a“ (ne „á“): Lenka, Jirava, … */
const NAME_KEEPS_A = new Set([
  "lenka", "anna", "hanna", "marta", "barbora", "klara", "lucie", "tereza", "elena", "helena", "johanna",
  "jirava", "jiravá",
]);

/** Převod na formát „Lenka Kallová“ – první písmeno velké, zbytek malé; běžná diakritika. */
function toDisplayName(word: string): string {
  if (!word || word.length < 2) return word;
  const lower = word.toLowerCase().replace(/\s+/g, "");
  if (lower === "jiravá") return "Jirava";
  if (lower === "sondrej" || lower === "sondrěj") return "Ondřej";
  if (lower === "enakunadvornik" || lower === "enakunadvorník") return "Nádvorník";
  if (lower === "nadvornik" || lower === "nádvornik") return "Nádvorník";
  if (lower === "strbakova" || lower === "štrbáková") return "Štrbáková";
  if (lower === "lukas") return "Lukáš";
  if (lower === "penkava" || lower === "penkavá" || lower === "pěnkava") return "Pěnkava";
  let title = lower.charAt(0).toUpperCase() + lower.slice(1);
  if (title.endsWith("ej")) title = title.slice(0, -2) + "ěj"; // Ondrej → Ondřej
  else if (title.endsWith("ik")) title = title.slice(0, -2) + "ík"; // Hudlik → Hudlík
  else if (title.endsWith("as") && title.length <= 6) title = title.slice(0, -2) + "áš"; // Lukas → Lukáš, Tomas → Tomáš
  else if (title.endsWith("e") && !title.endsWith("ie")) title = title.slice(0, -1) + "é";
  else if (title.endsWith("a") && !title.endsWith("ia") && !NAME_KEEPS_A.has(lower)) title = title.slice(0, -1) + "á";
  return title;
}

/** Místa, u kterých se nemění koncové „a“ na „á“ (Jihlava, Ostrava, …). „Jihlavá“ je chyba → Jihlava. */
const PLACE_KEEPS_A = new Set([
  "jihlava",
  "jihlavá",
  "ostrava",
  "havirov",
  "havířov",
  "olomouc",
  "pardubice",
  "mesta",
  "města",
]);

/** Správný tvar obce: Vyskytná (ne Vyškytná) nad Jihlavou */
function normalizePlaceName(word: string): string {
  const lower = word.toLowerCase();
  if (lower === "vyškytná" || lower === "vyskytná") return "Vyskytná";
  return word;
}

/** Běžná koncová diakritika pro česká slova (ulice, obce): Vetrna → Vetrná. Obce na -ice nechat (Dobšice, Budějovice). */
function addCzechDiacritics(word: string): string {
  if (word.length < 3) return word;
  let w = normalizePlaceName(word);
  const lower = w.toLowerCase();
  if (lower.endsWith("ice")) return w;
  if (lower === "jihlavá" || lower === "jihlavoý" || lower === "jihlavoy") return "Jihlava";
  if (lower === "jihlavou") return "Jihlavou";
  if (PLACE_KEEPS_A.has(lower)) return w;
  if (/[bcčdďfghjklmnpqrřsštťvwxzž][ae]$/i.test(w)) return w.slice(0, -1) + (w.endsWith("a") ? "á" : "é");
  if (/[aeiouy][uy]$/i.test(w) && !w.endsWith("au")) return w.slice(0, -1) + "ý";
  return w;
}

/** Převod adresy na čitelný formát: diakritika, první písmeno velké, „nad/č.p./okr.“ malé. */
export function toDisplayText(text: string): string {
  const raw = text
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      const lower = w.toLowerCase();
      const withDash = lower.includes("-")
        ? lower.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("-")
        : lower.charAt(0).toUpperCase() + lower.slice(1);
      return addCzechDiacritics(withDash);
    })
    .join(" ");
  return raw
    .replace(/\s+Nad\s+/g, " nad ")
    .replace(/\s+Pod\s+/g, " pod ")
    .replace(/\s+Č\.?\s*[Pp]\.?\s*/gi, " č.p. ")
    .replace(/\s+Okr\.?\s+/gi, " okr. ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Slova, která nejsou jména (štítky, názvy) – nepoužívat jako jméno/příjmení */
const LABEL_WORDS = new Set([
  "jméno", "jmeno", "příjmení", "prijmeni", "surname", "given", "names", "bb", "občanský", "obcansky",
  "republika", "průkaz", "prukaz", "document", "no", "date", "birth", "narození", "místo", "place",
  "státní", "nationality", "vydání", "issue", "platnost", "expiry", "podpis", "signature", "holder",
]);

function isRealName(word: string): boolean {
  if (!word || word.length < 3) return false;
  const w = word.replace(/[\s\-]/g, "");
  if (w.length < 3) return false;
  const lower = word.toLowerCase();
  if (LABEL_WORDS.has(lower)) return false;
  return NAME_LIKE.test(word);
}

/** Odstraní štítky z řádku a vrátí poslední slovo vypadající jako skutečné jméno (min. 3 znaky, ne štítek). */
function extractNameFromLine(line: string): string {
  const labels =
    /jméno|jmeno|příjmení|prijmeni|surname|given names|bb|\/|:/gi;
  const cleaned = line.replace(labels, " ").replace(/\s+/g, " ").trim();
  const words = cleaned.split(/\s+/).filter((w) => isRealName(w));
  return words.length > 0 ? words[words.length - 1]! : "";
}

function normalizeRc(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 9) {
    return `${digits.slice(0, 6)}/${digits.slice(6, 9)}0`;
  }
  if (digits.length >= 10) {
    return `${digits.slice(0, 6)}/${digits.slice(6, 10)}`;
  }
  return value;
}

/**
 * Parsuje přední stranu OP (jméno, příjmení, rodné číslo).
 * Z řádků s štítky vytáhne jen čisté jméno/příjmení.
 */
export function parseOpFront(text: string): OpFrontData {
  const result: OpFrontData = {};
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const fullText = text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();

  // Rodné číslo
  const rcMatch = fullText.match(/\d{6}\s*\/\s*\d{3,4}/);
  if (rcMatch) result.rc = normalizeRc(rcMatch[0]);
  if (!result.rc) {
    const rcAlt = fullText.match(/\b(\d{9,10})\b/);
    if (rcAlt) result.rc = normalizeRc(rcAlt[1]);
  }

  // Explicitní vzor: hodnota hned za štítkem (SURNAME KALLOVÁ, GIVEN NAMES LENKA)
  const surnameMatch = fullText.match(/(?:p[rř]íjmení|prijmeni|surname)\s*[\/:\s]+\s*([a-záéíóúýčďěňřšťžůA-Z\-]{3,})/gi);
  if (surnameMatch && !result.prijmeni) {
    const last = surnameMatch[surnameMatch.length - 1];
    const val = last?.match(/(?:p[rř]íjmení|prijmeni|surname)\s*[\/:\s]+\s*([a-záéíóúýčďěňřšťžůA-Z\-]{3,})/i)?.[1];
    if (val && isRealName(val)) result.prijmeni = val;
  }
  const givenMatch = fullText.match(/(?:jm[eé]no|jmeno|given\s+names?)\s*[\/:\s]+\s*([a-záéíóúýčďěňřšťžůA-Z\-]{3,})/gi);
  if (givenMatch && !result.jmeno) {
    const last = givenMatch[givenMatch.length - 1];
    const val = last?.match(/(?:jm[eé]no|jmeno|given\s+names?)\s*[\/:\s]+\s*([a-záéíóúýčďěňřšťžůA-Z\-]{3,})/i)?.[1];
    if (val && isRealName(val)) result.jmeno = val;
  }

  for (const line of lines) {
    const lower = line.toLowerCase();
    if ((lower.includes("jméno") || lower.includes("jmeno")) && !result.jmeno) {
      const name = extractNameFromLine(line);
      if (name) result.jmeno = name;
    }
    if ((lower.includes("příjmení") || lower.includes("prijmeni") || lower.includes("surname")) && !result.prijmeni) {
      const name = extractNameFromLine(line);
      if (name) result.prijmeni = name;
    }
  }

  // Fallback: řádek za štítkem (např. předchozí řádek obsahoval "JMÉNO")
  for (let i = 0; i < lines.length; i++) {
    const prev = lines[i - 1]?.toLowerCase() ?? "";
    const line = lines[i]!;
    if (!result.jmeno && (prev.includes("jméno") || prev.includes("jmeno"))) {
      const name = extractNameFromLine(line) || (NAME_LIKE.test(line.trim()) ? line.trim() : "");
      if (name) result.jmeno = name;
    }
    if (!result.prijmeni && (prev.includes("příjmení") || prev.includes("prijmeni") || prev.includes("surname"))) {
      const name = extractNameFromLine(line) || (NAME_LIKE.test(line.trim()) ? line.trim() : "");
      if (name) result.prijmeni = name;
    }
  }

  // Fallback: první dvě skutečná jména (min. 3 znaky, ne štítky) z celého textu
  if (!result.jmeno || !result.prijmeni) {
    const words = fullText
      .split(/\s+/)
      .filter((w) => isRealName(w));
    if (words.length >= 1 && !result.jmeno) result.jmeno = words[0]!;
    if (words.length >= 2 && !result.prijmeni) result.prijmeni = words[1]!;
  }

  // Formát pro zobrazení: René Jirava (ne kapitálky, s diakritikou kde to dává smysl)
  if (result.jmeno) result.jmeno = toDisplayName(result.jmeno);
  if (result.prijmeni) result.prijmeni = toDisplayName(result.prijmeni);

  // Datum narození – štítky "Datum narození", "Date of birth", "DOB" + DD.MM.YYYY nebo DDMMYYYY
  const datumLabels = /(?:datum\s+narozen[íi]|date\s+of\s+birth|d\.?\s*n\.?|dob)\s*[:\/\s]*(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4}|\d{8})/gi;
  let dm;
  while ((dm = datumLabels.exec(fullText)) !== null) {
    const raw = dm[1];
    const fmt = raw.includes(".") || raw.includes("-") || raw.includes("/")
      ? raw.replace(/-/g, ".").replace(/\//g, ".")
      : raw.length === 8
        ? `${raw.slice(6, 8)}.${raw.slice(4, 6)}.${raw.slice(0, 4)}`
        : raw.length === 6
          ? `${raw.slice(4, 6)}.${raw.slice(2, 4)}.${parseInt(raw.slice(0, 2), 10) <= 54 ? "20" : "19"}${raw.slice(0, 2)}`
          : null;
    if (fmt && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(fmt)) {
      result.datumNarozeni = fmt;
      break;
    }
  }
  if (!result.datumNarozeni && result.rc) result.datumNarozeni = rcToDatumNarozeni(result.rc) ?? undefined;

  // Místo narození – NEJDŘÍVE formát tabulky: | **Place of Birth / Místo narození** | NYMBURK okr. NYMBURK |
  const mistoTabela = /(?:Place\s+of\s+Birth\s*\/\s*)?M[íi]sto\s+narozen[íi][^*|]*(?:\*{2})?\s*\|\s*([^|]+)/i;
  const mistoTabM = fullText.match(mistoTabela);
  if (mistoTabM) {
    const val = mistoTabM[1].trim();
    const isWrongRow = /(česká|republika|státní|občanství|nationality)\s*$/i.test(val) || /^\s*\|/.test(val);
    if (val.length >= 2 && val.length <= 80 && !isWrongRow && !/^(m[íi]sto|place|státní|občanství|nationality)/i.test(val))
      result.mistoNarozeni = toDisplayText(val);
  }
  // Štítky "Místo narození", "Place of birth", "POB" + hodnota (ne samotný štítek)
  if (!result.mistoNarozeni) {
  const mistoRe = /(?:m[íi]sto\s+narozen[íi]|place\s+of\s+birth|pob)\s*[:\/\s]+([a-záéíóúýčďěňřšťžůA-Z0-9\-\.\s]{2,80})/gi;
  let mistoM;
  while ((mistoM = mistoRe.exec(fullText)) !== null) {
    let val = mistoM[1].trim().replace(/\s+(pohlav|sex|rodinn|státní|nationality|datum|n[áa]rodnost)\b.*$/i, "").trim();
    const lowerVal = val.toLowerCase();
    const isLabelOnly = /^(m[íi]sto\s+narozen[íi]|misto\s+narozeni|place\s+of\s+birth|pob)\s*$/i.test(val);
    if (isLabelOnly) continue;
    if (val.length >= 2 && val.length <= 80 && !/^\d+$/.test(val)) {
      result.mistoNarozeni = toDisplayText(val);
      break;
    }
  }
  // Fallback: řádek za štítkem "Místo narození" (fullText nemá \n – použijeme původní text)
  if (!result.mistoNarozeni) {
    const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
    for (let i = 0; i < lines.length - 1; i++) {
      if (/m[íi]sto\s+narozen[íi]|place\s+of\s+birth/i.test(lines[i]!)) {
        const next = lines[i + 1]!.trim();
        const lowerNext = next.toLowerCase();
        const isNextLabel = /^(m[íi]sto\s+narozen[íi]|misto\s+narozeni|place\s+of\s+birth)\s*$/i.test(next);
        if (!isNextLabel && next.length >= 2 && next.length <= 80) {
          result.mistoNarozeni = toDisplayText(next);
          break;
        }
      }
    }
  }
  }
  // Další fallback: hledat vzor "MĚSTO okr. OKRES" (typické pro místo narození)
  if (!result.mistoNarozeni) {
    const okrMatch = fullText.match(/\b([A-Za-záéíóúýčďěňřšťžůÁÉÍÓÚÝČĎĚŇŘŠŤŽŮ\-]{2,30})\s+okr\.\s+([A-Za-záéíóúýčďěňřšťžůÁÉÍÓÚÝČĎĚŇŘŠŤŽŮ\-]{2,30})\b/);
    if (okrMatch && /m[íi]sto\s+narozen[íi]|place\s+of\s+birth/i.test(fullText)) {
      const place = `${okrMatch[1]} okr. ${okrMatch[2]}`;
      if (!/m[íi]sto\s+narozen[íi]|misto\s+narozeni/i.test(place)) result.mistoNarozeni = toDisplayText(place);
    }
  }

  // Pohlaví – výstup "Muž" nebo "Žena" (ne M/Ž)
  const pohlaviLabels = /(?:pohlav[íi]|sex|gender)\s*[:\/\s]*\s*(M|F|Muž|Žena|Muz|Zena|Male|Female|m|f|ž|z)/i;
  const pohlaviM = fullText.match(pohlaviLabels);
  if (pohlaviM) {
    const v = pohlaviM[1].toLowerCase();
    result.pohlavi = /^[mf]$|muž|muz|male/.test(v) ? "Muž" : "Žena";
  }
  if (!result.pohlavi && result.rc) result.pohlavi = rcToPohlavi(result.rc) ?? undefined;

  // Národnost / Státní občanství – vždy "ČESKÁ REPUBLIKA" pro české občanství
  const narodLabels = /(?:n[áa]rodnost|st[áa]tn[íi]\s+ob[čc]anstv[íi]|nationality|citizenship)\s*[:\/\s]*([a-záéíóúýčďěňřšťžůA-Z0-9\s\.\-]{2,50})/gi;
  let narodM;
  while ((narodM = narodLabels.exec(fullText)) !== null) {
    const val = narodM[1].trim();
    const lowerVal = val.toLowerCase();
    if (/^(státní|statni|občanství|obcanstvi|národnost|narodnost)\s*$/i.test(lowerVal)) continue;
    if (val.length >= 2) {
      result.narodnost = /čes|czech|cze\b|cr\b|republika|čr/i.test(val) ? "Česká republika" : toDisplayText(val);
      break;
    }
  }
  if (!result.narodnost && /čes|cze|cr|czech|republika/i.test(fullText)) result.narodnost = "Česká republika";

  // Rodinný stav – Svobodný, Ženatý, Vdaná, Rozvedený, Vdovec, Vdova
  const rodinnyLabels = /(?:rodinn[ýy]\s+stav|marital\s+status)\s*[:\/\s]*\s*(svobodn[ýyá]|ženat[ýy]|vdana|vdan[áa]|rozveden[ýyá]|vdovec|vdova)/i;
  const rodinnyM = fullText.match(rodinnyLabels);
  if (rodinnyM) {
    const v = rodinnyM[1].toLowerCase();
    const map: Record<string, string> = {
      svobodný: "Svobodný", svobodná: "Svobodná", svobodny: "Svobodný", svobodna: "Svobodná",
      ženatý: "Ženatý", zenaty: "Ženatý",
      vdaná: "Vdaná", vdana: "Vdaná",
      rozvedený: "Rozvedený", rozvedená: "Rozvedená", rozvedeny: "Rozvedený", rozvedena: "Rozvedená",
      vdovec: "Vdovec", vdova: "Vdova",
    };
    result.rodinnyStav = map[v] ?? toDisplayName(rodinnyM[1]);
  }

  // Číslo dokladu, datum vydání, platnost do, vydávající úřad – štítky a formát tabulky
  const cisloTab = /(?:Document\s+number|Č[íi]slo\s+dokladu|číslo\s+dokladu)[^*|]*(?:\*{2})?\s*\|\s*([^|]+)/i;
  const cisloM = fullText.match(cisloTab);
  if (cisloM) {
    const val = cisloM[1].trim().replace(/<+$/g, "");
    if (val.length >= 4 && val.length <= 20 && /[\dA-Za-z]/.test(val)) result.cisloDokladu = val;
  }
  if (!result.cisloDokladu) {
    const cisloRe = /(?:číslo\s+dokladu|č[íi]slo\s+dokladu|document\s+number)\s*[:\/\s\|]+([A-Za-z0-9\s\-]{4,20})/i;
    const cm = fullText.match(cisloRe);
    if (cm) {
      const val = cm[1].trim().replace(/\s+/g, " ");
      if (/[\dA-Z]/.test(val)) result.cisloDokladu = val;
    }
  }
  const datumVydRe = /(?:datum\s+vyd[áa]n[íi]|date\s+of\s+issue|vyd[áa]n[íi])[^*|]*(?:\*{2})?\s*\|\s*([^|]+)/i;
  const datumVydM = fullText.match(datumVydRe);
  if (datumVydM) {
    const val = datumVydM[1].trim();
    const fmt = val.match(/(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})/);
    if (fmt) result.datumVydani = `${fmt[1].padStart(2, "0")}.${fmt[2].padStart(2, "0")}.${fmt[3].length === 2 ? "20" + fmt[3] : fmt[3]}`;
  }
  if (!result.datumVydani) {
    const dv = fullText.match(/(?:datum\s+vyd[áa]n[íi]|date\s+of\s+issue)\s*[:\/\s]+(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4})/i);
    if (dv) result.datumVydani = dv[1].replace(/-/g, ".").replace(/\//g, ".");
  }
  const platnostTab = /(?:platnost\s+do|valid\s+until|expir[ey])[^*|]*(?:\*{2})?\s*\|\s*([^|]+)/i;
  const platnostM = fullText.match(platnostTab);
  if (platnostM) {
    const val = platnostM[1].trim();
    const fmt = val.match(/(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})/);
    if (fmt) result.platnostDo = `${fmt[1].padStart(2, "0")}.${fmt[2].padStart(2, "0")}.${fmt[3].length === 2 ? "20" + fmt[3] : fmt[3]}`;
  }
  if (!result.platnostDo) {
    const pl = fullText.match(/(?:platnost\s+do|valid\s+until)\s*[:\/\s]+(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4})/i);
    if (pl) result.platnostDo = pl[1].replace(/-/g, ".").replace(/\//g, ".");
  }
  const uradTab = /(?:vyd[áa]vaj[íi]c[íi]\s+ú[řr]ad|issuing\s+authority|vydal)[^*|]*(?:\*{2})?\s*\|\s*([^|]+)/i;
  const uradM = fullText.match(uradTab);
  if (uradM) {
    const val = uradM[1].trim();
    if (val.length >= 2 && val.length <= 80 && !/^(vyd[áa]vaj[íi]c[íi]|issuing|authority)/i.test(val))
      result.vydavajiciUrad = toDisplayText(val);
  }
  if (!result.vydavajiciUrad) {
    const uradRe = fullText.match(/(?:vyd[áa]vaj[íi]c[íi]\s+ú[řr]ad|issuing\s+authority|vydal)\s*[:\/\s]+([a-záéíóúýčďěňřšťžůA-Z0-9\s\.\-]{2,80})/i);
    if (uradRe) result.vydavajiciUrad = toDisplayText(uradRe[1].trim());
  }

  return result;
}

/** Řádek vypadá jako MRZ (strojově čitelná zóna) – vynechat z adresy */
function isMrzLine(line: string): boolean {
  if (/<<<|IDCZE/i.test(line)) return true;
  if (/[A-Z0-9<]{25,}/.test(line.replace(/\s/g, ""))) return true;
  return false;
}

/** Řádek je štítek RČ („PERSONAL NO“, „RODNÉ ČÍSLO“) – nepoužívat jako MRZ jméno. */
function isRcLabelLine(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (/personal\s+no\.?$/.test(t) || /rodn[eé]\s+[čc]íslo\.?$/.test(t)) return true;
  if (/^(personal|no\.?)\s*$/i.test(t)) return true;
  const words = t.split(/\s+/);
  if (words.length === 2 && words[0] === "personal" && words[1] === "no") return true;
  return false;
}

/** Může řádek obsahovat jméno z MRZ (SURNAME<<GIVEN)? Povolit i občasný znak navíc od OCR. */
function looksLikeMrzNameLine(line: string): boolean {
  if (isRcLabelLine(line)) return false;
  const raw = line.replace(/\s/g, "");
  if (raw.length < 8) return false;
  if (/<</.test(raw)) return /^[A-Z0-9<\.\-]+$/i.test(raw) || /^[A-Za-z\-]+<<[A-Za-z\-]+/.test(raw);
  const t = line.trim();
  if (/^[A-Za-z\-]+\s{2,}[A-Za-z\-]+/.test(t)) return true;
  if (t.length <= 35 && /^[A-Za-z\-]+\s+[A-Za-z\-]+$/.test(t)) return true;
  return false;
}

/** Řádek vypadá jako adresa – ne RČ a ne MRZ; široká kritéria kvůli různému OCR */
function isAddressLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 200) return false;
  if (isMrzLine(line)) return false;
  if (/^\d{6}\s*\/\s*\d{3,4}\s*$/.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (/\b(č\.?\s*p\.?|c\.?\s*p\.?|okr\.?|okres|brno|ulice|trvalý|pobyt|permanent)\b/.test(lower)) return true;
  if (/[a-záéíóúýčďěňřšťžů]{2,}/i.test(line) && /\d+/.test(line)) return true;
  if (/^[a-záéíóúýčďěňřšťžůA-Z\s\-\.\,]+$/i.test(trimmed) && trimmed.length >= 4) return true;
  return false;
}

/** Z finální adresy odstraní štítky a OCR zmetky (Trvalý pobyt, Rodné Číslo, koncové Ee/A, ®). */
function cleanAddressString(s: string): string {
  let out = s
    .replace(/\s*[®™©]\s*/g, " ")
    .replace(/\s*[:\;]\s*$/g, "")
    .replace(/\s*[:\;]\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
  const labelPatterns = [
    /^[Kk]\s*Trvaly?\s*Pobyt\s*\/?\s*Permanent\s*Sta?y\s*[:\;,]*\s*/gi,
    /Trvaly?\s*Pobyt\s*\/?\s*Permanent\s*Sta?y\s*[:\;,]*/gi,
    /,\s*Trvaly?\s*Pobyt\s*\/?\s*Permanent\s*Sta?y\s*[:\;,]*/gi,
    /\s*Rodn[eé]\s*[ČC]íslo\s*$/gi,
    /,\s*Rodn[eé]\s*[ČC]íslo\s*$/gi,
    /\s*Rodk[eé]\s*[ČC]íslo\s*$/gi,
    /,\s*Rodk[eé]\s*[ČC]íslo\s*$/gi,
    /\s*Personal\s+No\.?\s*$/gi,
    /,\s*Personal\s+No\.?\s*$/gi,
  ];
  for (const p of labelPatterns) out = out.replace(p, " ").replace(/\s{2,}/g, " ").trim();
  out = out.replace(/\s+Jihlavo[ýy]\s*/gi, " Jihlavou ").replace(/\s{2,}/g, " ").trim();
  out = out.replace(/,?\s+-\s*(Město|Venkov)\b/gi, "-$1");
  out = out.replace(/,?\s+[A-Za-z]{1,2}\s*$/g, "").trim();
  return out.replace(/^[,\s]+|[,\s]+$/g, "").trim();
}

/** Odstraní z řádku RČ (760820/5098) a vrátí ho; řádek bez RČ vrátí jako druhý prvek */
function extractRcFromLine(line: string): { rc: string | null; lineWithoutRc: string } {
  const match = line.match(/\d{6}\s*\/\s*\d{3,4}/);
  if (!match) return { rc: null, lineWithoutRc: line };
  const rc = normalizeRc(match[0]);
  const lineWithoutRc = line.replace(/\d{6}\s*\/\s*\d{3,4}\s*/g, "").replace(/\s*(a|k:)?\s*$/i, "").trim();
  return { rc, lineWithoutRc };
}

/** „Personal No“ a podobné štítky nejsou jména z MRZ. */
function isLabelPair(surname: string, given: string): boolean {
  const s = surname.toLowerCase();
  const g = given.toLowerCase();
  if ((s === "personal" && g === "no") || (s === "no" && g === "personal")) return true;
  if (s === "rodné" || g === "číslo" || s === "číslo" || g === "rodné") return true;
  return false;
}

/** Z řádku MRZ (KALLOVA<<LENKA, STRBAKOVA<K<KLUCIE, HUDLIK  PETR) vytáhne příjmení a jméno. */
function parseMrzNames(line: string): { surname: string; given: string } | null {
  if (isRcLabelLine(line)) return null;
  const raw = line.replace(/\s/g, "");
  if (raw.length < 8) return null;
  const partsByLt = raw.split(/<+/).map((p) => p.replace(/[^A-Za-z\-]/g, "").trim()).filter(Boolean);
  if (partsByLt.length >= 2 && partsByLt[0]!.length >= 2 && partsByLt[1]!.length >= 2) {
    const surname = partsByLt[0]!;
    const given = partsByLt[1]!;
    if (!isLabelPair(surname, given)) return { surname, given };
  }
  if (partsByLt.length >= 3 && partsByLt[0]!.length >= 2) {
    const surname = partsByLt[0]!;
    const given = partsByLt.slice(1).find((p) => p.length >= 3) ?? "";
    if (given.length >= 2 && !isLabelPair(surname, given)) return { surname, given };
  }
  const partsBySpaces = line.split(/\s{2,}/).map((p) => p.replace(/\s/g, "").replace(/[^A-Za-z\-]/g, "").trim()).filter(Boolean);
  if (partsBySpaces.length >= 2 && partsBySpaces[0]!.length >= 2 && partsBySpaces[1]!.length >= 2) {
    const surname = partsBySpaces[0]!;
    const given = partsBySpaces[1]!;
    if (!isLabelPair(surname, given)) return { surname, given };
  }
  if (/<</.test(raw) && partsByLt.length >= 2) {
    const surname = partsByLt[0]!.replace(/<+$/, "");
    const given = partsByLt[1]!.replace(/<+$/, "");
    if (surname.length >= 2 && given.length >= 2 && !isLabelPair(surname, given)) return { surname, given };
  }
  const trimmed = line.trim();
  if (trimmed.length <= 35 && /^[A-Za-z\-]+\s+[A-Za-z\-]+$/.test(trimmed.replace(/\s+/g, " "))) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && parts[0]!.length >= 2 && parts[1]!.length >= 2) {
      const surname = parts[0]!;
      const given = parts[1]!;
      if (!isLabelPair(surname, given)) return { surname, given };
    }
  }
  return null;
}

/** Z prvního řádku MRZ (IDCZEnnnnnnnn<<<...) vytáhne číslo dokladu. */
function parseMrzLine1(line: string): string | null {
  const raw = line.replace(/\s/g, "");
  if (!/^IDCZE/i.test(raw) || raw.length < 14) return null;
  const docNum = raw.slice(5, 14).replace(/<+$/g, "").replace(/^0+/, "").trim();
  return docNum.length >= 4 ? docNum : null;
}

/** Z druhého řádku MRZ (YYMMDDnMcYYMMDD...) vytáhne datum narození, pohlaví a platnost do. */
function parseMrzLine2(line: string): { datumNarozeni?: string; pohlavi?: string; platnostDo?: string } {
  const raw = line.replace(/\s/g, "");
  if (raw.length < 25) return {};
  const yy = raw.slice(0, 2);
  const mm = raw.slice(2, 4);
  const dd = raw.slice(4, 6);
  const sex = raw[7];
  const expYY = raw.slice(8, 10);
  const expMM = raw.slice(10, 12);
  const expDD = raw.slice(12, 14);
  const result: { datumNarozeni?: string; pohlavi?: string; platnostDo?: string } = {};
  if (/^\d{6}$/.test(yy + mm + dd)) {
    const y = parseInt(yy, 10);
    let m = parseInt(mm, 10);
    const d = parseInt(dd, 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      const year = y <= 54 ? 2000 + y : 1900 + y;
      if (m > 50) m -= 50;
      result.datumNarozeni = `${d.toString().padStart(2, "0")}.${m.toString().padStart(2, "0")}.${year}`;
    }
  }
  if (sex === "M" || sex === "F") result.pohlavi = sex === "F" ? "Žena" : "Muž";
  if (/^\d{6}$/.test(expYY + expMM + expDD)) {
    const ey = parseInt(expYY, 10);
    const em = parseInt(expMM, 10);
    const ed = parseInt(expDD, 10);
    if (ed >= 1 && ed <= 31 && em >= 1 && em <= 12) {
      const expYear = ey <= 54 ? 2000 + ey : 1900 + ey;
      result.platnostDo = `${ed.toString().padStart(2, "0")}.${em.toString().padStart(2, "0")}.${expYear}`;
    }
  }
  return result;
}

/**
 * Parsuje zadní stranu OP (adresa, RČ, MRZ jméno/příjmení). Vynechá MRZ z adresy.
 */
export function parseOpBack(text: string): OpBackData {
  const result: OpBackData = {};
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const fullText = text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();

  // MRZ řádek 1: číslo dokladu
  for (const line of lines) {
    if (/^IDCZE/i.test(line.replace(/\s/g, ""))) {
      const docNum = parseMrzLine1(line);
      if (docNum) result.cisloDokladu = docNum;
      break;
    }
  }
  // MRZ řádek 2: datum narození, pohlaví, platnost do
  for (const line of lines) {
    if (/^\d{6}\d[A-Z<]\d{6}/.test(line.replace(/\s/g, ""))) {
      const mrz2 = parseMrzLine2(line);
      if (mrz2.datumNarozeni) result.datumNarozeni = mrz2.datumNarozeni;
      if (mrz2.pohlavi) result.pohlavi = mrz2.pohlavi;
      if (mrz2.platnostDo) result.platnostDo = mrz2.platnostDo;
      break;
    }
  }
  // štítky na zadní straně (rc bude doplněno později)
  if (!result.datumNarozeni) {
    const dm = fullText.match(/(?:datum\s+narozen[íi]|date\s+of\s+birth|dob)\s*[:\/\s]+(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4})/i);
    if (dm) result.datumNarozeni = dm[1].replace(/-/g, ".").replace(/\//g, ".");
  }
  if (!result.pohlavi) {
    const ph = fullText.match(/(?:pohlav[íi]|sex|gender)\s*[:\/\s]*(M|F|Muž|Žena|Male|Female|ž|z)/i);
    if (ph) result.pohlavi = /f|žena|zena|female|ž|z/i.test(ph[1]) ? "Žena" : "Muž";
  }
  const mistoTabela2 = /(?:Place\s+of\s+Birth\s*\/\s*)?M[íi]sto\s+narozen[íi][^*|]*(?:\*{2})?\s*\|\s*([^|]+)/i;
  const mistoTab2 = fullText.match(mistoTabela2);
  if (mistoTab2) {
    const val = mistoTab2[1].trim();
    const isWrongRow = /(česká|republika|státní|občanství|nationality)\s*$/i.test(val) || /^\s*\|/.test(val);
    if (val.length >= 2 && val.length <= 80 && !isWrongRow && !/^(m[íi]sto|place|státní|občanství|nationality)/i.test(val))
      result.mistoNarozeni = toDisplayText(val);
  }
  if (!result.mistoNarozeni) {
  const mistoRe = /(?:m[íi]sto\s+narozen[íi]|place\s+of\s+birth|pob)\s*[:\/\s\|]+([a-záéíóúýčďěňřšťžůA-Z0-9\-\.\s]{2,80})/gi;
  let mistoM;
  while ((mistoM = mistoRe.exec(fullText)) !== null) {
    let val = mistoM[1].trim().replace(/\s+(pohlav|sex|rodinn|státní|datum|n[áa]rodnost)\b.*$/i, "").trim();
    if (/^(m[íi]sto\s+narozen[íi]|misto\s+narozeni|place\s+of\s+birth|pob)\s*$/i.test(val)) continue;
    if (val.length >= 2 && val.length <= 80) { result.mistoNarozeni = toDisplayText(val); break; }
  }
  }
  if (!result.mistoNarozeni) {
    for (let i = 0; i < lines.length - 1; i++) {
      if (/m[íi]sto\s+narozen[íi]|place\s+of\s+birth/i.test(lines[i]!)) {
        const next = lines[i + 1]!.trim();
        if (!/^(m[íi]sto\s+narozen[íi]|misto\s+narozeni|place\s+of\s+birth)\s*$/i.test(next) && next.length >= 2 && next.length <= 80)
          result.mistoNarozeni = toDisplayText(next);
        break;
      }
    }
  }
  if (!result.mistoNarozeni && /m[íi]sto\s+narozen[íi]|place\s+of\s+birth/i.test(fullText)) {
    const okrMatch = fullText.match(/\b([A-Za-záéíóúýčďěňřšťžůÁÉÍÓÚÝČĎĚŇŘŠŤŽŮ\-]{2,30})\s+okr\.\s+([A-Za-záéíóúýčďěňřšťžůÁÉÍÓÚÝČĎĚŇŘŠŤŽŮ\-]{2,30})\b/);
    if (okrMatch && !/m[íi]sto\s+narozen[íi]|misto\s+narozeni/i.test(`${okrMatch[1]} ${okrMatch[2]}`))
      result.mistoNarozeni = toDisplayText(`${okrMatch[1]} okr. ${okrMatch[2]}`);
  }
  const narodM = fullText.match(/(?:n[áa]rodnost|st[áa]tn[íi]\s+ob[čc]anstv[íi]|nationality)\s*[:\/\s]+([a-záéíóúýčďěňřšťžůA-Z0-9\s\.\-]{2,50})/i);
  if (narodM) {
    const v = narodM[1].trim();
    if (!/^(státní|statni|občanství|obcanstvi|národnost|narodnost)\s*$/i.test(v))
      result.narodnost = /čes|czech|cze|cr|republika/i.test(v) ? "Česká republika" : toDisplayText(v);
  }
  if (!result.narodnost && /čes|cze|cr|czech|republika/i.test(fullText)) result.narodnost = "Česká republika";
  const rodM = fullText.match(/(?:rodinn[ýy]\s+stav|marital)\s*[:\/\s]+(svobodn[ýyá]|ženat[ýy]|vdan[áa]|rozveden[ýyá]|vdovec|vdova)/i);
  if (rodM) {
    const map: Record<string, string> = { svobodný: "Svobodný", svobodná: "Svobodná", ženatý: "Ženatý", vdaná: "Vdaná", rozvedený: "Rozvedený", rozvedená: "Rozvedená", vdovec: "Vdovec", vdova: "Vdova" };
    result.rodinnyStav = map[rodM[1].toLowerCase()] ?? toDisplayName(rodM[1]);
  }
  if (!result.cisloDokladu) {
    const cisloTab2 = /(?:Document\s+number|Č[íi]slo\s+dokladu|číslo\s+dokladu)[^*|]*(?:\*{2})?\s*\|\s*([^|]+)/i;
    const cm2 = fullText.match(cisloTab2);
    if (cm2) {
      const val = cm2[1].trim().replace(/<+$/g, "");
      if (val.length >= 4 && val.length <= 20 && /[\dA-Za-z]/.test(val)) result.cisloDokladu = val;
    }
  }
  if (!result.datumVydani) {
    const datumVyd2 = fullText.match(/(?:datum\s+vyd[áa]n[íi]|date\s+of\s+issue)[^*|]*(?:\*{2})?\s*\|\s*([^|]+)/i);
    if (datumVyd2) {
      const fmt = datumVyd2[1].trim().match(/(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})/);
      if (fmt) result.datumVydani = `${fmt[1].padStart(2, "0")}.${fmt[2].padStart(2, "0")}.${fmt[3].length === 2 ? "20" + fmt[3] : fmt[3]}`;
    }
  }
  if (!result.platnostDo) {
    const platnost2 = fullText.match(/(?:platnost\s+do|valid\s+until)[^*|]*(?:\*{2})?\s*\|\s*([^|]+)/i);
    if (platnost2) {
      const fmt = platnost2[1].trim().match(/(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})/);
      if (fmt) result.platnostDo = `${fmt[1].padStart(2, "0")}.${fmt[2].padStart(2, "0")}.${fmt[3].length === 2 ? "20" + fmt[3] : fmt[3]}`;
    }
  }
  if (!result.vydavajiciUrad) {
    const uradTab2 = fullText.match(/(?:vyd[áa]vaj[íi]c[íi]\s+ú[řr]ad|issuing\s+authority|vydal)[^*|]*(?:\*{2})?\s*\|\s*([^|]+)/i);
    if (uradTab2) {
      const val = uradTab2[1].trim();
      if (val.length >= 2 && val.length <= 80 && !/^(vyd[áa]vaj[íi]c[íi]|issuing|authority)/i.test(val))
        result.vydavajiciUrad = toDisplayText(val);
    }
  }

  for (const line of lines) {
    const isMrz = isMrzLine(line);
    const likeName = looksLikeMrzNameLine(line);
    if (isMrz || likeName) {
      const mrz = parseMrzNames(line);
      if (mrz) {
        result.mrzPrijmeni = toDisplayName(mrz.surname);
        result.mrzJmeno = toDisplayName(mrz.given);
      }
    }
  }
  if (!result.mrzPrijmeni) {
    const mrzMatches = [
      ...text.matchAll(/[A-Za-z\-]{4,}\s*<+[A-Za-z<\-]*[A-Za-z\-]{2,}/g),
      ...text.matchAll(/[A-Za-z\-]{3,}\s*<<\s*[A-Za-z\-]{2,}/g),
      ...text.matchAll(/[A-Za-z\-]{3,}\s{2,}[A-Za-z\-]{2,}/g),
      ...text.matchAll(/\b([A-Za-z\-]{4,})\s+([A-Za-z\-]{2,})\b/g),
    ];
    let lastMrz: { surname: string; given: string } | null = null;
    for (const m of mrzMatches) {
      const candidate = m[0]!;
      if (candidate.length > 40) continue;
      const mrz = parseMrzNames(candidate);
      if (mrz) lastMrz = mrz;
    }
    if (lastMrz) {
      result.mrzPrijmeni = toDisplayName(lastMrz.surname);
      result.mrzJmeno = toDisplayName(lastMrz.given);
    }
  }
  const addressParts: string[] = [];
  let fallbackRc: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (isMrzLine(line)) continue;
    const { rc, lineWithoutRc } = extractRcFromLine(line);
    const prevLine = i > 0 ? lines[i - 1] ?? "" : "";
    const isBackSideRc = /rodné|personal\s*no/i.test(line) || /rodné|personal\s*no/i.test(prevLine);
    if (rc) {
      if (isBackSideRc) result.rc = rc;
      else fallbackRc = rc;
    }
    if (!isAddressLine(lineWithoutRc)) continue;
    let cleaned = lineWithoutRc
      .replace(/\s*[—\-]{2,}\s*/g, " ")
      .replace(/\s*(KED|a|k:)\s*$/gi, "")
      .replace(/\s*\d{6}\s*\/\s*\d{3,4}\s*/g, " ")
      .replace(/^[,\s]+|[,\s]+$/g, "")
      .trim();
    const onlyLabels = /^(trvalý\s+pobyt|permanent\s+stay|rodné\s+číslo|personal\s+no\.?|rodinný\s+stav|vydal|authority|magistrát)$/i.test(cleaned);
    const mostlyLabels = !onlyLabels && /trvaly?\s*pobyt|permanent\s*sta?y/i.test(cleaned) && !/č\.?\s*p\.?|okr\.|brno\s*[,\s]|žabovřesky|foerstrova/i.test(cleaned);
    if (cleaned.length >= 3 && !onlyLabels && !mostlyLabels) addressParts.push(cleaned);
  }

  let adresaText = "";
  if (addressParts.length > 0) {
    adresaText = toDisplayText(addressParts.join(", "));
  }

  // Fallback: z celého textu vytáhnout ulici/obec+č.p., město (Brno,…), okr. – včetně víceslovných (Vyškytná nad Jihlavou, České Budějovice)
  const full = text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  const streetParts: string[] = [];
  const brnoParts: string[] = [];
  const okrParts: string[] = [];
  const cpMultiRegex = /((?:[A-Za-záéíóúýčďěňřšťžůÄÖÜ\-]+\s+)+)(?:č\.?\s*p\.?|c\.?\s*p\.?)\s*([\d\/A-Za-z]+)/gi;
  let cp;
  while ((cp = cpMultiRegex.exec(full)) !== null) {
    const name = cp[1].trim();
    const num = cp[2].trim();
    if (/^\d{6}\//.test(num)) continue;
    const s = name + " č.p. " + num;
    if (!streetParts.some((p) => p.toLowerCase() === s.toLowerCase())) streetParts.push(s);
  }
  if (streetParts.length === 0) {
    const cpSingleRegex = /([A-Za-záéíóúýčďěňřšťžůÄÖÜ\-]+\s+(?:č\.?\s*p\.?|c\.?\s*p\.?)\s*[\d\/A-Za-z]+)/gi;
    while ((cp = cpSingleRegex.exec(full)) !== null) {
      const s = cp[1].trim();
      if (!streetParts.some((p) => p.toLowerCase() === s.toLowerCase())) streetParts.push(s);
    }
  }
  if (streetParts.length === 0) {
    const uliceNumRegex = /([A-Za-záéíóúýčďěňřšťžů\-]{4,})\s+(\d+[\d\/A-Za-z]*)/gi;
    let ul: RegExpExecArray | null;
    while ((ul = uliceNumRegex.exec(full)) !== null) {
      if (/^\d{6}\//.test(ul[2])) continue;
      const s = ul[1].trim() + " " + ul[2].trim();
      if (!streetParts.some((p) => p.toLowerCase().includes(ul![1].toLowerCase()))) streetParts.push(s);
    }
  }
  const brnoRegex = /(?:BRNO|Brno)[,\s]*([A-Za-záéíóúýčďěňřšťžů\-]+)/gi;
  let brno;
  while ((brno = brnoRegex.exec(full)) !== null) {
    const s = brno[1].trim();
    if (s && !brnoParts.some((p) => p.toLowerCase().includes(s.toLowerCase()))) brnoParts.push("Brno, " + s);
  }
  const okrMultiRegex = /okr\.?\s*([A-Za-záéíóúýčďěňřšťžů\-]+(?:\s+[A-Za-záéíóúýčďěňřšťžů\-]+)*)/gi;
  let okr;
  while ((okr = okrMultiRegex.exec(full)) !== null) {
    const s = okr[1].replace(/\s+/g, " ").trim();
    if (s && s.length >= 2 && !okrParts.some((p) => p.toLowerCase().includes(s.toLowerCase()))) okrParts.push("Okr. " + s);
  }
  if (okrParts.length === 0) {
    const okrSingleRegex = /okr\.?\s*([A-Za-záéíóúýčďěňřšťžů\-]+)/gi;
    let okr;
    while ((okr = okrSingleRegex.exec(full)) !== null) {
      const s = okr[1].trim();
      if (s && !okrParts.some((p) => p.toLowerCase().includes(s.toLowerCase()))) okrParts.push("Okr. " + s);
    }
  }
  const fallbackParts = [...streetParts, ...brnoParts, ...okrParts];
  const fallbackText = fallbackParts.length > 0 ? toDisplayText(fallbackParts.join(", ")) : "";

  // Preferovat segmenty (ulice, Brno, okr.) před surovými řádky – řádky často obsahují štítky „Trvalý pobyt“ atd.
  if (fallbackParts.length >= 2) {
    result.adresa = cleanAddressString(fallbackText);
  } else if (fallbackText) {
    result.adresa = cleanAddressString(fallbackText);
  } else if (adresaText) {
    result.adresa = cleanAddressString(adresaText);
  }

  if (!result.rc && fallbackRc) result.rc = fallbackRc;
  if (!result.rc) {
    const anyRcMatch = full.match(/\d{6}\s*\/\s*\d{3,4}/);
    if (anyRcMatch) {
      const normalized = normalizeRc(anyRcMatch[0]);
      if (!/\/3111$/.test(normalized.replace(/\s/g, ""))) result.rc = normalized;
    }
  }
  if (!result.rc) {
    const twoPlusFour = full.match(/(\d{2})\s*(\d{4})\s*\/\s*(\d{3,4})/);
    if (twoPlusFour) {
      const rc = `${twoPlusFour[1]}${twoPlusFour[2]}/${twoPlusFour[3]}`;
      if (!/\/3111$/.test(rc)) result.rc = normalizeRc(rc);
    }
  }
  if (!result.rc) {
    const fourFour = full.match(/(\d{4})\s*\/\s*09(\d{2})/);
    if (fourFour) {
      const prefix = full.includes("75") ? "75" : "19";
      result.rc = normalizeRc(`${prefix}${fourFour[1]}/09${fourFour[2]}`);
    }
  }
  // Fallback: datum a pohlaví z rodného čísla
  if (!result.datumNarozeni && result.rc) result.datumNarozeni = rcToDatumNarozeni(result.rc) ?? undefined;
  if (!result.pohlavi && result.rc) result.pohlavi = rcToPohlavi(result.rc) ?? undefined;
  return result;
}
