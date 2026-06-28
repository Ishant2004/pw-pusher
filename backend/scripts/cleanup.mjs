// One-off: remove test users/secrets and fix the googleSub index.
// Run: node --env-file=.env scripts/cleanup.mjs
import mongoose from "mongoose";
import { User } from "../src/models/user.js";
import { Secret } from "../src/models/secret.js";

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

// delete obvious test users and their secrets
const testUsers = await User.find({ email: /^(e2e|curltest)/ }).select("_id");
const ids = testUsers.map((u) => u._id);
await Secret.deleteMany({ ownerId: { $in: ids } });
const del = await User.deleteMany({ _id: { $in: ids } });

// drop any leftover explicit-null googleSub so it isn't indexed
await User.collection.updateMany({ googleSub: null }, { $unset: { googleSub: 1 } });

// rebuild indexes to match the current schema (drops the old sparse index,
// creates the new partial one)
await User.syncIndexes();

console.log(`✅ removed ${del.deletedCount} test users; indexes synced`);
await mongoose.disconnect();
