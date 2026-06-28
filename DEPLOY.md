# Deploying PW Pusher

Three services: **backend → Railway**, **Redis → Upstash**, **frontend → Vercel**
(MongoDB is already on Atlas). The frontend proxies `/api` to the backend via
`frontend/vercel.json`, so the browser stays same-origin and the login cookie
works without a custom domain.

---

## 0. Rotate the exposed secrets (do first)
These were shared during development:
- **Google Cloud Console** → APIs & Services → Credentials → your OAuth client → reset the **client secret**.
- **MongoDB Atlas** → Database Access → edit the DB user → new password (update `MONGODB_URI`).

## 1. Push to GitHub
```bash
cd /Users/tusharyadav/Documents/folder/pw-pusher
git add -A
git commit -m "Initial commit"
# create an empty repo at https://github.com/new (e.g. "pw-pusher"), then:
git remote add origin https://github.com/<your-username>/pw-pusher.git
git branch -M main
git push -u origin main
```
`.env` files are git-ignored, so secrets stay local.

## 2. Redis → Upstash
upstash.com → **Create Database** (Redis) → pick a region → copy the
**`rediss://…`** URL → that's `REDIS_URL`.

## 3. Backend → Railway
railway.app → **New Project → Deploy from GitHub repo** → select your repo.
- **Settings → Root Directory:** `backend`
- **Settings → Start Command:** `npm start`
- **Variables** (add all of these):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `COOKIE_SECURE` | `true` |
| `MONGODB_URI` | your Atlas URI (with the NEW password) |
| `REDIS_URL` | your Upstash `rediss://…` URL |
| `JWT_ACCESS_SECRET` | `openssl rand -hex 32` |
| `COOKIE_SECRET` | `openssl rand -hex 32` |
| `ACCESS_TOKEN_TTL` | `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | `15` |
| `MASTER_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | your client id |
| `GOOGLE_CLIENT_SECRET` | your NEW client secret |
| `RESEND_API_KEY` | your Resend key |
| `EMAIL_FROM` | `PW Pusher <onboarding@resend.dev>` (or your verified domain) |
| `RATE_LIMIT_MAX` | `120` |

> Don't set `PORT` — Railway provides it and the app reads it automatically.
> `APP_URL` is added in step 6.

- **Settings → Networking → Generate Domain** → copy the backend URL.

Generate the three secrets locally:
```bash
openssl rand -hex 32      # JWT_ACCESS_SECRET
openssl rand -hex 32      # COOKIE_SECRET
openssl rand -base64 32   # MASTER_ENCRYPTION_KEY
```

## 4. Point the proxy at the backend
Edit `frontend/vercel.json` → replace `YOUR-BACKEND-URL.up.railway.app` with your
real Railway host, then:
```bash
git commit -am "Set backend URL in vercel proxy"
git push
```

## 5. Frontend → Vercel
vercel.com → **Add New → Project** → import your repo.
- **Root Directory:** `frontend` (framework auto-detects as **Vite**)
- **Environment Variables:** `VITE_GOOGLE_CLIENT_ID` = your client id
  (leave `VITE_API_URL` unset — the proxy handles it)
- **Deploy** → copy the Vercel URL.

## 6. Wire the URLs back
Railway → Variables → `APP_URL` = your Vercel URL → it redeploys.

## 7. Google OAuth
Google Cloud Console → your OAuth client → **Authorized JavaScript origins** →
add your Vercel URL → Save.

## 8. Test
Open the Vercel URL → sign up → get the code (your Resend inbox, or Railway
**Deploy Logs**) → create a secret → open the link → decrypt. 🎉

---

### Notes
- **Email to any inbox** needs a **verified domain** in Resend; until then it only
  delivers to your own Resend account email. Set `EMAIL_FROM` to the verified
  domain afterwards.
- Using **Render** instead of Railway? Same idea: New Web Service → root dir
  `backend`, build `npm install`, start `npm start`, add the same env vars.
