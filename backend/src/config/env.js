// Loads .env and validates every setting once, at startup, so we fail fast.
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),

  APP_URL: z.string().url().default("http://localhost:5173"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),

  MONGODB_URI: z.string().default("mongodb://localhost:27017/pwpusher"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string().min(16).default("dev-only-insecure-access-secret"),
  COOKIE_SECRET: z.string().min(16).default("dev-only-insecure-cookie-secret"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(15),

  MASTER_ENCRYPTION_KEY: z.string().default(""),

  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),

  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("PW Pusher <onboarding@resend.dev>"),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  console.error("❌ Invalid environment:", result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
export const isProd = env.NODE_ENV === "production";
// COOKIE_SECURE comes in as a string; expose a real boolean.
env.COOKIE_SECURE = env.COOKIE_SECURE === "true" || isProd;

// In production, refuse to start with insecure/missing secrets.
if (isProd) {
  const bad = [];
  if (env.JWT_ACCESS_SECRET.startsWith("dev-only")) bad.push("JWT_ACCESS_SECRET");
  if (env.COOKIE_SECRET.startsWith("dev-only")) bad.push("COOKIE_SECRET");
  if (!env.MASTER_ENCRYPTION_KEY) bad.push("MASTER_ENCRYPTION_KEY");
  if (bad.length) {
    console.error(`❌ Refusing to start: insecure/missing secrets: ${bad.join(", ")}`);
    process.exit(1);
  }
}
