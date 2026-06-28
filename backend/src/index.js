// Entry point: connect to the databases, start the HTTP server, handle shutdown.
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo, disconnectMongo } from "./db/mongo.js";
import { redis } from "./db/redis.js";

async function start() {
  await connectMongo();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`✅ API listening on http://localhost:${env.PORT}`);
  });

  async function shutdown(signal) {
    console.log(`\n${signal} received — shutting down...`);
    server.close();
    await disconnectMongo();
    redis.disconnect();
    process.exit(0);
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});
