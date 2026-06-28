# PW Pusher — Backend (plain JavaScript + Express)

Zero-knowledge secret sharing API. The client encrypts content before sending it;
the server only ever stores ciphertext. Login (email/password with a 6-digit code,
or Google) gates access and produces an audit trail.

Plain JavaScript, no build step, no TypeScript.

## Layout

```
src/
  index.js            start the server
  app.js              build the Express app (middleware, routes, errors)
  config/env.js       load + validate .env
  constants.js        expiry limits, sizes
  validation.js       zod schemas for request bodies
  db/                 mongo.js, redis.js
  lib/                crypto, tokens, password, otp, google, mailer, errors
  middleware/auth.js  authenticate / requireVerified
  models/             user.js, secret.js, accessLog.js
  routes/             auth.js, secrets.js
test/crypto.test.js   unit test (node --test)
scripts/e2e.mjs       live end-to-end check
```

## Run locally

You need MongoDB and Redis. The included `.env` already points Mongo at Atlas
(cloud); Redis runs locally.

```bash
# 1. start Redis (install once with: brew install redis)
redis-server --daemonize yes        # check: redis-cli ping -> PONG

# 2. install deps + run
npm install
npm run dev                          # http://localhost:8080  (auto-reloads on save)

# 3. smoke test
curl localhost:8080/health
```

Verification/reset codes print to the `npm run dev` console (no email provider
needed in dev). Set `RESEND_API_KEY` to send real emails.

```bash
npm test        # crypto unit tests
```

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | — | create account, email a code |
| POST | `/api/auth/verify-email` | — | confirm code → tokens |
| POST | `/api/auth/resend-verification` | — | re-send a code |
| POST | `/api/auth/login` | — | email + password → tokens |
| POST | `/api/auth/google` | — | Google ID token → tokens |
| POST | `/api/auth/forgot-password` | — | email a reset code |
| POST | `/api/auth/reset-password` | — | reset with code → tokens |
| POST | `/api/auth/refresh` | cookie | new access token |
| POST | `/api/auth/logout` | cookie | revoke session |
| GET | `/api/auth/me` | bearer | current user |
| POST | `/api/secrets` | verified | create (stores ciphertext) |
| GET | `/api/secrets` | verified | list your active secrets |
| GET | `/api/secrets/:token` | verified | view (returns ciphertext, logs access) |
| DELETE | `/api/secrets/:token` | verified | revoke |

## Deploy (Railway / Render)

1. Push the repo to GitHub.
2. New project → point it at the `backend/` folder.
3. Build: `npm install` · Start: `npm start`.
4. Set env vars from `.env.example` (use **Upstash** for `REDIS_URL`, MongoDB
   Atlas for `MONGODB_URI`, and real random secrets). Set `NODE_ENV=production`
   and `APP_URL` to your deployed frontend URL.
