# PW Pusher

Zero-knowledge secret sharing — share a password or sensitive note via a
self-destructing, expiring link. Content is encrypted **in the browser**; the
server only ever stores ciphertext and can't read it.

## Structure

- **`backend/`** — Node.js + Express API (plain JavaScript). Deploys to Railway/Render.
- **`frontend/`** — React + Vite web app + `/s/:token` viewer. Deploys to Vercel.

## Run locally

```bash
# 1. Redis (install once: brew install redis)
redis-server --daemonize yes

# 2. Backend  → http://localhost:8080
cd backend && npm install && npm run dev

# 3. Frontend → http://localhost:5173  (new terminal)
cd frontend && npm install && npm run dev
```

MongoDB is cloud-hosted (Atlas) via `backend/.env`; Redis runs locally. The Vite
dev server proxies `/api` to the backend, so it's one origin (no CORS) in dev.

## Deploy

Three pieces: **backend → Railway**, **Redis → Upstash**, **frontend → Vercel**.
The frontend proxies `/api` to the backend (see `frontend/vercel.json`) so the
browser stays same-origin and the auth cookie works without a custom domain.

1. **Push to GitHub.** `.env` files are git-ignored — never commit secrets.
2. **Upstash** → create a Redis database → copy its `rediss://…` URL.
3. **Railway** → New Project → Deploy from GitHub → set **Root Directory** to
   `backend`, Start Command `npm start`. Add the env vars from
   `backend/.env.example` (use the Upstash URL for `REDIS_URL`, Atlas for
   `MONGODB_URI`, `NODE_ENV=production`, `COOKIE_SECURE=true`, fresh random
   secrets). Copy the deployed backend URL.
4. **`frontend/vercel.json`** → replace `YOUR-BACKEND-URL...` with the Railway URL,
   commit, push.
5. **Vercel** → Import the repo → **Root Directory** `frontend` (framework: Vite).
   Add env var `VITE_GOOGLE_CLIENT_ID`. Leave `VITE_API_URL` empty (the proxy
   handles it). Deploy → copy the Vercel URL.
6. **Back on Railway** → set `APP_URL` to the Vercel URL → redeploy.
7. **Google Cloud Console** → add the Vercel URL to the OAuth client's
   *Authorized JavaScript origins*.
8. **Rotate** the previously-exposed Google secret + Mongo password first.

## Status

- ✅ Backend — email/password auth (6-digit verification), Google login,
  zero-knowledge encrypted secrets with expiry (5 min–5 days) + burn-after-read,
  request logging.
- ✅ Frontend — login/signup, create-secret, `/s/:token` in-browser viewer.
- ⏳ Deployment.
- ⏳ Browser extension.
