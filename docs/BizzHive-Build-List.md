# BizzHive — Prioritized Build List

Gap closure between the codebase and the promises on bizzhivegh.com (pre-launch site). Ordered by risk: trust/legal exposure first, then missing core functionality, then polish.

---

## P0 — Critical (blocks safe launch)

### 1. Admin dispute-resolution console
**Why it's P0:** The entire pitch of BizzHive is "we hold your money until delivery is confirmed... if there's a dispute, our team steps in to solve it fairly." Right now a buyer *can* flag a dispute (`deliveryStatus: "disputed"`), but there is no admin interface anywhere in the app to see it, investigate it, or resolve it. A disputed order has no code path to release funds to the seller or refund the buyer — it just sits there. This is the single biggest gap between what's promised and what exists.

**Scope:**
- Admin auth (role flag on users, or a separate admin login)
- Orders queue filtered by `deliveryStatus = disputed`, showing order items, buyer/seller, dispute reason
- Actions: release payout to seller, refund buyer (Paystack refund API), manual override with audit trail
- New columns: `resolvedBy`, `resolvedAt`, `resolutionNotes` on `orders`

**Touches:** new admin route group + pages, extend `payouts.ts` with a refund path, minor schema migration.

---

### 2. Booking/scheduling for session-based services
**Why it's P0:** Three of the seven marketed categories — Coaching & Mentorship, Consultation Calls, and Gaming Coaching — are explicitly sold as "book one-on-one sessions." Today those categories just link to a vendor's profile page; there's no way to actually pick a time, book it, or pay for a session. This is a core promised feature with zero backing implementation, not a nice-to-have.

**Scope:**
- New `sessions` (or `bookings`) table: vendor availability windows, session duration/price, buyer booking, status (booked/completed/cancelled)
- Vendor-side availability management (add to Dashboard)
- Buyer-side booking flow (pick slot → pay via existing checkout → confirmation)
- Reuses existing escrow/payout logic once a session is marked "delivered" (i.e. session held)

**Touches:** new DB table(s), new API routes, new frontend booking UI, dashboard additions.

---

## P1 — High (undercuts existing paid features / trust signals)

### 3. Product and vendor reviews
**Why it matters:** Reviews currently only attach to courses (`courseId` FK). Buyers can't review a purchased template, beat, or game account, and vendors can't be reviewed directly. This quietly breaks the "Customer review management" feature that's sold as part of the Pro plan — there's nothing to manage outside of courses.

**Scope:**
- Extend reviews to support `productId` and `vendorId` (nullable FKs, or split into separate tables)
- Review submission on product-detail and vendor-detail pages
- Seller-side review visibility/response in Dashboard (this is the "management" part of the paid feature)

---

## P2 — Medium (revenue differentiation, not user-blocking)

### 4. Tier-gated analytics
**Why it matters:** Pricing promises differ by plan ("Sales analytics dashboard" on Pro vs. "Advanced analytics" on Premium), but every vendor currently sees the identical Analytics tab regardless of plan. Free-tier vendors are getting a paid feature for free, and Premium isn't getting anything extra for the higher price.

**Scope:**
- Gate current stats/activity/category-breakdown behind Pro+ (free tier gets basic totals only, or a locked/upsell state)
- Add genuinely "advanced" metrics for Premium — revenue trend over time, conversion funnel, top-performing listings

---

## P3 — Low / polish

### 5. Dedicated support differentiation (Premium)
Contact is currently identical for everyone (email/WhatsApp). Cheapest fix: a priority flag on support requests from Premium vendors, or a separate contact channel/queue.

### 6. Beats & Music-specific product handling
Music listings currently fall under the generic "asset" product type with no audio preview or licensing-terms field. Add an audio player for preview and a licensing-terms field when category = music, before this category gets real usage.

---

## Suggested sequencing

1. Admin dispute console — ship before accepting real transactions at any volume; this is a liability gap, not a feature gap.
2. Booking/sessions — needed before Coaching/Consultation/Gaming Coaching categories can honestly be marketed as live.
3. Reviews — moderate effort, meaningfully improves buyer trust and closes the Pro-plan gap.
4. Tier-gated analytics — mostly a gating/UI change on data that already exists.
5. Support differentiation + Beats/Music polish — do whenever, low risk either way.
