export type DoctlyIdCountry = "CZ" | "SK" | null;
export type DoctlyIdSex = "M" | "F" | null;
export type DoctlyIdConfidence = "high" | "medium" | "low";

export interface DoctlyIdExtraction {
  documentType: "ID_CARD";
  country: DoctlyIdCountry;
  holder: {
    givenNames: string | null;
    surname: string | null;
    surnameAtBirth: string | null;
    sex: DoctlyIdSex;
    dateOfBirth: string | null; // YYYY-MM-DD
    personalNumber: string | null;
    placeOfBirth: string | null;
    nationality: string | null;
  };
  document: {
    documentNumber: string | null;
    dateOfIssue: string | null; // YYYY-MM-DD
    dateOfExpiry: string | null; // YYYY-MM-DD
    issuedBy: string | null;
  };
  address: {
    fullAddress: string | null;
  };
  mrz: {
    raw: string | null;
  };
  quality: {
    confidence: DoctlyIdConfidence;
    missingCriticalFields: string[];
    notes: string[];
  };
}

function asStringOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function normalizeSex(v: unknown): DoctlyIdSex {
  const s = asStringOrNull(v)?.toUpperCase();
  if (s === "M" || s === "F") return s;
  return null;
}

function normalizeConfidence(v: unknown): DoctlyIdConfidence {
  const s = asStringOrNull(v)?.toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return "low";
}

function normalizeCountry(v: unknown): DoctlyIdCountry {
  const s = asStringOrNull(v)?.toUpperCase();
  if (s === "CZ" || s === "SK") return s;
  return null;
}

/** Guard + normalizace payloadu z Doctly extractoru do stabilního schema tvaru. */
export function parseDoctlyIdExtraction(payload: unknown): DoctlyIdExtraction | null {
  if (!isRecord(payload)) return null;
  const documentType = asStringOrNull(payload.documentType);
  if (documentType !== "ID_CARD") return null;

  const holder = isRecord(payload.holder) ? payload.holder : {};
  const document = isRecord(payload.document) ? payload.document : {};
  const address = isRecord(payload.address) ? payload.address : {};
  const mrz = isRecord(payload.mrz) ? payload.mrz : {};
  const quality = isRecord(payload.quality) ? payload.quality : {};

  return {
    documentType: "ID_CARD",
    country: normalizeCountry(payload.country),
    holder: {
      givenNames: asStringOrNull(holder.givenNames),
      surname: asStringOrNull(holder.surname),
      surnameAtBirth: asStringOrNull(holder.surnameAtBirth),
      sex: normalizeSex(holder.sex),
      dateOfBirth: asStringOrNull(holder.dateOfBirth),
      personalNumber: asStringOrNull(holder.personalNumber),
      placeOfBirth: asStringOrNull(holder.placeOfBirth),
      nationality: asStringOrNull(holder.nationality),
    },
    document: {
      documentNumber: asStringOrNull(document.documentNumber),
      dateOfIssue: asStringOrNull(document.dateOfIssue),
      dateOfExpiry: asStringOrNull(document.dateOfExpiry),
      issuedBy: asStringOrNull(document.issuedBy),
    },
    address: {
      fullAddress: asStringOrNull(address.fullAddress),
    },
    mrz: {
      raw: asStringOrNull(mrz.raw),
    },
    quality: {
      confidence: normalizeConfidence(quality.confidence),
      missingCriticalFields: asStringArray(quality.missingCriticalFields),
      notes: asStringArray(quality.notes),
    },
  };
}

export function isoDateToCzDate(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function sexToUiValue(v: DoctlyIdSex): string | null {
  if (v === "F") return "Žena";
  if (v === "M") return "Muž";
  return null;
}

