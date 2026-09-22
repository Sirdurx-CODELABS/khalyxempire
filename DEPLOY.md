# Deploying Khalyx Empire

For the long-term **Hostinger + Cloudflare + VPS** layout (domain, DNS, marketing sites, Empire apps), see [`HYBRID-HOSTING.md`](./HYBRID-HOSTING.md).

This repo is an **npm workspaces** project:

| App | Path | Local URL | Production role |
| --- | --- | --- | --- |
| API | `server/` | http://localhost:5000 | Express + MongoDB. Shared by every frontend. |
| Storefront | `apps/storefront` | http://localhost:5173 | Customer shop. |
| Admin | `apps/admin` | http://localhost:5174/admin/ | Catalog, orders, staff, labels. |
| ERP / POS | `apps/erp` | http://localhost:5175/erp/ | In-store till, inventory, barcode labels. |

All four apps must talk to **one MongoDB** (Atlas in production). Do not run a separate database per app.

---

## What to host

You need four live pieces:

1. **MongoDB** — Atlas cluster.
2. **API** — Node.js process that stays running (`npm start` in `server/`).
3. **Three static sites** — Vite builds of storefront, admin, and ERP.
4. **Secrets** — env vars on the API host. Never commit `server/.env`.

Product images uploaded in admin are saved on the API disk (`server/uploads`). Free hosts wipe that disk on every deploy/restart. For real photos, use a file host (Cloudinary or S3) or a paid API host with a persistent disk.

---

## Recommended stacks

### Free (good for launch / staging)

Works, with limits: API sleeps after idle, uploads do not persist, Atlas is capped.

| Need | Tool | Notes |
| --- | --- | --- |
| Git | [GitHub](https://github.com) Free | This repo: `Sirdurx-CODELABS/khalyxempire`. |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) M0 | 512 MB. Whitelist the API host IP, or `0.0.0.0/0` if the host IP changes. |
| API | [Render](https://render.com) Free Web Service **or** [Railway](https://railway.app) trial **or** [Fly.io](https://fly.io) free allowance | Render free **spins down** after ~15 min. First request can take 30–60s. |
| Frontends | [Vercel](https://vercel.com) Hobby **or** [Netlify](https://netlify.com) Free **or** [Cloudflare Pages](https://pages.cloudflare.com) | Three projects (shop, admin, ERP), or one project with three builds. |
| Images | [Cloudinary](https://cloudinary.com) Free | Use this instead of local `/uploads` once you go live. |
| Email | [Resend](https://resend.com) Free **or** [Brevo](https://www.brevo.com) Free | SMTP for order mail. Console-only if left empty. |
| Google login | [Auth0](https://auth0.com) Free | Storefront Google sign-in. |
| Payments | [Paystack](https://paystack.com) + [Flutterwave](https://flutterwave.com) test keys | Free to integrate; live keys need business KYC. |
| Domain | Skip at first | Use `*.onrender.com` and `*.vercel.app`. |

### Paid (shop that stays up)

| Need | Tool | Why pay |
| --- | --- | --- |
| API always on | Render Starter (~$7/mo), Railway, Fly, or a VPS ([Hetzner](https://www.hetzner.com), [DigitalOcean](https://www.digitalocean.com) ~$6/mo) | No cold start. Optional persistent disk for uploads. |
| Database | Atlas M10+ or [MongoDB Flex](https://www.mongodb.com/products/platform/atlas-flex) | Backups, more storage, better performance. |
| Frontends | Vercel Pro / Netlify Pro | Password on admin, more bandwidth. Often Hobby is enough. |
| Images | Cloudinary paid or AWS S3 + CloudFront | Product photos that survive deploys. |
| Domain + SSL | [Namecheap](https://www.namecheap.com), [Porkbun](https://porkbun.com), or [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) | `khalyx.ng` / `www`, `admin.`, `erp.`, `api.`. SSL is free on Vercel/Render/Cloudflare. |
| Email | Resend paid or Google Workspace SMTP | Higher daily send limits. |
| Monitoring | [Better Stack](https://betterstack.com) / [UptimeRobot](https://uptimerobot.com) (has free) | Ping `/api/health`. |

**Cheap production combo that actually works:** Atlas M0 (free) + Render Starter API + Vercel Hobby frontends + Cloudflare DNS + Cloudinary free + a domain.

---

## 1. Put the code on GitHub

From the project root (already done if you followed the first-push commands):

```bash
git add .
git commit -m "first commit"
git branch -M main
git remote add origin git@github.com:Sirdurx-CODELABS/khalyxempire.git
git push -u origin main
```

Confirm `.env`, `node_modules`, `server/.mongo-catalog`, and `uploads` are **not** in the commit (they are in `.gitignore`).

---

## 2. MongoDB Atlas

1. Create a cluster (M0 is fine to start).
2. Database user + password. Put the URI in `MONGODB_URI`.
3. **Network Access:** allow the IP of your API host. For Render/Railway, add `0.0.0.0/0` (anywhere) or Render’s outbound IPs.
4. Optional: create database `khalyx` and set `MONGODB_DB=khalyx`.

If Atlas blocks the host, the API falls back to a **local** catalog. That fallback is for development only. Production must reach Atlas.

---

## 3. Deploy the API (Render example)

1. New **Web Service** → connect `Sirdurx-CODELABS/khalyxempire`.
2. Settings:

   | Field | Value |
   | --- | --- |
   | Runtime | Node |
   | Root Directory | **Leave empty** (repo root — required for npm workspaces / `@khalyx/shared`) |
   | Build command | `npm install` (or `npm install --omit=dev`) |
   | Start command | `npm start` ← **API only**. Never `npm run dev` (that starts storefront+admin+ERP and OOMs on free 512Mi) |
   | Health check path | `/api/health` |
   | Instance | Free or Starter |

   Your failed deploy log showed `Running 'npm run dev'` and then Out of memory — change **Start Command** on Render to `npm start` and **Manual Deploy → Clear build cache & deploy**.


3. Environment variables (API):

```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://YOUR-STOREFRONT.vercel.app
ADMIN_URL=https://YOUR-ADMIN.vercel.app
ERP_URL=https://YOUR-ERP.vercel.app
JWT_SECRET=generate-a-long-random-string
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/khalyx?retryWrites=true&w=majority
MONGODB_DB=khalyx

PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_WEBHOOK_HASH=

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Khalyx Empire <orders@khalyx.ng>

WHATSAPP_BUSINESS_NUMBER=2348000000000
WHATSAPP_GROUP_URL=https://chat.whatsapp.com/FcNOmy0VdI6ISNDi1stgSx
FLAT_SHIPPING_FEE=2500
FREE_SHIPPING_THRESHOLD=150000

AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_CALLBACK_URL=https://YOUR-STOREFRONT.vercel.app/api/auth/auth0/callback
```

4. After the first deploy, open a **Render Shell** (or any one-off job) and seed:

```bash
npm run seed
```

That writes the eight product lines into Atlas. Re-running seed **replaces** products and categories.

5. Health check: `https://YOUR-API.onrender.com/api/health` should return `{ "ok": true }`.

**Railway:** same start command, paste the same env vars.  
**VPS:** install Node 20+, clone the repo, `npm install`, use [PM2](https://pm2.keymetrics.io) (`pm2 start npm --name khalyx-api -- start`) and [Caddy](https://caddyserver.com) or Nginx for HTTPS.

---

## 4. Deploy the frontends (Vercel)

Create **three** Vercel projects from the same GitHub repo. For each project, set **Root Directory** to that app and leave Framework as Vite.

Each frontend reads `VITE_API_URL` at **build** time. After you change it, **redeploy**.

`vercel.json` in each app already sets:

| Field | Value |
| --- | --- |
| Install Command | `cd ../.. && npm install` (monorepo workspaces) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Rewrites | SPA → `index.html` |

On the Vercel UI (Build and Output Settings), you can leave the override toggles **off** — `vercel.json` applies. If you override manually, match the table above.

Admin and ERP use `base: '/'` automatically on Vercel (`VERCEL=1`), so open the project root URL (not `/admin/` or `/erp/`). Locally they still use `/admin/` and `/erp/`.

### 1) Storefront

| Setting | Value |
| --- | --- |
| Root Directory | `apps/storefront` |
| Env | `VITE_API_URL=https://YOUR-API.onrender.com` |

### 2) Admin

| Setting | Value |
| --- | --- |
| Root Directory | `apps/admin` |
| Env | `VITE_API_URL=https://YOUR-API.onrender.com` |
| Env (optional) | `VITE_ERP_URL=https://YOUR-ERP.vercel.app` |

### 3) ERP

| Setting | Value |
| --- | --- |
| Root Directory | `apps/erp` |
| Env | `VITE_API_URL=https://YOUR-API.onrender.com` |
| Env (optional) | `VITE_ADMIN_URL=https://YOUR-ADMIN.vercel.app` |

Copy examples from each app’s `.env.example`. **Never** commit real `.env` files (blocked by `.gitignore`).

Local build check from repo root:

```bash
npm run build:storefront
npm run build:admin
npm run build:erp
```

The **Electron** wrapper (`npm run electron:erp`) is for a till PC, not for Vercel.

### Netlify / Cloudflare Pages

Same idea: root directory + install from monorepo root + `npm run build` + `dist` + `VITE_API_URL`. Add SPA redirects (`/*` → `index.html`).

---

## 5. Point env vars at the live URLs

Once you have the four public URLs, update:

**API (Render)**

- `CLIENT_URL`, `ADMIN_URL`, `ERP_URL` — must match the frontend origins (CORS + cookies).
- `AUTH0_CALLBACK_URL` — storefront origin + `/api/auth/auth0/callback`.

**Frontends (Vercel)** — rebuild after changing:

- `VITE_API_URL` — API origin **without** `/api` (the clients append `/api`).

Example:

```
VITE_API_URL=https://khalyx-api.onrender.com
```

becomes requests to `https://khalyx-api.onrender.com/api/products`.

---

## 6. Custom domain (paid domain, free SSL)

Example layout:

| Host | DNS | App |
| --- | --- | --- |
| `khalyx.ng` / `www` | Vercel | Storefront |
| `admin.khalyx.ng` | Vercel | Admin (`base: '/'`) |
| `erp.khalyx.ng` | Vercel | ERP (`base: '/'`) |
| `api.khalyx.ng` | Render | API |

Then set `CLIENT_URL=https://khalyx.ng` (and the admin/erp/api URLs) and redeploy.

Cloudflare DNS in **proxy** (orange cloud) is fine in front of Vercel/Render.

---

## 7. Payments, Auth0, WhatsApp

**Paystack / Flutterwave**

- Start with test keys in `server/.env`.
- Dashboard webhook URLs (must be publicly reachable HTTPS in production):
  - Paystack: `https://YOUR-API/api/payments/paystack/webhook`
  - Flutterwave: `https://YOUR-API/api/payments/flutterwave/webhook`
- Flutterwave: copy the **Secret hash** from Settings → Webhooks into `FLUTTERWAVE_WEBHOOK_HASH`.
- Paystack signs with your secret key (`x-paystack-signature`); no extra hash env var.
- Set `API_PUBLIC_URL` to your API origin so Admin → Settings shows the correct webhook URLs.
- Both handlers re-verify the transaction with the provider API and check amount before marking the order paid.
- Switch to live keys only after KYC.

**Auth0 (Google on the storefront)**

- App type: Regular Web Application.
- Allowed Callback URLs: production `AUTH0_CALLBACK_URL` **and** `http://localhost:5173/api/auth/auth0/callback` for local.
- Allowed Web Origins / Logout URLs: storefront origin.

**WhatsApp**

- `WHATSAPP_GROUP_URL` is already the group invite.
- `WHATSAPP_BUSINESS_NUMBER` is digits only, country code, no `+`.

---

## 8. After go-live

1. Open the storefront — catalog should load (API + Atlas).
2. Log in to admin (`admin@khalyx.ng` / the password from seed) and **change that password**.
3. Replace starter products, prices, and photos.
4. Create real store/ERP users in admin; do not keep demo staff on a public ERP URL.
5. Restrict ERP/admin with Vercel password protection, Cloudflare Access, or IP allowlists if you can.
6. Hit `/api/health` from a monitor every 5 minutes so a free Render box wakes up (or pay for always-on).

---

## Local reminder (not production)

```bash
cp server/.env.example server/.env
# set MONGODB_URI and JWT_SECRET
npm install
npm run seed
npm run dev
```

- Storefront http://localhost:5173  
- Admin http://localhost:5174/admin/  
- ERP http://localhost:5175/erp/  
- API http://localhost:5000/api/health  

Edit catalog in **Admin → Products**, or in `server/src/seed/data.js` then `npm run seed`.

---

## Checklist

- [ ] Repo on GitHub, `.env` not committed
- [ ] Atlas cluster + IP access + `MONGODB_URI`
- [ ] API deployed, `/api/health` is 200
- [ ] `npm run seed` ran against Atlas
- [ ] Three frontends built with `VITE_API_URL` pointing at the API
- [ ] `CLIENT_URL` / `ADMIN_URL` / `ERP_URL` match those sites
- [ ] Strong `JWT_SECRET`
- [ ] Demo passwords changed
- [ ] Payment webhooks (when you take money)
- [ ] Image hosting plan (Cloudinary/S3 or persistent disk)
- [ ] Custom domain + HTTPS (when you buy one)
