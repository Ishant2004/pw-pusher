// 6-digit email codes for verification and password reset.
// Codes are stored hashed in Redis with a short expiry and an attempt counter.
import crypto from "node:crypto";
import { redis } from "../db/redis.js";
import { OTP } from "../constants.js";
import { tooMany, badRequest } from "./errors.js";

const codeKey = (purpose, email) => `otp:${purpose}:${email}`;
const attemptsKey = (purpose, email) => `otp-attempts:${purpose}:${email}`;
const cooldownKey = (purpose, email) => `otp-cooldown:${purpose}:${email}`;
const hash = (code) => crypto.createHash("sha256").update(code).digest("hex");

// purpose is "verify" or "reset"
export async function issueCode(purpose, email) {
  // allow at most one code request every 30 seconds
  const fresh = await redis.set(cooldownKey(purpose, email), "1", "EX", 30, "NX");
  if (fresh === null) throw tooMany("Please wait before requesting another code", "OTP_COOLDOWN");

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(OTP.LENGTH, "0");
  await redis.set(codeKey(purpose, email), hash(code), "EX", OTP.TTL_SECONDS);
  await redis.del(attemptsKey(purpose, email));
  return code;
}

export async function verifyCode(purpose, email, code) {
  const stored = await redis.get(codeKey(purpose, email));
  if (!stored) throw badRequest("Code expired or not found", "CODE_INVALID");

  const attempts = await redis.incr(attemptsKey(purpose, email));
  if (attempts === 1) await redis.expire(attemptsKey(purpose, email), OTP.TTL_SECONDS);
  if (attempts > OTP.MAX_ATTEMPTS) {
    await redis.del(codeKey(purpose, email));
    throw tooMany("Too many attempts. Request a new code.", "CODE_LOCKED");
  }

  if (hash(code) !== stored) throw badRequest("Incorrect code", "CODE_INVALID");

  await redis.del(codeKey(purpose, email));
  await redis.del(attemptsKey(purpose, email));
}
