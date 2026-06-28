// Server-side "envelope encryption" — the AT-REST layer.
//
// The body is ALREADY encrypted by the client (zero-knowledge), so the server
// never sees plaintext. This adds a second lock around that blob in the database:
//   1. make a random one-time key (DEK) and encrypt the blob with it
//   2. encrypt (wrap) the DEK with our master key (KEK)
//   3. store the encrypted blob + the wrapped DEK
// A stolen database is therefore double-locked.
import crypto from "node:crypto";
import { env, isProd } from "../config/env.js";

const ALGO = "aes-256-gcm";

function masterKey() {
  if (env.MASTER_ENCRYPTION_KEY) {
    const key = Buffer.from(env.MASTER_ENCRYPTION_KEY, "base64");
    if (key.length !== 32) throw new Error("MASTER_ENCRYPTION_KEY must decode to 32 bytes (base64)");
    return key;
  }
  if (isProd) throw new Error("MASTER_ENCRYPTION_KEY is required in production");
  // Dev-only fixed key so it works with zero setup. Never used in production.
  return crypto.createHash("sha256").update("pw-pusher-dev-master-key").digest();
}

export function encrypt(plaintext) {
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, dek, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // wrap (encrypt) the DEK with the master key
  const wrapIv = crypto.randomBytes(12);
  const wrapCipher = crypto.createCipheriv(ALGO, masterKey(), wrapIv);
  const wrappedDek = Buffer.concat([wrapCipher.update(dek), wrapCipher.final()]);
  const wrapTag = wrapCipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    wrappedDek: wrappedDek.toString("base64"),
    wrapIv: wrapIv.toString("base64"),
    wrapTag: wrapTag.toString("base64"),
    keyVersion: 1,
  };
}

export function decrypt(p) {
  // unwrap the DEK
  const wrapDecipher = crypto.createDecipheriv(ALGO, masterKey(), Buffer.from(p.wrapIv, "base64"));
  wrapDecipher.setAuthTag(Buffer.from(p.wrapTag, "base64"));
  const dek = Buffer.concat([wrapDecipher.update(Buffer.from(p.wrappedDek, "base64")), wrapDecipher.final()]);

  // decrypt the blob with the DEK
  const decipher = crypto.createDecipheriv(ALGO, dek, Buffer.from(p.iv, "base64"));
  decipher.setAuthTag(Buffer.from(p.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(p.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

// One-way hash of an IP so audit logs never store raw IPs.
export function hashIp(ip) {
  return crypto.createHash("sha256").update(`${ip}|${env.COOKIE_SECRET}`).digest("hex").slice(0, 32);
}
