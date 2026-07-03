// Client-side encryption (zero-knowledge). Content is encrypted/decrypted here,
// in the browser. The key is put in the URL #fragment, which is never sent to
// the server — so the server only ever stores ciphertext.

const subtle = window.crypto.subtle;

function bytesToB64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const toB64url = (b64) => b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  return t + "=".repeat((4 - (t.length % 4)) % 4);
};

// A fresh random 128-bit key, URL-safe base64 (this goes in the link fragment).
// AES-128-GCM is still strong; a 16-byte key keeps the share link short.
export function generateKey() {
  const raw = new Uint8Array(16);
  window.crypto.getRandomValues(raw);
  return toB64url(bytesToB64(raw));
}

async function importKey(keyB64url, usages) {
  return subtle.importKey("raw", b64ToBytes(fromB64url(keyB64url)), "AES-GCM", false, usages);
}

// Encrypt text with a brand-new key. Returns the key (for the URL) and the
// payload (for the server).
export async function encryptSecret(plaintext) {
  const key = generateKey();
  const cryptoKey = await importKey(key, ["encrypt"]);
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);
  const ct = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, new TextEncoder().encode(plaintext)),
  );
  return { key, payload: { ciphertext: bytesToB64(ct), iv: bytesToB64(iv), alg: "AES-GCM", v: 1 } };
}

export async function decryptSecret(payload, keyB64url) {
  const cryptoKey = await importKey(keyB64url, ["decrypt"]);
  const pt = await subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(payload.iv) },
    cryptoKey,
    b64ToBytes(payload.ciphertext),
  );
  return new TextDecoder().decode(pt);
}

// Build the shareable link: {frontend origin}/s/{token}#{key}
export function buildShareUrl(token, key) {
  return `${window.location.origin}/s/${token}#${key}`;
}
