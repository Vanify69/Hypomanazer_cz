/**
 * Mapování Case + ExtractedData na FillModel pro rozšíření prohlížeče.
 */
import type { Case, ExtractedData } from "./prisma.js";

export type FillModelApplicant = {
  applicantId: string;
  role: "primary" | "coapplicant" | "other";
  firstName: string;
  lastName: string;
  birthNumber?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    houseNumber?: string;
    city?: string;
    zip?: string;
    countryCode?: string;
  };
  employment?: {
    status?: string;
    employerName?: string;
    contractType?: string;
    probation?: boolean;
  };
  income?: {
    netMonthly?: number;
    grossMonthly?: number;
    otherMonthly?: number;
  };
  expenses?: {
    totalMonthly?: number;
  };
};

export type FillModelPayload = {
  version: "1.0";
  caseId: string;
  updatedAt: string;
  applicants: FillModelApplicant[];
  loan?: {
    amount?: number;
    purpose?: "purchase" | "refinance" | "construction" | "other";
    maturityYears?: number;
    fixationYears?: number;
    ltv?: number;
  };
  property?: {
    type?: "flat" | "house" | "land" | "other";
    value?: number;
    address?: { street?: string; houseNumber?: string; city?: string; zip?: string; countryCode?: string };
  };
};

/** Rozparsuje adresu (jednotný řetězec) na pole – jednoduchá heuristika pro CZ. */
function parseAddress(adresa: string | null | undefined): FillModelApplicant["address"] | undefined {
  if (!adresa?.trim()) return undefined;
  const s = adresa.trim();
  const zipMatch = s.match(/\b(\d{3}\s*\d{2})\b/);
  const zip = zipMatch ? zipMatch[1].replace(/\s/g, "") : undefined;
  const countryCode = "CZ";
  return {
    street: s,
    city: undefined,
    zip,
    countryCode,
  };
}

function mapLoanPurpose(ucel: string | null | undefined): "purchase" | "refinance" | "construction" | "other" | undefined {
  if (!ucel) return undefined;
  const u = ucel.toLowerCase();
  if (u.includes("refinanc") || u.includes("refi")) return "refinance";
  if (u.includes("stavb") || u.includes("construction")) return "construction";
  if (u.includes("koup") || u.includes("nákup") || u.includes("purchase")) return "purchase";
  return "other";
}

export function caseToFillModel(c: Case & { extractedData: ExtractedData[] }): FillModelPayload {
  const persons = [...(c.extractedData ?? [])].sort((a, b) => a.personIndex - b.personIndex);
  const applicants: FillModelApplicant[] = persons.map((p, i) => ({
    applicantId: `A${i + 1}`,
    role: i === 0 ? "primary" : "coapplicant",
    firstName: p.jmeno ?? "",
    lastName: p.prijmeni ?? "",
    birthNumber: p.rc || undefined,
    dateOfBirth: p.datumNarozeni || undefined,
    address: parseAddress(p.adresa),
    income: {
      netMonthly: p.prijmy ?? undefined,
    },
    expenses: {
      totalMonthly: p.vydaje ?? undefined,
    },
  }));

  return {
    version: "1.0",
    caseId: c.id,
    updatedAt: c.updatedAt.toISOString(),
    applicants,
    loan: {
      amount: c.vyseUveru ?? undefined,
      purpose: mapLoanPurpose(c.ucel),
    },
  };
}
