# In-store ERP / POS (Phase 3)

Same MongoDB and Express API as the online store and admin dashboard. Inventory does not fork.

- App: http://localhost:5175/erp/
- Demo staff: `staff@khalyx.ng` / `KhalyxStaff!23`

```bash
npm run dev:erp
```

Desktop window (after the Vite app is running):

```bash
npm run electron -w @khalyx/erp
```

Offline sales queue in the browser and replay via `POST /api/erp/sync` when the network returns.
