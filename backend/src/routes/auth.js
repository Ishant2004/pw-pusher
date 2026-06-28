// All authentication endpoints. Logic is kept right here in the route handlers
// so it reads top-to-bottom. Helpers from /lib do the heavy lifting.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  resendSchema,
  forgotSchema,
  resetSchema,
  googleSchema,
} from "../validation.js";
import { User } from "../models/user.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { issueCode, verifyCode } from "../lib/otp.js";
import { sendEmail, verificationEmail, resetEmail } from "../lib/mailer.js";
import { verifyGoogleIdToken } from "../lib/google.js";
import {
  signAccessToken,
  createSession,
  rotateSession,
  revokeSession,
  revokeAllSessions,
} from "../lib/tokens.js";
import { authenticate } from "../middleware/auth.js";
import { env } from "../config/env.js";
import { badRequest, conflict, unauthorized, badGateway } from "../lib/errors.js";

export const authRouter = Router();

// Auth endpoints get a stricter limit than the rest of the API.
authRouter.use(rateLimit({ windowMs: 60 * 1000, max: 10 }));

const REFRESH_COOKIE = "pp_refresh";
const COOKIE_PATH = "/api/auth";

function publicUser(user) {
  return { id: user._id.toString(), email: user.email, status: user.status, createdAt: user.createdAt };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true, // not readable by JavaScript
    secure: env.COOKIE_SECURE, // HTTPS only in production
    // In production the frontend (Vercel) and backend (Railway) are different
    // sites, so the cookie must be SameSite=None + Secure to be sent. In dev it's
    // same-origin (via the Vite proxy), so Lax is fine.
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    path: COOKIE_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

// Issue a refresh cookie + access token and send the standard auth response.
async function sendTokens(res, user, status = 200) {
  const userId = user._id.toString();
  setRefreshCookie(res, await createSession(userId));
  res.status(status).json({ user: publicUser(user), accessToken: signAccessToken(userId) });
}

async function sendVerification(email) {
  const code = await issueCode("verify", email);
  try {
    await sendEmail({ to: email, ...verificationEmail(code) });
  } catch (err) {
    console.error("[email] verification send failed:", err.message);
    throw badGateway("We couldn't send the verification email. Please try again shortly.", "EMAIL_SEND_FAILED");
  }
}

// Create an account (unverified) and email a 6-digit code.
authRouter.post("/signup", async (req, res) => {
  const { email, password } = signupSchema.parse(req.body);

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.status === "active") throw conflict("An account with this email already exists", "EMAIL_TAKEN");
    existing.passwordHash = hashPassword(password); // unverified: update password and resend
    await existing.save();
  } else {
    await User.create({ email, passwordHash: hashPassword(password), status: "unverified" });
  }

  await sendVerification(email);
  res.status(201).json({ message: "Verification code sent", email });
});

// Confirm the code -> activate the account -> log in.
authRouter.post("/verify-email", async (req, res) => {
  const { email, code } = verifyEmailSchema.parse(req.body);
  await verifyCode("verify", email, code);
  const user = await User.findOneAndUpdate({ email }, { status: "active" }, { new: true });
  if (!user) throw badRequest("No account found", "NO_ACCOUNT");
  await sendTokens(res, user);
});

authRouter.post("/resend-verification", async (req, res) => {
  const { email } = resendSchema.parse(req.body);
  const user = await User.findOne({ email });
  if (!user) throw badRequest("No account found", "NO_ACCOUNT");
  if (user.status === "active") throw badRequest("Email already verified", "ALREADY_VERIFIED");
  await sendVerification(email);
  res.json({ message: "Verification code sent" });
});

// Email + password login.
authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw unauthorized("Invalid email or password", "BAD_CREDENTIALS");
  }
  if (user.status !== "active") {
    await sendVerification(email).catch(() => {}); // help them finish verifying
    return res.status(403).json({ error: { code: "EMAIL_UNVERIFIED", message: "Email not verified", email } });
  }
  await sendTokens(res, user);
});

// Google sign-in: the frontend sends an ID token, we verify it with Google.
authRouter.post("/google", async (req, res) => {
  const { idToken } = googleSchema.parse(req.body);
  const { sub, email } = await verifyGoogleIdToken(idToken);

  let user = await User.findOne({ $or: [{ googleSub: sub }, { email }] });
  if (!user) {
    user = await User.create({ email, googleSub: sub, status: "active" });
  } else if (!user.googleSub) {
    user.googleSub = sub; // link Google to an existing email account
    if (user.status === "unverified") user.status = "active";
    await user.save();
  }
  await sendTokens(res, user);
});

// Send a reset code. Always responds the same way (no email enumeration).
authRouter.post("/forgot-password", async (req, res) => {
  const { email } = forgotSchema.parse(req.body);
  const user = await User.findOne({ email });
  if (user && user.passwordHash) {
    try {
      const code = await issueCode("reset", email);
      await sendEmail({ to: email, ...resetEmail(code) });
    } catch {
      /* swallow throttling/provider errors so existence stays hidden */
    }
  }
  res.json({ message: "If an account exists, a reset code has been sent" });
});

authRouter.post("/reset-password", async (req, res) => {
  const { email, code, password } = resetSchema.parse(req.body);
  await verifyCode("reset", email, code);
  const user = await User.findOne({ email });
  if (!user) throw badRequest("No account found", "NO_ACCOUNT");
  user.passwordHash = hashPassword(password);
  if (user.status === "unverified") user.status = "active"; // proven control of the inbox
  await user.save();
  await revokeAllSessions(user._id.toString()); // log out everywhere
  await sendTokens(res, user);
});

// Exchange the refresh cookie for a new access token (and rotate the cookie).
authRouter.post("/refresh", async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) throw unauthorized("No refresh token", "NO_REFRESH");
  const { userId, refreshToken } = await rotateSession(token);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken: signAccessToken(userId) });
});

authRouter.post("/logout", async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) await revokeSession(token);
  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
  res.json({ message: "Logged out" });
});

// Current user (requires a valid access token).
authRouter.get("/me", authenticate, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw unauthorized("User not found", "NO_USER");
  res.json({ user: publicUser(user) });
});
