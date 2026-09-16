# Khalyx Empire

Fashion and lifestyle commerce: one Express API and MongoDB database, shared by the customer storefront, admin dashboard, and in-store ERP / POS.

**Hosting and go-live:** see **[DEPLOY.md](./DEPLOY.md)** (free and paid tools, Atlas, Render/Vercel, domains, payments).

## Apps

| App | URL (local) |
| --- | --- |
| Storefront | http://localhost:5173 |
| Admin | http://localhost:5174/admin/ |
| ERP / POS | http://localhost:5175/erp/ |
| API | http://localhost:5000/api/health |

## Quick start

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` (Atlas) plus a strong `JWT_SECRET`.
2. Install, seed the catalog, run everything:

```bash
npm install
npm run seed
npm run dev
```

If Atlas is unreachable, development falls back to a local catalog so you can still work.

Edit products in **Admin → Products**, or in `server/src/seed/data.js` then `npm run seed` (re-seed replaces catalog data).

## Demo logins (change these before production)

- Admin: `admin@khalyx.ng` / `KhalyxAdmin!23`
- Staff: `staff@khalyx.ng` / `KhalyxStaff!23`
- Customer: `ada@khalyx.ng` / `ShopKhalyx!23`

## GitHub

https://github.com/Sirdurx-CODELABS/khalyxempire
