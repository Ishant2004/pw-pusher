// All request-body shapes, validated with zod. Calling `.parse(body)` throws a
// ZodError on bad input, which the central error handler turns into a 400.
import { z } from "zod";
import { EXPIRY, SECRET } from "./constants.js";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128);
export const codeSchema = z.string().regex(/^\d{6}$/, "Code must be 6 digits");

export const signupSchema = z.object({ email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const verifyEmailSchema = z.object({ email: emailSchema, code: codeSchema });
export const resendSchema = z.object({ email: emailSchema });
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ email: emailSchema, code: codeSchema, password: passwordSchema });
export const googleSchema = z.object({ idToken: z.string().min(1) });

const base64 = z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/, "Must be base64");

// The client sends an already-encrypted blob; the server never sees the key.
export const createSecretSchema = z.object({
  payload: z.object({
    ciphertext: base64.min(1).max(SECRET.MAX_CIPHERTEXT_B64, "Content is too large"),
    iv: base64.min(1).max(64),
    alg: z.literal("AES-GCM").default("AES-GCM"),
    v: z.number().int().positive().default(1),
  }),
  expiresInSeconds: z
    .number()
    .int()
    .min(EXPIRY.MIN_SECONDS, "Minimum expiry is 5 minutes")
    .max(EXPIRY.MAX_SECONDS, "Maximum expiry is 5 days")
    .default(EXPIRY.DEFAULT_SECONDS),
  maxViews: z.number().int().min(1).max(2).default(1),
});

// Tokens are exactly TOKEN_LENGTH base62 chars. Old long-format links aren't supported.
export const tokenSchema = z
  .string()
  .length(SECRET.TOKEN_LENGTH)
  .regex(/^[A-Za-z0-9]+$/, "Invalid token");
