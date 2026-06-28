// Express middleware that guards routes.
import { verifyAccessToken } from "../lib/tokens.js";
import { User } from "../models/user.js";
import { unauthorized, forbidden } from "../lib/errors.js";

function getUserId(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw unauthorized("Missing access token", "NO_TOKEN");
  try {
    return verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    throw unauthorized("Invalid or expired token", "TOKEN_INVALID");
  }
}

// Requires a valid access token. Sets req.userId.
export function authenticate(req, res, next) {
  try {
    req.userId = getUserId(req);
    next();
  } catch (err) {
    next(err);
  }
}

// Requires a valid token AND a verified (active) account.
export async function requireVerified(req, res, next) {
  let userId;
  try {
    userId = getUserId(req);
  } catch (err) {
    return next(err);
  }
  const user = await User.findById(userId).select("status").lean();
  if (!user) return next(unauthorized("User not found", "NO_USER"));
  if (user.status !== "active") return next(forbidden("Email not verified", "EMAIL_UNVERIFIED"));
  req.userId = userId;
  next();
}
