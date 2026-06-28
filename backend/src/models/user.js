import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null }, // null for Google-only accounts
    googleSub: { type: String }, // set only for Google accounts (left unset otherwise)
    status: { type: String, enum: ["unverified", "active"], default: "unverified" },
  },
  { timestamps: true },
);

// Enforce a unique googleSub ONLY for accounts that actually have one.
// (A partial index avoids the classic "many docs with null" collision.)
userSchema.index(
  { googleSub: 1 },
  { unique: true, partialFilterExpression: { googleSub: { $type: "string" } } },
);

export const User = mongoose.model("User", userSchema);
