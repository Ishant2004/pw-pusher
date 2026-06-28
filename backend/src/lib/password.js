// Password hashing with bcrypt. We use the sync helpers to keep the code simple;
// hashing is fast enough for login/signup endpoints.
import bcrypt from "bcryptjs";

const ROUNDS = 12;

export const hashPassword = (plain) => bcrypt.hashSync(plain, ROUNDS);
export const verifyPassword = (plain, hash) => bcrypt.compareSync(plain, hash);
