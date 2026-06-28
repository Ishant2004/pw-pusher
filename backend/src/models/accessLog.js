import mongoose from "mongoose";

// One row per view, so a secret's owner can see who opened it and when.
const accessLogSchema = new mongoose.Schema({
  secretId: { type: mongoose.Schema.Types.ObjectId, ref: "Secret", required: true, index: true },
  viewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ipHash: { type: String, default: null }, // hashed, never the raw IP
  viewedAt: { type: Date, default: Date.now },
});

export const AccessLog = mongoose.model("AccessLog", accessLogSchema);
