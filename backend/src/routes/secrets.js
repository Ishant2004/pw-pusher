// Secret endpoints. The body arrives ALREADY encrypted by the client; the server
// only adds an at-rest layer, stores it, enforces expiry, and logs views.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { customAlphabet } from "nanoid";
import { createSecretSchema, tokenSchema } from "../validation.js";
import { SECRET } from "../constants.js";
import { env } from "../config/env.js";
import { Secret } from "../models/secret.js";
import { AccessLog } from "../models/accessLog.js";
import { encrypt, decrypt, hashIp } from "../lib/crypto.js";
import { requireVerified } from "../middleware/auth.js";
import { notFound, forbidden } from "../lib/errors.js";

export const secretsRouter = Router();

// Every secret action requires a verified account (sender and viewer alike).
secretsRouter.use(requireVerified);

// Random, unguessable URL id.
const makeToken = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  SECRET.TOKEN_LENGTH,
);
const baseUrl = (token) => `${env.APP_URL.replace(/\/$/, "")}/s/${token}`;

// Create a secret (store the client's encrypted blob).
secretsRouter.post("/", rateLimit({ windowMs: 60 * 1000, max: 30 }), async (req, res) => {
  const { payload, expiresInSeconds, maxViews } = createSecretSchema.parse(req.body);

  // wrap the already-encrypted client blob in our at-rest encryption layer
  const enc = encrypt(JSON.stringify(payload));
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  let token = makeToken();
  while (await Secret.exists({ token })) token = makeToken(); // avoid the rare collision

  const doc = await Secret.create({ token, ownerId: req.userId, ...enc, expiresAt, maxViews, viewCount: 0 });
  res.status(201).json({ token, url: baseUrl(token), expiresAt: doc.expiresAt });
});

// List the current user's active secrets (for a dashboard).
secretsRouter.get("/", async (req, res) => {
  const docs = await Secret.find({ ownerId: req.userId, expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .select("token expiresAt maxViews viewCount createdAt")
    .lean();

  res.json({
    secrets: docs.map((d) => ({
      token: d.token,
      url: baseUrl(d.token),
      expiresAt: d.expiresAt,
      maxViews: d.maxViews ?? null,
      viewCount: d.viewCount ?? 0,
      createdAt: d.createdAt,
    })),
  });
});

// View a secret: returns the ciphertext for the client to decrypt locally.
secretsRouter.get("/:token", async (req, res) => {
  const token = tokenSchema.parse(req.params.token);

  // Atomically claim one view so two readers can't both pass a maxViews=1 secret,
  // and only if it isn't expired or already used up.
  const doc = await Secret.findOneAndUpdate(
    {
      token,
      expiresAt: { $gt: new Date() },
      $expr: { $or: [{ $eq: ["$maxViews", null] }, { $lt: ["$viewCount", "$maxViews"] }] },
    },
    { $inc: { viewCount: 1 } },
    { new: true },
  );
  if (!doc) throw notFound("This link is invalid or has expired", "SECRET_GONE");

  const payload = JSON.parse(decrypt(doc)); // undo the at-rest layer -> client blob

  await AccessLog.create({
    secretId: doc._id,
    viewerId: req.userId,
    ipHash: req.ip ? hashIp(req.ip) : null,
  });

  // Burn-after-read (or any view limit reached) -> delete immediately.
  const burned = doc.maxViews !== null && doc.viewCount >= doc.maxViews;
  if (burned) await Secret.deleteOne({ _id: doc._id });

  res.json({
    payload,
    meta: {
      token: doc.token,
      expiresAt: doc.expiresAt,
      maxViews: doc.maxViews ?? null,
      viewCount: doc.viewCount,
      createdAt: doc.createdAt,
    },
    burned,
  });
});

// Revoke (delete) a secret you own.
secretsRouter.delete("/:token", async (req, res) => {
  const token = tokenSchema.parse(req.params.token);
  const doc = await Secret.findOne({ token }).select("ownerId");
  if (!doc) throw notFound("Secret not found", "SECRET_GONE");
  if (doc.ownerId.toString() !== req.userId) throw forbidden("Not your secret");
  await Secret.deleteOne({ _id: doc._id });
  res.json({ message: "Revoked" });
});
