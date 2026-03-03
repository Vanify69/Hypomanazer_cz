import { describe, it } from "node:test";
import assert from "node:assert";
import { generateToken, hashToken, verifyToken } from "./tokens.js";

describe("tokens", () => {
  it("generateToken returns 64-char hex string", () => {
    const t = generateToken();
    assert.strictEqual(t.length, 64);
    assert.match(t, /^[0-9a-f]+$/);
  });

  it("hashToken returns deterministic sha256 hex", () => {
    const t = "abc";
    const h1 = hashToken(t);
    const h2 = hashToken(t);
    assert.strictEqual(h1, h2);
    assert.strictEqual(h1.length, 64);
    assert.match(h1, /^[0-9a-f]+$/);
  });

  it("verifyToken returns true when raw matches hash", () => {
    const raw = generateToken();
    const hash = hashToken(raw);
    assert.strictEqual(verifyToken(raw, hash), true);
  });

  it("verifyToken returns false when raw does not match hash", () => {
    const raw = generateToken();
    const otherHash = hashToken(generateToken());
    assert.strictEqual(verifyToken(raw, otherHash), false);
  });

  it("verifyToken returns false for empty token or hash", () => {
    assert.strictEqual(verifyToken("", "abc"), false);
    assert.strictEqual(verifyToken("abc", ""), false);
    assert.strictEqual(verifyToken("", ""), false);
  });
});
