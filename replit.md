# BizzHive - Multi-Vendor Marketplace for Ghana

## Overview

BizzHive is a multi-vendor marketplace for Ghana where creators can sell online courses, digital products, and offer freelance services. Built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS v4
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **UI Components**: shadcn/ui (Radix + Tailwind)
- **Router**: wouter
- **State**: TanStack React Query

## Architecture

### Frontend (artifacts/bizzhive)
- React + Vite web app at root path `/`
- Pages: Home, Courses, Course Detail, Products, Product Detail, Vendors, Vendor Detail, Sessions, Bookings, Cart, Orders, Dashboard, Gaming Hub, Contact, Admin, Admin Login
- Uses generated React Query hooks from `@workspace/api-client-react`
- Fonts: Plus Jakarta Sans (body), Space Grotesk (headings)

### Design system — "Ink & Gold"

Derived from the BizzHive brand mark (black disc, gold ring, honeycomb). The
previous docs described an orange/green palette and the code was actually blue —
neither matched the logo. Tokens live in `artifacts/bizzhive/src/index.css`.

| Token | Light | Role |
|---|---|---|
| `--foreground` / `--secondary` | ink `#111113` | Text, dark surfaces |
| `--primary` | deep gold `#8A6D0B` | Links, prices, primary buttons — dark enough to pass contrast as text |
| `--accent` | brand gold `#C9A227` | Fills, badges, highlights on dark. Always with dark foreground |
| `--background` | warm off-white `#FAF9F5` | Page canvas |

Two golds is deliberate: bright gold fails WCAG contrast as body text on white,
so `primary` is the darker bronze and `accent` is the brand gold used for fills.

**Status colours are semantic and stay as Tailwind classes**, not brand tokens:

| State | Colour |
|---|---|
| Awaiting confirmation (funds held) | amber |
| Confirmed / auto-released | green |
| Disputed | red |
| Resolved by admin | blue |

Green and blue are not interchangeable here — losing the red/green pairing would
make "confirmed" and "under review" read the same.

**Utilities**: `.surface-ink` (dark band, sets its own foreground) and
`.honeycomb` (faint hexagon field, decorative, `pointer-events: none`). Used on
the home hero, home closing CTA, Gaming Hub hero and the footer. Dark treatment
is deliberately reserved for those — the body of every page stays light.

### Backend (artifacts/api-server)
- Express 5 API server at `/api` path
- Routes: categories, vendors, courses, lessons, products, reviews, cart, orders, sessions, support, dashboard, payments, payouts, admin
- Session-based cart using cookies
- Structured logging with pino

### Escrow and dispute flow
1. Buyer pays → order is `paymentStatus: paid`, `deliveryStatus: awaiting_confirmation`, funds held.
2. Buyer either **confirms delivery** (payout released) or **reports a problem** (`deliveryStatus: disputed`).
3. If the buyer does neither, `deliveryAutoRelease` releases the payout after `DELIVERY_AUTO_RELEASE_MINUTES` (default 14 days — matches the consumer cooling-off window in Ghana's Electronic Transactions Act, 2008 s.49; confirm with a lawyer before relying on this for compliance).
4. Disputed orders appear in the **admin console** where staff release funds, refund in full, or refund partially. Partial refunds pay the seller on the remainder.

All payment providers funnel through `markOrderPaid()` in `routes/payments.ts` so the escrow deadline, cart clearing and session-slot booking can't drift apart between paths.

### Admin console
- Admins live in their own `admins` table with a separate login (`/admin/login`) and a separate session key (`req.session.adminId`), so a buyer/seller session can never escalate to admin.
- Seed an admin: `node scripts/create-admin.js <email> <password> "Name"`
- `/admin` provides the dispute queue, resolution actions with audit trail, and the support queue (Premium vendors sorted first).

### Bookable sessions
Backs the Coaching, Consultation Calls and Gaming Coaching categories. Vendors publish **discrete slots** (concrete start times) — no recurrence or timezone inference. Adding a slot to a cart claims a 20-minute hold via a conditional UPDATE, so two buyers can't pay for the same appointment. Slots become `booked` only once payment succeeds.

### Plan gating
| Feature | Free | Pro | Premium |
|---|---|---|---|
| Active listings (courses + products + slots) | 1 | 10 | Unlimited |
| Payout rate (platform commission) | 80% (20%) | 85% (15%) | 90% (10%) |
| Search placement | standard | boosted | top |
| Analytics | lifetime totals only | + revenue trend, top listings | + repeat-buyer rate, AOV, escrow position |
| Verified badge / homepage feature | — | — | yes |
| Support priority | normal | standard | priority |

Payout rate is computed from `plan` via `payoutPercentageForPlan()` (`artifacts/api-server/src/lib/commission.ts`) at the moment of each payout — it isn't stored per-vendor, so it can never drift out of sync with a vendor's actual plan. Change the rates in that one function.

### Database Schema (lib/db)
- **categories**: name, slug, description, icon
- **vendors**: name, slug, bio, avatar, location, rating, totalSales, featured, plan, planExpiresAt, verifiedSeller, momo fields (payout rate is derived from `plan`, not stored)
- **courses**: title, slug, description, thumbnail, price, currency, level, duration, featured, published, vendorId, categoryId
- **lessons**: title, description, duration, sortOrder, isFree, courseId
- **products**: title, slug, description, thumbnail, price, currency, productType, fileUrl, previewUrl, licenseTerms, featured, published, vendorId, categoryId
- **reviews**: rating, comment, userName, targetType (`course` | `product` | `vendor`), courseId, productId, vendorId, userId, vendorResponse, vendorRespondedAt
- **cart_items**: sessionId, itemType (`course` | `product` | `session`), itemId
- **orders**: sessionId, items (jsonb), total, currency, status, payment/payout fields, deliveryStatus, deliveryDeadline, disputeReason, resolution, resolutionNotes, resolvedByAdminId, refundedAmount
- **users**: email, passwordHash, names, role, vendorId, phone
- **admins**: email, passwordHash, name, active, lastLoginAt
- **session_slots**: vendorId, categoryId, title, startsAt, durationMinutes, price, meetingUrl, status, hold fields, orderId
- **support_tickets**: name, email, subject, message, requesterRole, vendorPlan, priority, status

Note: order `items` jsonb **must** include `vendorId` on each line — `processPayoutForOrder` groups by it to decide who gets paid.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/bizzhive run dev` — run frontend dev server
- `node scripts/create-admin.js <email> <password> "Name"` — create/reset an admin account

## After pulling schema or API changes

The frontend consumes **generated** hooks, so any change to `lib/api-spec/openapi.yaml` needs codegen before the app will typecheck:

```
pnpm --filter @workspace/api-spec run codegen   # regenerate hooks + Zod schemas
pnpm --filter @workspace/db run push            # apply schema changes
pnpm run typecheck                              # verify
```

## Currency

All prices are in GHS (Ghana Cedis). The currency symbol is GHS or ₵.

## Windows / Visual Studio Code setup

The project now runs on Windows with VS Code.

1. Install prerequisites: Node.js 22+, pnpm 9+, Git, and Docker Desktop (for PostgreSQL).
2. Copy `env.example` to a `.env` file in the repo root and adjust any values.
3. Start Postgres: `docker compose up -d`
4. Install dependencies: `pnpm install`
5. Push the database schema: `pnpm --filter @workspace/db run push` (with `DATABASE_URL` exported, or use the VS Code task).
6. Open VS Code and press `F5` (or run the **Run BizzHive** compound launch configuration). This starts the API server and the web frontend together.

See `WINDOWS_SETUP.md` for a detailed walkthrough, including setting environment variables on Windows without a shell.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
