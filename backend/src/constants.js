// Expiry limits for a shared secret (in seconds).
export const EXPIRY = {
  MIN_SECONDS: 5 * 60, // 5 minutes
  MAX_SECONDS: 5 * 24 * 60 * 60, // 5 days
  DEFAULT_SECONDS: 4 * 24 * 60 * 60, // 4 days
};

export const SECRET = {
  MAX_CIPHERTEXT_B64: 200 * 1024, // ~140 KB of plaintext
  TOKEN_LENGTH: 10, // short but unguessable (~59 bits) + login-gated + expiring
};

// One-time email codes (verification / password reset).
export const OTP = {
  LENGTH: 6,
  TTL_SECONDS: 10 * 60, // 10 minutes
  MAX_ATTEMPTS: 5,
};
