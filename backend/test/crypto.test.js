// Run with: npm test   (uses Node's built-in test runner)
import { test } from "node:test";
import assert from "node:assert/strict";
import { encrypt, decrypt } from "../src/lib/crypto.js";

test("envelope encryption round-trips", () => {
  const secret = "super secret password \u{1F510}";
  const enc = encrypt(secret);
  assert.notEqual(enc.ciphertext, secret);
  assert.equal(decrypt(enc), secret);
});

test("each encryption produces unique ciphertext", () => {
  assert.notEqual(encrypt("same input").ciphertext, encrypt("same input").ciphertext);
});

test("tampered ciphertext is rejected", () => {
  const enc = encrypt("hello");
  const tampered = { ...enc, authTag: Buffer.alloc(16).toString("base64") };
  assert.throws(() => decrypt(tampered));
});
