// Builds and returns the Express app (middleware, routes, error handling).
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { env, isProd } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import { requestLogger } from "./middleware/logger.js";
import { authRouter } from "./routes/auth.js";
import { secretsRouter } from "./routes/secrets.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // behind one proxy on Railway/Render -> correct req.ip

  app.use(requestLogger); // log every request (method/path/status/timing)
  app.use(helmet()); // safe HTTP headers
  app.use(cors({ origin: isProd ? env.APP_URL : true, credentials: true }));
  app.use(express.json({ limit: "1mb" })); // parse JSON bodies
  app.use(cookieParser(env.COOKIE_SECRET)); // read the refresh cookie
  app.use(rateLimit({ windowMs: 60 * 1000, max: env.RATE_LIMIT_MAX })); // global limit

  app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
  app.use("/api/auth", authRouter);
  app.use("/api/secrets", secretsRouter);

  // Unknown route.
  app.use((req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } }));

  // Central error handler. Express treats a 4-argument function as the error handler.
  // Any error thrown in a route (including async) ends up here.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof ZodError) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "Invalid input", details: err.flatten() } });
    }
    if (err && err.code === 11000) {
      return res.status(409).json({ error: { code: "CONFLICT", message: "Already exists" } });
    }
    if (err && err.type === "entity.parse.failed") {
      return res.status(400).json({ error: { code: "BAD_JSON", message: "Invalid JSON body" } });
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
  });

  return app;
}
