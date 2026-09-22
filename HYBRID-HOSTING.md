# Khalyx hybrid hosting — implementation plan

How to run Khalyx as a parent company: **domain at Hostinger**, **DNS on Cloudflare**, **marketing sites on Hostinger shared hosting**, **Empire applications on a VPS**, **MongoDB on Atlas**.

Keep the current **Vercel (3 frontends) + Render (API)** stack live until Phase 4 cutover so nothing breaks while you set this up.

Related: day-to-day deploy notes for the current stack live in [`DEPLOY.md`](./DEPLOY.md).

---

## Why this layout

| Piece | Where | Why |
| --- | --- | --- |
| `khalyx.ng` registration | Hostinger | Convenient registrar + shared hosting for marketing |
| DNS | Cloudflare (Free) | One control plane for all subdomains, CDN, SSL |
| `khalyx.ng`, `technologies.khalyx.ng` | Hostinger shared | Simple HTML/WordPress brand sites |
| `empire.khalyx.ng` (optional) | Hostinger shared | Empire **marketing** landing only |
| `api` / `admin` / `erp` / `shop.empire…` | One VPS | Node API, SPAs, webhooks, PM2, cron |
| MongoDB | Atlas (keep) | Do not self-host Mongo on the first VPS |

### Important refinement

Hostinger **shared** hosting is for marketing pages (HTML/WordPress/PHP).

Empire’s **storefront, Admin, ERP** are Vite React SPAs. The **API** is Express/Node. Those belong on a **VPS** (or keep shop/admin/erp on Vercel temporarily and only move the API to the VPS as a half-step).

Do **not** buy a separate `.com` for every product yet. Build under:

```text
khalyx.ng
├── technologies.khalyx.ng
└── empire.khalyx.ng
    ├── shop.empire.khalyx.ng
    ├── api.empire.khalyx.ng
    ├── admin.empire.khalyx.ng
    └── erp.empire.khalyx.ng
```

---

## Target architecture

```text
                         khalyx.ng
                            │
                     Cloudflare DNS
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
          ▼                 ▼                  ▼
      Hostinger           VPS #1           Hostinger
          │                 │                  │
    khalyx.ng          Empire Systems    technologies
                            │
                  ┌─────────┼─────────┐
                  ▼         ▼         ▼
                 API      Admin      ERP
                  │
                  └── shop (storefront)
```

Later growth:

```text
                khalyx.ng
                    │
               Cloudflare
                    │
       ┌────────────┼────────────┐
       │            │            │
   Hostinger      VPS 1        VPS 2
       │            │            │
  Websites       Empire       Future
                systems       companies
```

---

## Hostname map

| Hostname | Record | Points to | Role |
| --- | --- | --- | --- |
| `khalyx.ng` | A / CNAME | Hostinger | Parent company site |
| `www.khalyx.ng` | CNAME | `khalyx.ng` | WWW alias |
| `technologies.khalyx.ng` | A / CNAME | Hostinger | Technologies marketing |
| `empire.khalyx.ng` | A / CNAME | Hostinger (or VPS) | Optional Empire marketing landing |
| `shop.empire.khalyx.ng` | A | VPS public IP | Empire storefront (React) |
| `api.empire.khalyx.ng` | A | VPS public IP | Express API |
| `admin.empire.khalyx.ng` | A | VPS public IP | Admin dashboard |
| `erp.empire.khalyx.ng` | A | VPS public IP | ERP / POS |

**Shop hostname:** prefer `shop.empire.khalyx.ng` so `empire.khalyx.ng` can stay a marketing page. Later you can CNAME `empire.khalyx.ng` → shop if you want a shorter URL.

---

## Current → target

| Today (keep until cutover) | Target hostname | Move in |
| --- | --- | --- |
| `*-storefront*.vercel.app` | `shop.empire.khalyx.ng` | Phase 4 |
| `*-admin*.vercel.app` | `admin.empire.khalyx.ng` | Phase 4 |
| `*-erp*.vercel.app` | `erp.empire.khalyx.ng` | Phase 4 |
| `*.onrender.com` API | `api.empire.khalyx.ng` | Phase 3–4 |
| Atlas M0 | Same Atlas cluster | Keep |

---

## Phases overview

| Phase | Duration | Work | Downtime risk |
| --- | --- | --- | --- |
| 0 — Now | — | Vercel ×3 + Render + Atlas | Already live |
| 1 — Domain & DNS | 1–2 days | Hostinger domain + Cloudflare NS | None |
| 2 — Marketing sites | 2–5 days | Hostinger HTML/WordPress | None |
| 3 — VPS foundation | 1–3 days | Ubuntu + Nginx + Node 20 + API | None (parallel) |
| 4 — Empire apps | 2–4 days | Frontends + env + DNS cutover | Low if staged |
| 5 — Harden | Ongoing | Cloudinary, backups, monitoring | None |

---

## Starter budget

| Item | Vendor | Rough cost | Notes |
| --- | --- | --- | --- |
| Domain `khalyx.ng` | Hostinger | ~$10–25 / yr | Register only; DNS on Cloudflare |
| DNS | Cloudflare Free | $0 | NS + proxy + CDN |
| Marketing sites | Hostinger shared | ~$3–8 / mo | Parent + Technologies |
| Apps VPS | Hetzner / DigitalOcean / Hostinger VPS | ~$6–12 / mo | 2 vCPU, 2–4 GB RAM |
| MongoDB | Atlas M0 → paid later | $0 → $ | Keep Atlas |
| Images | Cloudinary free | $0 | Replace local `/uploads` |

All-in starter: roughly **$10–25/mo** (domain annualized) plus free Cloudflare/Atlas/Cloudinary.

**Simpler ops alternative:** Hostinger domain + Hostinger VPS + Cloudflare DNS (fewer vendors).  
**Recommended long-term:** Hostinger shared for marketing + Hetzner/DO VPS for Empire apps + Cloudflare DNS.

---

## Phase 0 — Keep current stack running

No action required beyond not deleting Vercel/Render projects yet.

Checklist:

- [ ] Storefront, Admin, ERP still deploy on Vercel
- [ ] API still runs on Render (`npm start`, not `npm run dev`)
- [ ] Atlas Network Access allows Render (or `0.0.0.0/0` temporarily)
- [ ] Secrets stay on the API host only — frontends use `VITE_*` only

---

## Phase 1 — Register domain and move DNS to Cloudflare

### Goal

Own `khalyx.ng` and control every subdomain from Cloudflare without touching apps yet.

### Steps

1. **Register or confirm** `khalyx.ng` in Hostinger (Domains).
2. Create a [Cloudflare](https://dash.cloudflare.com) account → **Add a site** → enter `khalyx.ng` → Free plan.
3. Cloudflare shows **two nameservers** (e.g. `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`).
4. In Hostinger → Domains → `khalyx.ng` → **DNS / Nameservers** → switch from Hostinger NS to **Custom nameservers** → paste Cloudflare’s two NS.
5. Wait until Cloudflare status is **Active** (often &lt; 1 hour; up to 24–48h).
6. In Cloudflare → **SSL/TLS**:
   - While origins are still being set up: **Flexible** is okay temporarily.
   - Once Hostinger and VPS have real certificates: **Full (strict)**.

### Do not do yet

- Do not point `shop` / `admin` / `erp` / `api` at Vercel or Render custom domains until Phase 4 (or you can add them as optional custom domains earlier if you want — not required).
- Do not delete Hostinger DNS zone until Cloudflare is Active.

### Verify

```bash
nslookup -type=NS khalyx.ng
```

Nameservers should be Cloudflare’s.

### Checklist

- [ ] Domain registered at Hostinger
- [ ] Cloudflare site Active
- [ ] Hostinger using Cloudflare nameservers
- [ ] SSL/TLS plan noted for later Full (strict)

---

## Phase 2 — Marketing sites on Hostinger

### Goal

Publish brand sites that do **not** run the React monorepo.

### Steps

1. In Hostinger hPanel, create (or use) a **shared hosting** plan.
2. Create websites / document roots for:
   - `khalyx.ng` (parent)
   - `technologies.khalyx.ng`
   - optionally `empire.khalyx.ng` (marketing only)
3. Publish simple pages (WordPress or static HTML). Link to the future shop when ready.
4. In **Cloudflare DNS** (not Hostinger DNS), add records Hostinger documents (usually an **A** to Hostinger IP, or **CNAME** to their hostname).
5. Turn **orange cloud** (proxied) on after Hostinger SSL works, or use Cloudflare Origin Certs later.
6. Force HTTPS in Cloudflare → SSL/TLS → Edge Certificates → Always Use HTTPS.

### Verify

Open `https://khalyx.ng` and `https://technologies.khalyx.ng` in a browser. Marketing only — no API required.

### Checklist

- [ ] Parent site live
- [ ] Technologies site live
- [ ] DNS records only in Cloudflare
- [ ] Optional Empire marketing landing

---

## Phase 3 — VPS foundation (API first)

### Goal

Always-on Node API at `https://api.empire.khalyx.ng` while Vercel frontends still work (update CORS when you switch frontends, or allow both old and new origins temporarily).

### 3.1 Choose and create the VPS

Suggested starter:

- **Ubuntu 22.04 or 24.04 LTS**
- **2 GB RAM** minimum (4 GB if you build on the same box)
- **1 public IPv4**

Providers: Hetzner CX22 / DigitalOcean Basic / Hostinger VPS — any is fine.

### 3.2 First login hardening

SSH as root (or with provider key), then:

```bash
# Create deploy user
adduser deploy
usermod -aG sudo deploy

# SSH keys: copy your public key into /home/deploy/.ssh/authorized_keys
# Then disable password login in /etc/ssh/sshd_config when keys work

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

apt update && apt upgrade -y
apt install -y git nginx certbot python3-certbot-nginx ufw fail2ban
```

### 3.3 Install Node 20

```bash
# Example: NodeSource or nvm — pick one and stick to it
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # >= 20
npm -v
sudo npm install -g pm2
```

### 3.4 Clone and run the API

```bash
sudo mkdir -p /var/www/khalyx
sudo chown deploy:deploy /var/www/khalyx
cd /var/www/khalyx
git clone git@github.com:Sirdurx-CODELABS/khalyxempire.git .

# Install workspace deps (from repo root)
npm install --omit=dev

# Create server/.env from your Render env (never commit this file)
nano server/.env
```

Minimum production values in `server/.env` (adjust to your secrets):

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=...
JWT_SECRET=...
CLIENT_URL=https://shop.empire.khalyx.ng
ADMIN_URL=https://admin.empire.khalyx.ng
ERP_URL=https://erp.empire.khalyx.ng
API_PUBLIC_URL=https://api.empire.khalyx.ng
AUTH0_CALLBACK_URL=https://api.empire.khalyx.ng/api/auth/auth0/callback
# … Paystack, Flutterwave, Auth0, SMTP, etc. from Render
```

**Temporary half-step:** while frontends still on Vercel, set `CLIENT_URL` / `ADMIN_URL` / `ERP_URL` to the current `*.vercel.app` URLs (or list both if your CORS code supports one origin each — this codebase uses one URL per app, so switch when frontends move, or keep Render until Phase 4).

Start with PM2:

```bash
cd /var/www/khalyx
pm2 start npm --name khalyx-api -- start
pm2 save
pm2 startup   # follow the printed systemd command
```

### 3.5 Nginx reverse proxy for the API

Create `/etc/nginx/sites-available/api.empire.khalyx.ng`:

```nginx
server {
    listen 80;
    server_name api.empire.khalyx.ng;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and get a certificate:

```bash
sudo ln -s /etc/nginx/sites-available/api.empire.khalyx.ng /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3.6 Cloudflare DNS for the API

1. Cloudflare → DNS → Add record:
   - Type **A**
   - Name `api.empire`
   - IPv4 = VPS public IP
   - Proxy: **DNS only** (grey cloud) while issuing Let’s Encrypt, then you can enable proxy
2. Issue cert:

```bash
sudo certbot --nginx -d api.empire.khalyx.ng
```

3. Optionally turn Cloudflare proxy back on (orange). SSL mode → **Full (strict)**.

### 3.7 Atlas Network Access

MongoDB Atlas → Network Access → **Add IP** → VPS public IP (prefer this over `0.0.0.0/0`).

### 3.8 Verify API

```bash
curl -sS https://api.empire.khalyx.ng/api/health
```

Expect a healthy JSON response (same as Render).

### Checklist

- [ ] VPS provisioned, UFW on
- [ ] Node 20 + PM2 + Nginx
- [ ] `server/.env` copied from Render (secrets never in git)
- [ ] `api.empire.khalyx.ng` A record → VPS
- [ ] Certbot SSL
- [ ] Atlas allows VPS IP
- [ ] `/api/health` OK

---

## Phase 4 — Empire frontends on the VPS + cutover

### Goal

Serve storefront, admin, and ERP as static Nginx sites; point DNS; update Auth0 and payment webhooks; retire Render.

### 4.1 Build on a machine with Node 20

Either build on the VPS (needs enough RAM) or build in CI / on your PC and `scp`/`rsync` the `dist` folders.

On the VPS (example):

```bash
cd /var/www/khalyx
git pull

# Admin and ERP must use base "/" on their own subdomains
export VITE_BASE_PATH=/

# Point every frontend at the new API
export VITE_API_URL=https://api.empire.khalyx.ng

# Add any other VITE_* keys your apps need (Auth0 public bits, Paystack public key, etc.)
npm run build:storefront
VITE_BASE_PATH=/ npm run build:admin
VITE_BASE_PATH=/ npm run build:erp
```

Vite outputs (typical):

| App | Dist folder |
| --- | --- |
| Storefront | `apps/storefront/dist` |
| Admin | `apps/admin/dist` |
| ERP | `apps/erp/dist` |

Install to web roots:

```bash
sudo mkdir -p /var/www/shop /var/www/admin /var/www/erp
sudo rsync -a --delete apps/storefront/dist/ /var/www/shop/
sudo rsync -a --delete apps/admin/dist/ /var/www/admin/
sudo rsync -a --delete apps/erp/dist/ /var/www/erp/
```

### 4.2 Nginx SPA configs

Example for shop (`/etc/nginx/sites-available/shop.empire.khalyx.ng`):

```nginx
server {
    listen 80;
    server_name shop.empire.khalyx.ng;
    root /var/www/shop;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Repeat for `admin.empire.khalyx.ng` → `/var/www/admin` and `erp.empire.khalyx.ng` → `/var/www/erp`.

```bash
sudo ln -s /etc/nginx/sites-available/shop.empire.khalyx.ng /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.empire.khalyx.ng /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/erp.empire.khalyx.ng /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4.3 Cloudflare A records

| Name | Type | Value | Proxy |
| --- | --- | --- | --- |
| `shop.empire` | A | VPS IP | DNS only → then Proxied |
| `admin.empire` | A | VPS IP | same |
| `erp.empire` | A | VPS IP | same |

```bash
sudo certbot --nginx \
  -d shop.empire.khalyx.ng \
  -d admin.empire.khalyx.ng \
  -d erp.empire.khalyx.ng
```

### 4.4 Env cutover (API + third parties)

Update `server/.env` on the VPS and `pm2 restart khalyx-api`:

| Setting | New value |
| --- | --- |
| `CLIENT_URL` | `https://shop.empire.khalyx.ng` |
| `ADMIN_URL` | `https://admin.empire.khalyx.ng` |
| `ERP_URL` | `https://erp.empire.khalyx.ng` |
| `API_PUBLIC_URL` | `https://api.empire.khalyx.ng` |
| `AUTH0_CALLBACK_URL` | `https://api.empire.khalyx.ng/api/auth/auth0/callback` |

**Auth0** (Application settings):

- Allowed Callback URLs: include `AUTH0_CALLBACK_URL` above
- Allowed Web Origins / Logout URLs: include `https://shop.empire.khalyx.ng`

**Paystack** → Webhooks:

- `https://api.empire.khalyx.ng/api/payments/paystack/webhook`

**Flutterwave** → Webhooks:

- `https://api.empire.khalyx.ng/api/payments/flutterwave/webhook`

Rebuild frontends whenever `VITE_*` changes (they are baked into the JS at build time).

### 4.5 Smoke test before retiring Render

- [ ] `https://api.empire.khalyx.ng/api/health`
- [ ] Shop loads; products list from API
- [ ] Admin login + catalog
- [ ] ERP login + inventory
- [ ] Google/Auth0 login on shop
- [ ] Test payment webhook (Paystack/Flutterwave test mode)
- [ ] CORS: browser console has no blocked origin errors

### 4.6 Retire old hosts

After **48 hours** of healthy production:

1. Pause or delete the Render free web service (saves cold starts / confusion).
2. Keep Vercel projects as emergency fallback for 1–2 weeks, then archive.
3. Remove old webhook URLs and Auth0 localhost-only entries you no longer need (keep local for development).

### Half-step option (less work first)

1. Phase 3 only: API on VPS.
2. Point Vercel frontends’ `VITE_API_URL` at `https://api.empire.khalyx.ng` and redeploy.
3. Move static sites to Nginx later.

---

## Phase 5 — Harden for real traffic

### Cloudinary (product images)

Local `server/uploads` on a VPS survives restarts better than Render free, but still dies if you wipe the disk. Wire Cloudinary (or S3) and stop relying on local uploads for production photos.

### Backups

- Atlas: enable cloud backups when you leave M0.
- VPS: weekly snapshot via provider + backup `server/.env` in a password manager (not in git).
- Optional: `restic` / `rclone` of `/var/www` and upload dirs.

### Monitoring

- UptimeRobot or Better Stack → ping `https://api.empire.khalyx.ng/api/health` every 5 minutes.
- `pm2 logs khalyx-api` / `pm2 monit` when debugging.

### Security basics

- SSH key-only login; no root password SSH.
- Keep `ufw` + `fail2ban`.
- Rotate `JWT_SECRET` and payment keys if they were ever committed or shared in chat.
- Cloudflare: enable Bot Fight Mode lightly; rate-limit `/api/auth` later if abused.

### Checklist

- [ ] Cloudinary (or S3) for images
- [ ] Uptime monitor on `/api/health`
- [ ] Provider snapshots on
- [ ] SSL Full (strict) everywhere
- [ ] Secrets only on VPS + password manager

---

## Deploy script sketch (optional later)

Once Phase 3–4 work, add something like `scripts/deploy-vps.sh` to the repo:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/khalyx
git pull
npm install --omit=dev
export VITE_API_URL=https://api.empire.khalyx.ng
export VITE_BASE_PATH=/
npm run build
rsync -a --delete apps/storefront/dist/ /var/www/shop/
rsync -a --delete apps/admin/dist/ /var/www/admin/
rsync -a --delete apps/erp/dist/ /var/www/erp/
pm2 restart khalyx-api
```

Ask when you want this added and wired to GitHub Actions or a manual SSH deploy.

---

## What not to do

| Avoid | Why |
| --- | --- |
| Buying `empire.com`, `empireerp.com`, … for every product now | Namespace under `khalyx.ng` is enough |
| Running Empire React apps on Hostinger shared PHP | Wrong runtime; painful deploys |
| Putting MongoDB on the first small VPS | Ops burden; keep Atlas |
| Pointing Cloudflare NS before noting Hostinger DNS records you still need | Copy any critical records into Cloudflare first |
| Setting Render start command to `npm run dev` | OOM / wrong process — always `npm start` |
| Putting backend secrets in Vercel | Frontends only need `VITE_*` |

---

## Execution backlog

- [ ] **Phase 1:** Register/transfer `khalyx.ng` at Hostinger; Cloudflare nameservers
- [ ] **Phase 2:** Publish `khalyx.ng` + `technologies.khalyx.ng` on Hostinger
- [ ] **Phase 3:** Provision VPS; Nginx + Node 20 + PM2; deploy API; Certbot; Atlas IP
- [ ] **Phase 4:** Build & serve shop/admin/erp; Auth0 + payment webhooks; DNS cutover
- [ ] **Phase 4b:** Monitor 48h; retire Render; freeze/archive Vercel
- [ ] **Phase 5:** Cloudinary + uptime + backups

---

## Next concrete step

1. Buy or confirm **`khalyx.ng`** at Hostinger.  
2. Add the domain to **Cloudflare** and switch nameservers.  
3. Keep **Vercel + Render** live.  
4. When ready for Phase 3, provision the VPS and follow § Phase 3 — or ask to add Nginx site files and a `scripts/deploy-vps.sh` into this repo.
