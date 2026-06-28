// Live end-to-end check against a running server (npm run dev first).
// It plays the role of the FRONTEND: it encrypts in the client, so it proves the
// server only ever stores/returns ciphertext. The dev verification code is read
// from the server log at /tmp/pwpush-api.log.
import crypto from "node:crypto";
import fs from "node:fs";

const API = "http://localhost:8080";
const APP = "http://localhost:5173";
const EMAIL = `e2e_${Date.now()}@example.com`;
const PLAINTEXT = "hunter2 — my secret \u{1F510}";

// --- minimal client-side AES-256-GCM (same as the browser will do) ---
const toB64 = (buf) => Buffer.from(buf).toString("base64");
async function encryptClient(text) {
  const rawKey = crypto.randomBytes(32);
  const key = await crypto.webcrypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.randomBytes(12);
  const ct = await crypto.webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { key: Buffer.from(rawKey).toString("base64url"), payload: { ciphertext: toB64(ct), iv: toB64(iv), alg: "AES-GCM", v: 1 } };
}
async function decryptClient(payload, keyB64url) {
  const key = await crypto.webcrypto.subtle.importKey("raw", Buffer.from(keyB64url, "base64url"), "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.webcrypto.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(payload.iv, "base64") }, key, Buffer.from(payload.ciphertext, "base64"),
  );
  return new TextDecoder().decode(pt);
}

const post = (path, body, token) =>
  fetch(API + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }).then((r) => r.json());

await post("/api/auth/signup", { email: EMAIL, password: "password123" });
console.log("1) signed up", EMAIL);

const log = fs.readFileSync("/tmp/pwpush-api.log", "utf8");
const code = [...log.matchAll(/verification code is (\d{6})/g)].pop()?.[1];
console.log("2) dev code from server log:", code);

const { accessToken } = await post("/api/auth/verify-email", { email: EMAIL, code });
console.log("3) verified, got access token");

const { key, payload } = await encryptClient(PLAINTEXT);
const created = await post("/api/secrets", { payload, expiresInSeconds: 345600, maxViews: 1 }, accessToken);
console.log("4) created:", created.token, "| share URL:", `${APP}/s/${created.token}#${key}`);

const view = await fetch(`${API}/api/secrets/${created.token}`, { headers: { authorization: `Bearer ${accessToken}` } }).then((r) => r.json());
const decrypted = await decryptClient(view.payload, key);
console.log("5) decrypted:", JSON.stringify(decrypted), decrypted === PLAINTEXT ? "✅ MATCH" : "❌ MISMATCH");

const second = await fetch(`${API}/api/secrets/${created.token}`, { headers: { authorization: `Bearer ${accessToken}` } });
console.log("6) second view status:", second.status, second.status === 404 ? "✅ burned" : "❌");
