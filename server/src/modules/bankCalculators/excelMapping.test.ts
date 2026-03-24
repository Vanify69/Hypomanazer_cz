import { describe, it } from "node:test";
import assert from "node:assert";
import {
  buildMortgageInputValues,
  buildWorkerInputPayload,
  isPlaceholderSheet,
  parsePassFail,
} from "./excelMapping.js";
import { rbMappingConfig } from "./mappings/rb.mapping.js";

describe("excelMapping", () => {
  it("isPlaceholderSheet detects TODO_ prefix", () => {
    assert.strictEqual(isPlaceholderSheet("TODO_RB_SHEET"), true);
    assert.strictEqual(isPlaceholderSheet("Vstupy"), false);
  });

  it("buildMortgageInputValues maps primary and co-applicant", () => {
    const v = buildMortgageInputValues({
      caseId: "c1",
      requestedLoanAmount: 5_000_000,
      purpose: "Bydlení",
      applicants: [
        { role: "primary", monthlyIncome: 80_000, lastName: "Novák", declaredExpenses: 10_000 },
        { role: "co", monthlyIncome: 50_000, declaredExpenses: 5_000 },
      ],
    });
    assert.strictEqual(v.requestedAmount, 5_000_000);
    assert.strictEqual(v.purpose, "Bydlení");
    assert.strictEqual(v.applicant1Income, 80_000);
    assert.strictEqual(v.applicant1LastName, "Novák");
    assert.strictEqual(v.applicant2Income, 50_000);
  });

  it("buildWorkerInputPayload skips placeholder refs", () => {
    const p = buildWorkerInputPayload(rbMappingConfig, {
      caseId: "c1",
      requestedLoanAmount: 3_000_000,
      applicants: [{ role: "primary", monthlyIncome: 40_000 }],
    });
    assert.deepStrictEqual(p, {});
  });

  it("parsePassFail understands Czech labels", () => {
    assert.strictEqual(parsePassFail("ANO"), "PASS");
    assert.strictEqual(parsePassFail("ne"), "FAIL");
    assert.strictEqual(parsePassFail("???"), "UNKNOWN");
  });
});
