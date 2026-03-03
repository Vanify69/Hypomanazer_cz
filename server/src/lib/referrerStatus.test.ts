import { describe, it } from "node:test";
import assert from "node:assert";
import { mapToReferrerVisibleStatus } from "./referrerStatus.js";

describe("mapToReferrerVisibleStatus", () => {
  it("returns CLOSED_LOST when case.dealStatus is LOST", () => {
    const lead = { status: "CONVERTED" };
    const caseData = { dealStatus: "LOST" };
    assert.strictEqual(mapToReferrerVisibleStatus(lead, null, caseData), "CLOSED_LOST");
  });

  it("returns CLOSED_WON when case.dealStatus is CLOSED", () => {
    const lead = { status: "CONVERTED" };
    const caseData = { dealStatus: "CLOSED" };
    assert.strictEqual(mapToReferrerVisibleStatus(lead, null, caseData), "CLOSED_WON");
  });

  it("returns SIGNED when case.dealStatus is SIGNED_BY_CLIENT", () => {
    const lead = { status: "CONVERTED" };
    const caseData = { dealStatus: "SIGNED_BY_CLIENT" };
    assert.strictEqual(mapToReferrerVisibleStatus(lead, null, caseData), "SIGNED");
  });

  it("returns APPROVED when case.dealStatus is APPROVED", () => {
    const lead = { status: "CONVERTED" };
    const caseData = { dealStatus: "APPROVED" };
    assert.strictEqual(mapToReferrerVisibleStatus(lead, null, caseData), "APPROVED");
  });

  it("returns IN_BANK when case.dealStatus is SENT_TO_BANK", () => {
    const lead = { status: "CONVERTED" };
    const caseData = { dealStatus: "SENT_TO_BANK" };
    assert.strictEqual(mapToReferrerVisibleStatus(lead, null, caseData), "IN_BANK");
  });

  it("returns DOCUMENTS_IN when lead is SUBMITTED or CONVERTED and no deal status", () => {
    assert.strictEqual(mapToReferrerVisibleStatus({ status: "SUBMITTED" }, null, null), "DOCUMENTS_IN");
    assert.strictEqual(mapToReferrerVisibleStatus({ status: "CONVERTED" }, null, {}), "DOCUMENTS_IN");
  });

  it("returns CONTACTED when lead is SENT, OPENED or IN_PROGRESS", () => {
    assert.strictEqual(mapToReferrerVisibleStatus({ status: "SENT" }, null, null), "CONTACTED");
    assert.strictEqual(mapToReferrerVisibleStatus({ status: "OPENED" }, null, null), "CONTACTED");
    assert.strictEqual(mapToReferrerVisibleStatus({ status: "IN_PROGRESS" }, null, null), "CONTACTED");
  });

  it("returns RECEIVED for DRAFT or unknown lead status", () => {
    assert.strictEqual(mapToReferrerVisibleStatus({ status: "DRAFT" }, null, null), "RECEIVED");
    assert.strictEqual(mapToReferrerVisibleStatus({ status: "EXPIRED" }, null, null), "RECEIVED");
  });
});
