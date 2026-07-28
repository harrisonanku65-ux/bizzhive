# BizzHive — Implementation Notes

All six items from the prioritized build list are implemented, in priority order. This note covers **what you must run before the app will build**, then what changed.

---

## ⚠️ Run these first

The frontend consumes **generated** React Query hooks, so the new endpoints don't exist as code until Orval regenerates them from `openapi.yaml`. Until you run step 1, `pnpm run typecheck` will fail on the new `use*` imports — that's expected, not a bug.

```bash
# 1. Regenerate API hooks + Zod schemas from the updated OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# 2. Apply the schema changes (new tables + new columns)
pnpm --filter @workspace/db run push

# 3. Create your first admin account
node scripts/create-admin.js you@bizzhive.com "a-strong-password" "Your Name"

# 4. Verify
pnpm run typecheck
```

Then sign in at **`/admin/login`**.

### Schema changes step 2 applies

New tables: `admins`, `session_slots`, `support_tickets`.
New columns: `orders` (dispute resolution + refund fields), `products` (`preview_url`, `license_terms`), `reviews` (`target_type`, `product_id`, `vendor_id`, `user_id`, `vendor_response`, `vendor_responded_at`).

One **destructive-looking** change to confirm at the prompt: `reviews.course_id` becomes nullable so products and vendors can be reviewed. Existing course reviews are backfilled implicitly — `target_type` defaults to `'course'`, which is correct for every row already in the table.

---

## What was built

### P0.1 — Admin dispute console
Admins live in a separate `admins` table with their own login and their own session key (`req.session.adminId`), so a compromised buyer/seller session can never escalate to admin. `requireAdmin` re-verifies the account is still active on every request, so revoking access is immediate.

`/admin` gives you the dispute queue, resolution with three outcomes, the support queue, and counters including total funds sitting in escrow. Every resolution records the acting admin, a timestamp and free-text notes on the order.

Resolution outcomes:
- **Release** — seller delivered; pay them in full.
- **Full refund** — refund everything; seller paid nothing.
- **Partial refund** — refund part; the seller is paid on the remainder via a `payoutRatio` passed into `processPayoutForOrder`.

Refunds go through Paystack's refund API. Note refunds are **asynchronous** — a success response means "accepted", not "settled".

### P0.1b — Buyer-side escrow controls
Disputes could be stored but never filed from the UI. The orders page now shows escrow state in plain language, the auto-release date, and **Confirm delivery** / **Report a problem** actions. Without this the admin console would have had an empty queue forever.

### P0.2 — Bookable sessions
Vendors publish **discrete slots** (concrete start times) from a new Availability tab. Buyers browse at `/sessions`, reserve, and pay through the existing checkout, so escrow applies to sessions too. `/bookings` shows what they've booked plus the call link — which is only ever revealed to the paying buyer or the owning vendor.

Adding a slot to a cart claims a 20-minute hold with a conditional `UPDATE`, so two buyers cannot pay for the same appointment; the loser gets a clear "pick another time" message. Holds expire on their own, so abandoned carts free the slot. Slots only become `booked` once payment actually succeeds.

Session slots count toward plan listing limits, consistent with courses and products.

### P1.3 — Product and vendor reviews
Reviews now target a course, product, or vendor. Sellers get a Reviews tab listing every review across their listings and profile, and can post a public response — that response is what makes the Pro plan's "review management" real rather than read-only. Signed-in accounts are limited to one review per item so a single account can't inflate a rating. Ratings are recalculated from the reviews table rather than incremented, so aggregates can't drift.

### P2.4 — Tier-gated analytics
Free sees lifetime totals with an explicit locked state and upsell. Pro adds a 12-month revenue trend and best-selling listings. Premium adds repeat-buyer rate, average order value, escrow position and payout share. Every figure is computed from paid orders by reading each order's `items` jsonb, so a vendor only ever sees their own share of a multi-vendor order.

### P3.5 — Premium support
The contact page is now a working form backed by `support_tickets`. Priority is derived **server-side** from the requester's vendor plan — never from the request body — and the admin queue sorts on it. Premium and Pro users see their support tier on the page.

### P3.6 — Beats & Music
Products support an `audio` type with a preview clip and licensing terms. Product pages render an audio player for the preview and show the licence the buyer is agreeing to. The full file still only ships after purchase.

---

## Pre-existing bugs found and fixed along the way

These were unrelated to the build list but would have caused real problems:

1. **No vendor could ever be paid** (critical). `processPayoutForOrder` groups payouts by `item.vendorId`, but `buildCart` in `cart.ts` never wrote `vendorId` into cart items — so `vendorTotals` was always empty and every payout silently produced zero transfers. Now carried through on all item types.
2. **Delete Account did nothing.** The confirmation dialog in `Navbar.tsx` was placed *after* the `return` statement — unreachable dead code. The menu item set state and nothing rendered. Moved into the returned tree.
3. **`/privacy-policy` and `/refund-policy` rendered 404.** The catch-all route was registered above them in `App.tsx`; wouter matches in order. Catch-all moved last.
4. **Auto-release ran twice.** `startDeliveryAutoRelease()` was called both at import time and after the app was created, starting two competing timers. Now called once.
5. **Payment paths could drift.** Six separate places set an order to paid with slightly different field sets. Consolidated into one `markOrderPaid()` helper, which also makes webhook redelivery idempotent.

---

## Worth knowing

- **Set `DELIVERY_AUTO_RELEASE_MINUTES`** in `.env`. It defaults to 14 days (matching Ghana's Electronic Transactions Act 2008 s.49 cooling-off window — confirm with a lawyer before relying on this for compliance); for testing, set it low.
- **Paystack refunds need live keys.** Without them the code records a `demo` refund so the flow stays testable end to end, but no money moves.
- **Vendor cancellation of a booked session doesn't auto-refund.** It marks the slot cancelled and tells the buyer to contact support, who resolves it through the admin console. Automating that is a reasonable next step.
- **Timezones**: slot times are entered in the vendor's local timezone via `datetime-local` and converted to UTC on submit. Buyers see them rendered in their own locale.
