import { Redis } from "ioredis";
import { env } from "../config/env.js";

// One shared Redis connection for the whole app.
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("[redis] error:", err.message));
