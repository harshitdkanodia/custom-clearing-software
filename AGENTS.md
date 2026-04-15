# CHA System — Agent Instructions

Customs House Agent (CHA) clearance and shipment management system. Tracks import/export jobs, containers, BOE status, KYC/filing/DO documents, billing, and courier dispatch.

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express + Prisma ORM + SQLite |
| Frontend | React 19 + Vite + React Router v7 + Tailwind CSS + shadcn/ui |
| Auth | JWT (Bearer) + bcryptjs |
| State | React Query (server state) + localStorage (auth tokens) |

## Commands

```bash
# Backend (from backend/)
npm run dev          # nodemon server.js (hot-reload, port 3001)
npm start            # node server.js (production)
npx prisma migrate dev   # apply schema migrations
npx prisma db seed       # seed 3 test users (admin/staff/viewer)
npx prisma studio        # GUI to inspect DB

# Frontend (from frontend/)
npm run dev          # Vite dev server, port 5173 (proxies /api/* and /uploads/* to :3001)
npm run build        # production build → dist/
npm run lint         # ESLint
```

## Architecture

```
backend/src/
  controllers/   # Business logic; each file handles one domain
  routes/        # Thin Express routers; mount controllers + middleware
  services/      # Cross-cutting: activityService, alertService, emailService, shipmentProgressionService
  middleware/auth.js  # verifyToken + requireRole
  prisma/schema.prisma  # SQLite schema — single source of truth for all models
frontend/src/
  pages/         # One file per route; owns data fetching + page layout
  components/    # Reusable UI; ui/ = styled shadcn/Radix wrappers
  lib/auth.js    # Axios instance, JWT interceptor, localStorage helpers
```

## Key Conventions

**API responses** always follow:
```js
{ success: true, data: {...} }                        // single record
{ success: true, data: [...], pagination: {...} }     // list
{ success: false, error: { code: 'ERROR_CODE', message: '...' } }
```

**Status enums** are SCREAMING_SNAKE_CASE strings (e.g. `READY_FOR_BILLING`, `BOE_FILED`). These are defined in [schema.prisma](backend/prisma/schema.prisma) — always check there before hardcoding status values.

**Auth tokens** are stored in `localStorage` under keys `cha_token` and `cha_user`. See [frontend/src/lib/auth.js](frontend/src/lib/auth.js).

**Role hierarchy:** `ADMIN` > `OPERATION_STAFF` > `VIEWER`. Protect backend routes with `requireRole(...)` from [middleware/auth.js](backend/src/middleware/auth.js). Guard frontend routes with `<ProtectedRoute allowedRoles={[...]}>`.

**Activity logging:** Call `logActivity({ shipmentId, userId, action, details })` from [activityService.js](backend/src/services/activityService.js) on every shipment mutation.

**Auto-status progression:** After container/BOE/document updates, call `checkAndProgressShipment(shipmentId)` from [shipmentProgressionService.js](backend/src/services/shipmentProgressionService.js) to auto-advance statuses.

## Database Models (brief)

See [schema.prisma](backend/prisma/schema.prisma) for full schema.

- `User` — auth, roles
- `Customer` — IEC Code (unique), GST Number (unique), KYC status
- `Shipment` — central entity; onsJobNumber (unique); type IMPORT/EXPORT
- `Container` — linked to Shipment; containerNumber globally unique across active jobs
- `BoeStatus`, `Billing`, `Courier` — each has a **1-to-1** relation with Shipment
- `DoDocument`, `FilingDocument`, `ChaKycDocument` — document tracking per Shipment/Customer

## Known Pitfalls

- **Container uniqueness:** Container numbers must be unique across all _active_ shipments globally — there's a validation in `shipmentController.js` for this. Do not skip it.
- **SQLite in dev only:** The DB is a local file. For any concurrent writes in testing, results may be unexpected. Don't assume PostgreSQL-level behavior.
- **No input validation library:** Validation is manual regex/checks in controllers. Add validation at controller entry points, not in routes.
- **Rate limiting installed but not applied to auth routes** — `express-rate-limit` is a dependency; apply it before adding new public auth endpoints.
- **`resetToken` stored plaintext** — if adding password-reset flows, hash the token before storing (use `crypto`).
