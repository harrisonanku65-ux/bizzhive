# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BizzHive is a multi-vendor marketplace for Ghana where creators sell online courses, digital products, and freelance/coaching services. It's a pnpm workspace monorepo written in TypeScript.

**Stack**: Node 22+, pnpm workspaces, Express 5 (API), React + Vite + Tailwind v4 (frontend, `wouter` router, TanStack Query), PostgreSQL + Drizzle ORM, Zod (`zod/v4`) + `drizzle-zod`, Orval (API-client codegen from OpenAPI), esbuild (server bundle), shadcn/ui (Radix + Tailwind).

## Commands

```bash
pnpm install                                          # install deps (blocked unless run via the preinstall pnpm-version check)
pnpm run typecheck                                    # full typecheck: tsc --build on libs, then per-package typecheck
pnpm run build                                        # typecheck + build all packages
pnpm --filter @workspace/api-spec run codegen          # regenerate API client hooks + Zod schemas from openapi.yaml
pnpm --filter @workspace/db run push                   # push Drizzle schema to the DB (dev only; needs DATABASE_URL)
pnpm --filter @workspace/db run push-force             # same, but force (drops/alters without confirmation prompts)
pnpm --filter @workspace/api-server run dev             # build + run the API server locally
pnpm --filter @workspace/bizzhive run dev                # run the frontend Vite dev server
node scripts/create-admin.js <email> <password> "Name" # create/reset an admin account
pnpm run db:seed                                       # seed the database (@workspace/scripts)
docker compose up -d                                   # start local Postgres
```

Per-package typecheck: `pnpm --filter <name> run typecheck` (e.g. `@workspace/api-server`, `@workspace/bizzhive`, `@workspace/mockup-sandbox`, `@workspace/scripts`).

There is **no automated test suite** (no vitest/jest config, no `test` script anywhere in the workspace). QA is manual — see [`../BizzHive-Manual-Test-Guide.md`](../BizzHive-Manual-Test-Guide.md) one level up. Don't invent a `pnpm test` command.

In VS Code, `F5` (or the **Run BizzHive** compound launch config in [.vscode/launch.json](.vscode/launch.json)) runs the API server and frontend together, loading `.env` via `envFile`. See [WINDOWS_SETUP.md](WINDOWS_SETUP.md) for the full local setup walkthrough.

### After changing `lib/api-spec/openapi.yaml`

The frontend consumes **generated** hooks/schemas, so any API-shape change needs codegen before the app will typecheck:

```bash
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push      # if schema also changed
pnpm run typecheck
```

## Workspace layout

- `lib/db` — Drizzle schema (`src/schema/*.ts`) and DB client, exported as `@workspace/db` and `@workspace/db/schema`.
- `lib/api-spec` — hand-maintained `openapi.yaml`; Orval config that generates into the two packages below.
- `lib/api-client-react` — generated TanStack Query hooks (`@workspace/api-client-react`). Don't hand-edit `generated/`.
- `lib/api-zod` — generated Zod request/response schemas (`@workspace/api-zod`). Don't hand-edit `generated/`.
- `artifacts/api-server` — Express 5 API, mounted under `/api` (`src/routes/*.ts`, one file per resource).
- `artifacts/bizzhive` — the customer-facing React app (root path `/`), pages in `src/pages/*.tsx`.
- `artifacts/mockup-sandbox` — separate Vite app for UI mockups, not part of the deployed product.
- `scripts` — `@workspace/scripts`: seeding, admin creation, DB push helpers, invoked with `tsx`.

TypeScript project references wire it together (`tsconfig.json` → `lib/db`, `lib/api-client-react`, `lib/api-zod`); each app's own `tsconfig.json` references the libs it depends on. `pnpm run typecheck` = `tsc --build` on the libs first, then per-package `typecheck` scripts for `artifacts/**` and `scripts`.

`pnpm-workspace.yaml` pins `minimumReleaseAge: 1440` (packages must be published 24h before pnpm will install them) as a supply-chain defense — don't lower or remove this; add trusted scopes to `minimumReleaseAgeExclude` instead if something urgent needs installing early.

## Architecture

### Auth model — two separate session systems

Buyer/seller auth (`req.session.userId`, via `users` table) and admin auth (`req.session.adminId`, via a separate `admins` table, login at `/admin/login`) are fully independent. A buyer/seller session can never escalate to admin because there's no shared role flag — admin-ness is "does this session have `adminId` set," checked by `requireAdmin` middleware (`artifacts/api-server/src/middlewares/requireAdmin.ts`). Keep it that way when touching auth.

Session cookie config in `artifacts/api-server/src/app.ts` matters in production: `SESSION_SECRET` must not be left at its dev default (the app refuses to boot in production if it is — anyone with this value can forge sessions, including admin ones), and `SESSION_COOKIE_SAMESITE` must be `"none"` (HTTPS-only) instead of `"lax"` if the API and frontend are ever split across domains.

### Escrow and dispute flow

1. Buyer pays → order becomes `paymentStatus: paid`, `deliveryStatus: awaiting_confirmation`; funds are held.
2. Buyer either **confirms delivery** (releases payout) or **reports a problem** (`deliveryStatus: disputed`).
3. If the buyer does neither, `deliveryAutoRelease` (`artifacts/api-server/src/lib/deliveryAutoRelease.ts`) releases the payout after `DELIVERY_AUTO_RELEASE_MINUTES` (default 20160 = 14 days, matching Ghana's Electronic Transactions Act 2008 s.49 cooling-off window — an informed default, not a confirmed legal requirement). This timer is started exactly once, in `app.ts` after the app is wired — don't add a second call site.
4. Disputed orders surface in the admin console (`/admin`), where staff release funds, refund in full, or refund partially (partial refunds still pay the seller the remainder).

**All** payment providers funnel through `markOrderPaid()` in `routes/payments.ts` so escrow deadline, cart clearing, and session-slot booking can't drift apart between payment paths (Paystack, Flutterwave, demo mode). Route any new payment integration through this same function rather than duplicating its side effects.

Order `items` (jsonb) **must** include `vendorId` on every line item — `processPayoutForOrder` groups by it to decide who gets paid. Losing that field on a new order-creation path silently breaks payouts.

Without Paystack/Flutterwave keys set, the app runs in **demo mode**: orders are marked paid without money moving, and payouts/refunds are recorded as `"demo"`.

### Bookable sessions

Backs the Coaching, Consultation Calls, and Gaming Coaching categories. Vendors publish discrete slots (concrete start times, no recurrence/timezone inference). Adding a slot to a cart claims a 20-minute hold via a conditional `UPDATE` so two buyers can't pay for the same appointment; slots become `booked` only once payment succeeds.

### Plan gating

Vendor plans (Free/Pro/Premium) gate: active listing count, search placement, analytics depth, verified badge/homepage feature, and support priority. See `replit.md` for the current feature matrix — check plan-gating logic in `routes/dashboard.ts` / `routes/vendors.ts` before assuming a feature is available to all tiers.

### Design system — "Ink & Gold"

Tokens live in `artifacts/bizzhive/src/index.css`. Two golds are deliberate: `--primary` (deep gold `#8A6D0B`) is dark enough to pass WCAG contrast as text/links; `--accent` (brand gold `#C9A227`) is for fills/badges on dark surfaces, always paired with a dark foreground. `--foreground`/`--secondary` is ink `#111113`, `--background` is warm off-white `#FAF9F5`.

Status colors (amber = awaiting confirmation, green = confirmed/released, red = disputed, blue = resolved by admin) are semantic and stay as plain Tailwind classes, not brand tokens — don't fold them into the gold palette, the red/green pairing is load-bearing for scanning order state.

`.surface-ink` (dark band) and `.honeycomb` (decorative hex field, `pointer-events: none`) are reserved for hero/CTA sections (home hero, home closing CTA, Gaming Hub hero, footer) — the body of every other page stays light.

### Environment files

Local dev tooling here refuses to write any `.env*` file directly (treated as a place secrets would leak from). Keep templates as non-dot files (`env.example`), loaded via a Node script (e.g. `scripts/db-push.js`) or VS Code's `envFile` launch property — don't try to have tooling generate `.env` itself.

Uploads (course thumbnails, product files, audio previews) go through Cloudinary and fail with a 502 if `CLOUDINARY_*` env vars are unset. Transactional email goes through Resend; without `RESEND_API_KEY` it logs instead of sending.

## Currency

All prices are GHS (Ghana Cedis), displayed as `GHS` or `₵`.
