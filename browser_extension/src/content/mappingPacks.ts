/**
 * Mapping packy – které pole na stránce odpovídá které hodnotě z FillModelu.
 * Pro reálné banky přidej další pack a rozšiř getPackForPage().
 */
import type { BankMappingPack } from "../types.js";

/** Testovací stránka na localhost:4000/test-autofill.html */
export const TEST_PACK: BankMappingPack = {
  bankId: "test",
  version: "test-1.0",
  match: {
    hostnames: ["localhost"],
    pathIncludes: ["test-autofill"],
  },
  steps: [
    {
      stepId: "main",
      detectAny: ["#autofill-form", "input#firstName"],
      fields: [
        {
          fieldId: "applicant.firstName",
          label: "Jméno",
          selectors: ["input#firstName", "input[name='firstName']"],
          kind: "text",
          valueFrom: { source: "applicant", path: "firstName" },
          transform: ["trim"],
        },
        {
          fieldId: "applicant.lastName",
          label: "Příjmení",
          selectors: ["input#lastName", "input[name='lastName']"],
          kind: "text",
          valueFrom: { source: "applicant", path: "lastName" },
          transform: ["trim"],
        },
        {
          fieldId: "applicant.birthNumber",
          label: "Rodné číslo",
          selectors: ["input#birthNumber", "input[name='birthNumber']"],
          kind: "text",
          valueFrom: { source: "applicant", path: "birthNumber" },
          transform: ["trim"],
        },
        {
          fieldId: "applicant.address",
          label: "Adresa",
          selectors: ["input#address", "textarea#address", "input[name='address']"],
          kind: "text",
          valueFrom: { source: "applicant", path: "address" },
          transform: ["trim"],
        },
        {
          fieldId: "applicant.income.netMonthly",
          label: "Příjmy",
          selectors: ["input#income", "input[name='income']"],
          kind: "number",
          valueFrom: { source: "applicant", path: "income.netMonthly" },
        },
        {
          fieldId: "loan.amount",
          label: "Výše úvěru",
          selectors: ["input#loanAmount", "input[name='loanAmount']"],
          kind: "number",
          valueFrom: { source: "loan", path: "amount" },
        },
      ],
    },
  ],
};

/** Noby.cz – SPA (Vue/Quasar), formulář v #q-app. ID polí se mění (UUID), proto se používá fallback podle textu labelu. */
export const NOBY_PACK: BankMappingPack = {
  bankId: "noby",
  version: "noby.cz-2026-03-04",
  match: {
    hostnames: ["noby.cz"],
    pathIncludes: ["/modelation/mortgage", "modelation"],
  },
  steps: [
    {
      stepId: "main",
      detectAny: ["#q-app"],
      fields: [
        {
          fieldId: "applicant_firstName",
          label: "Jméno",
          selectors: [],
          kind: "text",
          valueFrom: { source: "applicant", path: "firstName" },
        },
        {
          fieldId: "applicant_lastName",
          label: "Příjmení",
          selectors: [],
          kind: "text",
          valueFrom: { source: "applicant", path: "lastName" },
        },
        {
          fieldId: "applicant_dateOfBirth",
          label: "Datum narození",
          selectors: [],
          kind: "text",
          valueFrom: { source: "applicant", path: "dateOfBirth" },
        },
        {
          fieldId: "loan_amount",
          label: "Výše úvěru",
          selectors: [],
          kind: "text",
          valueFrom: { source: "loan", path: "amount" },
        },
      ],
    },
  ],
};

const PACKS: BankMappingPack[] = [TEST_PACK, NOBY_PACK];

export function getPackForPage(hostname: string, pathname: string): BankMappingPack | null {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  for (const pack of PACKS) {
    if (!pack.match.hostnames.some((h) => host === h.toLowerCase())) continue;
    if (pack.match.pathIncludes?.length) {
      const path = pathname.toLowerCase();
      if (!pack.match.pathIncludes.some((p) => path.includes(p))) continue;
    }
    return pack;
  }
  return null;
}
