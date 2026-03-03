import { describe, it } from "node:test";
import assert from "node:assert";
import { validateRequiredSlots, type SlotLike } from "./intakeValidation.js";

function slot(overrides: Partial<SlotLike>): SlotLike {
  return {
    personRole: "APPLICANT",
    docType: "ID_FRONT",
    required: true,
    status: "EMPTY",
    period: null,
    ...overrides,
  };
}

describe("validateRequiredSlots", () => {
  it("returns error when applicant OP (ID_FRONT/ID_BACK) required but not uploaded", () => {
    const slots: SlotLike[] = [
      slot({ docType: "ID_FRONT", required: true, status: "EMPTY" }),
      slot({ docType: "ID_BACK", required: true, status: "EMPTY" }),
    ];
    const err = validateRequiredSlots(slots);
    assert.ok(err?.includes("občanského průkazu"));
  });

  it("returns null when applicant OP both uploaded", () => {
    const slots: SlotLike[] = [
      slot({ docType: "ID_FRONT", required: true, status: "UPLOADED" }),
      slot({ docType: "ID_BACK", required: true, status: "UPLOADED" }),
    ];
    assert.strictEqual(validateRequiredSlots(slots), null);
  });

  it("returns error when co-applicant present but OP not uploaded", () => {
    const slots: SlotLike[] = [
      slot({ personRole: "APPLICANT", docType: "ID_FRONT", required: true, status: "UPLOADED" }),
      slot({ personRole: "APPLICANT", docType: "ID_BACK", required: true, status: "UPLOADED" }),
      slot({ personRole: "CO_APPLICANT", docType: "ID_FRONT", required: true, status: "EMPTY" }),
      slot({ personRole: "CO_APPLICANT", docType: "ID_BACK", required: true, status: "EMPTY" }),
    ];
    const err = validateRequiredSlots(slots);
    assert.ok(err?.includes("spolužadatele"));
  });

  it("returns null when co-applicant OP both uploaded", () => {
    const slots: SlotLike[] = [
      slot({ personRole: "APPLICANT", docType: "ID_FRONT", required: true, status: "UPLOADED" }),
      slot({ personRole: "APPLICANT", docType: "ID_BACK", required: true, status: "UPLOADED" }),
      slot({ personRole: "CO_APPLICANT", docType: "ID_FRONT", required: true, status: "UPLOADED" }),
      slot({ personRole: "CO_APPLICANT", docType: "ID_BACK", required: true, status: "UPLOADED" }),
    ];
    assert.strictEqual(validateRequiredSlots(slots), null);
  });

  it("returns error when BANK_STATEMENT count < 6 (zaměstnanec)", () => {
    const slots: SlotLike[] = [
      slot({ docType: "ID_FRONT", required: true, status: "UPLOADED" }),
      slot({ docType: "ID_BACK", required: true, status: "UPLOADED" }),
      ...Array.from({ length: 4 }, () =>
        slot({ docType: "BANK_STATEMENT", required: false, status: "UPLOADED" })
      ),
    ];
    const err = validateRequiredSlots(slots, { incomeType: "EMPLOYED" });
    assert.ok(err?.includes("6 výpisů"));
  });

  it("returns null when 6 BANK_STATEMENT uploaded (zaměstnanec)", () => {
    const slots: SlotLike[] = [
      slot({ docType: "ID_FRONT", required: true, status: "UPLOADED" }),
      slot({ docType: "ID_BACK", required: true, status: "UPLOADED" }),
      ...Array.from({ length: 6 }, () =>
        slot({ docType: "BANK_STATEMENT", required: false, status: "UPLOADED" })
      ),
    ];
    assert.strictEqual(validateRequiredSlots(slots, { incomeType: "EMPLOYED" }), null);
  });

  it("returns error when TAX_RETURN required but not uploaded (OSVČ)", () => {
    const slots: SlotLike[] = [
      slot({ docType: "ID_FRONT", required: true, status: "UPLOADED" }),
      slot({ docType: "ID_BACK", required: true, status: "UPLOADED" }),
      slot({ docType: "TAX_RETURN", required: true, status: "EMPTY" }),
    ];
    const err = validateRequiredSlots(slots);
    assert.ok(err?.includes("daňové přiznání"));
  });

  it("returns null when TAX_RETURN required and uploaded", () => {
    const slots: SlotLike[] = [
      slot({ docType: "ID_FRONT", required: true, status: "UPLOADED" }),
      slot({ docType: "ID_BACK", required: true, status: "UPLOADED" }),
      slot({ docType: "TAX_RETURN", required: true, status: "UPLOADED" }),
    ];
    assert.strictEqual(validateRequiredSlots(slots), null);
  });

  it("returns null when incomeType is EMPLOYED and TAX_RETURN slot exists but not uploaded (DP se nevyžaduje)", () => {
    const slots: SlotLike[] = [
      slot({ docType: "ID_FRONT", required: true, status: "UPLOADED" }),
      slot({ docType: "ID_BACK", required: true, status: "UPLOADED" }),
      slot({ docType: "TAX_RETURN", required: true, status: "EMPTY" }),
      ...Array.from({ length: 6 }, () =>
        slot({ docType: "BANK_STATEMENT", required: false, status: "UPLOADED" })
      ),
    ];
    assert.strictEqual(validateRequiredSlots(slots, { incomeType: "EMPLOYED" }), null);
  });
});
