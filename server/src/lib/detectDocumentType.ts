/**
 * Z rozpoznaného OCR textu určí typ dokumentu (OP přední/zadní, daňové, výpisy).
 */

export type DocumentType = "op-predni" | "op-zadni" | "danove" | "vypisy";

const DOCUMENT_TYPES: DocumentType[] = ["op-predni", "op-zadni", "danove", "vypisy"];

export function detectDocumentType(ocrText: string, filename?: string): DocumentType {
  const t = (ocrText || "").trim();
  const lower = t.toLowerCase();
  const fn = (filename || "").toLowerCase();

  // Nápověda z názvu souboru (např. op_predni.jpg, OP první strana, OP-zadni.png)
  if (/op[_\-\s]?(predni|front|prední|prvn[ií]|prvni|1)\b/.test(fn) || /op\s+prvn/.test(fn)) return "op-predni";
  if (/op[_\-\s]?(zadni|back|zadní|druh[iá]|druha|2)\b/.test(fn) || /op\s+druh/.test(fn)) return "op-zadni";
  if (/dan(e|ov)|dph|priznani|přiznání/.test(fn)) return "danove";

  if (t.length < 10) return "vypisy";

  // Zadní strana OP: adresa trvalého bydliště, č.p., okr., často MRZ
  const hasAddressLabel =
    /\b(adresa|trval[eé]ho\s+bydli[sš]t[eě]|trval[eé]\s+bydli[sš]t[eě])\b/i.test(t) ||
    /\b(č\.?\s*p\.|okr\.|okres|psč)\b/i.test(t);
  const hasAddressContent =
    /(č\.?\s*p\.|okr\.|okres)\s*\d+/i.test(t) || (/\d{5}\s+[a-záéíóúýčďěňřšťžů]/i.test(t) && /\d{6}\s*\/\s*\d{3,4}/.test(t));
  const hasMrz = /<<<|IDCZE|IDCZE/i.test(t) || /[A-Z0-9<]{25,}/.test(t.replace(/\s/g, ""));
  if ((hasAddressLabel || hasAddressContent) && (hasMrz || hasAddressContent)) {
    return "op-zadni";
  }

  // Přední strana OP: jméno, příjmení, číslo dokladu (RČ může být až na zadní)
  const hasNameLabels =
    /\b(given\s+names?|surname|jm[eé]no|p[rř]íjmení|prijmeni|rodn[eé]\s+[cč]íslo|rodne\s+cislo)\b/i.test(t);
  const hasRc = /\d{6}\s*\/\s*\d{3,4}/.test(t);
  const hasDocId = /\b(občansk[yý]\s*pr[uů]kaz|identity\s*card|č[ií]slo\s*dokladu|document\s*no\.?)\b/i.test(t);
  if (hasNameLabels && (hasRc || hasDocId)) {
    return "op-predni";
  }
  // MRZ + číslo dokladu bez adresních štítků → přední (zadní má adresu)
  if (hasMrz && (hasRc || hasDocId) && !hasAddressLabel) {
    return "op-predni";
  }

  // Daňové přiznání / potvrzení o příjmech
  if (
    /\b(p[rř]íjmy|prijmy|p[rř]íjem|dan[eě]|daň|dph|dpfo|dpp|potvrzení|potvrzuji|čssz|cssz)\b/i.test(t) ||
    /\b(hrub[eé]|čist[eé]|mzda|zam[eě]stnan)\b/i.test(t)
  ) {
    return "danove";
  }

  return "vypisy";
}

export function isAllowedDocumentType(s: string): s is DocumentType {
  return DOCUMENT_TYPES.includes(s as DocumentType);
}
