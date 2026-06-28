import mongoose from "mongoose";

const secretSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true }, // the public URL id
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // at-rest envelope encryption of the client's already-encrypted blob (all base64)
    ciphertext: String,
    iv: String,
    authTag: String,
    wrappedDek: String,
    wrapIv: String,
    wrapTag: String,
    keyVersion: { type: Number, default: 1 },

    expiresAt: { type: Date, required: true },
    maxViews: { type: Number, default: null }, // null = unlimited; 1 = burn after read
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Mongo auto-deletes documents past expiresAt (sweep runs ~every 60s).
// The read route also checks expiry, so there is never a stale window.
secretSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Secret = mongoose.model("Secret", secretSchema);
