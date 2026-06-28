// Two kinds of tokens:
//   1. Access token  — a short-lived JWT sent in the Authorization header.
//   2. Refresh token — a random string stored in Redis and sent as a cookie.
//      It is rotated on every use, so a stolen old token stops working.
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { redis } from "../db/redis.js";
import { env } from "../config/env.js";
import { unauthorized } from "./errors.js";

const REFRESH_TTL = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60; // seconds
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const sessionKey = (id) => `session:${id}`;
const userSessionsKey = (userId) => `user-sessions:${userId}`;

// ---------- access token ----------
export function signAccessToken(userId) {
  return jwt.sign({ type: "access" }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET); // throws if invalid/expired
  if (payload.type !== "access" || !payload.sub) throw new Error("bad token");
  return payload.sub; // the user id
}

// ---------- refresh session ----------
// Cookie value is "sessionId.secret". We store only the hash of the secret.
export async function createSession(userId) {
  const sessionId = crypto.randomBytes(16).toString("hex");
  const secret = crypto.randomBytes(32).toString("base64url");
  await redis.set(sessionKey(sessionId), JSON.stringify({ userId, secretHash: sha256(secret) }), "EX", REFRESH_TTL);
  await redis.sadd(userSessionsKey(userId), sessionId);
  await redis.expire(userSessionsKey(userId), REFRESH_TTL);
  return `${sessionId}.${secret}`;
}

export async function rotateSession(refreshToken) {
  const [sessionId, secret] = String(refreshToken).split(".");
  if (!sessionId || !secret) throw unauthorized("Invalid session", "SESSION_INVALID");

  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) throw unauthorized("Session expired", "SESSION_EXPIRED");
  const data = JSON.parse(raw);

  if (sha256(secret) !== data.secretHash) {
    // an old/replayed token was used — treat as theft and kill the session
    await redis.del(sessionKey(sessionId));
    await redis.srem(userSessionsKey(data.userId), sessionId);
    throw unauthorized("Session invalidated", "SESSION_REUSE");
  }

  const newSecret = crypto.randomBytes(32).toString("base64url");
  await redis.set(sessionKey(sessionId), JSON.stringify({ userId: data.userId, secretHash: sha256(newSecret) }), "EX", REFRESH_TTL);
  return { userId: data.userId, refreshToken: `${sessionId}.${newSecret}` };
}

export async function revokeSession(refreshToken) {
  const [sessionId] = String(refreshToken).split(".");
  if (sessionId) await redis.del(sessionKey(sessionId));
}

// Log a user out of every device (used after a password reset).
export async function revokeAllSessions(userId) {
  const ids = await redis.smembers(userSessionsKey(userId));
  if (ids.length) await redis.del(...ids.map(sessionKey));
  await redis.del(userSessionsKey(userId));
}
