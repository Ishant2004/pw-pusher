// Verifies a Google "ID token" sent by the frontend after a Google sign-in.
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { badRequest } from "./errors.js";

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function verifyGoogleIdToken(idToken) {
  if (!env.GOOGLE_CLIENT_ID) throw badRequest("Google login is not configured", "GOOGLE_DISABLED");

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw badRequest("Invalid Google token", "GOOGLE_INVALID");
  }

  if (!payload?.sub || !payload.email) throw badRequest("Invalid Google token", "GOOGLE_INVALID");
  return { sub: payload.sub, email: payload.email.toLowerCase() };
}
