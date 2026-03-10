/**
 * Typy pro HypoManager Bank Autofill extension (dle browser_extension.md)
 */

export type FillModel = {
  version: "1.0";
  caseId: string;
  updatedAt: string;

  applicants: Array<{
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
      status?:
        | "employee"
        | "selfEmployed"
        | "maternity"
        | "retired"
        | "student"
        | "unemployed"
        | "other";
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
  }>;

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
    address?: {
      street?: string;
      houseNumber?: string;
      city?: string;
      zip?: string;
      countryCode?: string;
    };
  };
};

export type Msg =
  | { type: "PAIR_SUBMIT_CODE"; code: string }
  | { type: "PAIR_STATUS" }
  | { type: "GET_ACTIVE_CASE" }
  | { type: "SET_APPLICANT_INDEX"; applicantIndex: number }
  | { type: "FILL_ALL" }
  | { type: "FILL_SECTION"; sectionId: string }
  | { type: "FILL_FIELD"; fieldId: string }
  | { type: "RUN_DOM_SCAN"; tabId: number }
  | { type: "SEND_MAPPING"; pack: BankMappingPack };

export type FillRequest = {
  type: "FILL_REQUEST";
  requestId: string;
  applicantIndex: number;
  bankId: string;
  fillModel: FillModel;
  /** Volitelný mapping pack – pokud je přítomen, content script ho použije místo lokálních packů. */
  pack?: BankMappingPack;
  mode:
    | { kind: "all" }
    | { kind: "section"; sectionId: string }
    | { kind: "field"; fieldId: string };
};

export type FillResult = {
  type: "FILL_RESULT";
  requestId: string;
  bankId: string;
  stepId?: string;
  filled: Array<{ fieldId: string; label: string }>;
  missing: Array<{
    fieldId: string;
    label: string;
    reason: "not_found" | "not_visible" | "readonly";
  }>;
  errors: Array<{ fieldId?: string; error: string }>;
  startedAt: string;
  finishedAt: string;
};

export type BankId = "kb" | "csob" | "cs" | string;

export type BankMappingPack = {
  bankId: BankId;
  version: string;
  match: {
    hostnames: string[];
    pathIncludes?: string[];
  };
  steps: Array<{
    stepId: string;
    detectAny: string[];
    fields: Array<{
      fieldId: string;
      label: string;
      selectors: string[];
      kind: "text" | "number" | "date" | "select";
      valueFrom:
        | { source: "applicant"; path: string }
        | { source: "loan"; path: string }
        | { source: "property"; path: string }
        | { source: "const"; value: string | number };
      transform?: Array<"trim" | "upper" | "digitsOnly">;
      required?: boolean;
    }>;
  }>;
};
