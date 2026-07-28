# BizzHive — Manual Test Guide

Everything below runs locally with no payment keys. Times are rough. Work through it in order — later tests depend on data created earlier.

---

## 0. Setup (once, ~10 min)

```powershell
copy env.example .env
docker compose up -d                              # Postgres on :5432
pnpm install

pnpm --filter @workspace/api-spec run codegen      # generate API hooks — REQUIRED
pnpm run db:push                                   # create tables
pnpm run db:seed                                   # create the 7 categories
pnpm run create-admin admin@bizzhive.com "Test-Admin-Pass-1!" "Test Admin"

pnpm run typecheck                                 # should pass clean
```

Then set one value in `.env` so escrow auto-release is testable in minutes rather than days:

```
DELIVERY_AUTO_RELEASE_MINUTES=5
```

Start the app — `F5` in VS Code → **Run BizzHive**, or two terminals:

```powershell
pnpm --filter @workspace/api-server run dev     # :3000
pnpm --filter @workspace/bizzhive run dev       # :5173
```

Sanity check: <http://localhost:3000/api/healthz> returns `{"status":"ok"}` and <http://localhost:3000/api/categories> returns 7 categories.

> **If codegen fails**, stop there and send me the error — nothing else will work, since the frontend imports generated hooks.

---

## 1. Accounts (~5 min)

Create two accounts in separate browser profiles (or one normal + one incognito) so you can act as buyer and seller simultaneously.

| Role | Where | Notes |
|---|---|---|
| Seller | `/signup` → "Seller" | Fill the vendor name; this creates the vendor record |
| Buyer | `/signup` → "Buyer" | Incognito window |
| Admin | `/admin/login` | The account you created above |

**Check:** the seller lands on `/dashboard` with a "Free Plan" badge and an upgrade prompt. The buyer has no Dashboard link in the nav.

---

## 2. Free-plan listing limit (~3 min)

As the **seller**:

1. Dashboard → My Products → **New Product**. Title, price `50`, type `Ebook`, any category. Create.
2. Try to create a second product.

**Expect:** the second one is rejected — Free allows 1 active listing. This proves the pricing page's limits are actually enforced, not decorative.

3. Dashboard → Availability → **New Slot**. Try to publish one.

**Expect:** also blocked, because slots count toward the same limit.

> To carry on testing without paying, bump the seller to Pro directly in the DB:
> ```sql
> UPDATE vendors SET plan = 'pro' WHERE id = 1;
> ```
> Or `plan = 'premium'` to unlock everything. Refresh the dashboard after.

---

## 3. Beats & Music: preview + licensing (~5 min)

As the **seller**, create a product with type **Beat / Audio**. An extra panel appears — attach any short `.mp3` as the preview and paste some licence text. Set a real product file too.

Visit the product page as the **buyer**.

**Expect:** an audio player rendered for the preview, a "Licensing terms" card, and *no* download button (not purchased yet). Confirm the preview plays but the full file isn't reachable.

---

## 4. Escrow happy path (~5 min)

As the **buyer**: add the product to the cart → Cart → Checkout. Enter any email, pay with Paystack.

Because no keys are configured, the app runs its demo path and marks the order paid.

Go to `/orders`.

**Expect:**
- Badge: **"Payment held in escrow"**
- A line saying it auto-releases on a given date
- Buttons: **Confirm delivery** and **Report a problem**

Click **Confirm delivery**.

**Expect:** badge flips to "Delivery confirmed — seller paid" and the buttons disappear. Check the server terminal — you'll see a payout attempt marked `demo` (no live keys, so no money moves).

Verify in SQL that the payout actually resolved a vendor — this is the bug I fixed, so it's worth confirming:

```sql
SELECT id, delivery_status, payout_status, payout_results FROM orders;
```

`payout_results` must be a **non-empty** array containing a `vendorId`. If it's `[]`, the `vendorId` fix didn't take — tell me.

---

## 5. Dispute → admin resolution (the P0 path, ~10 min)

As the **buyer**: buy something again. On `/orders`, click **Report a problem**, type at least 10 characters, submit.

**Expect:** badge becomes "Under review by BizzHive" and the action buttons are replaced by a note that the team is reviewing.

Now as the **admin** at `/admin`:

**Expect:** "Open disputes" counter is 1, "Held in escrow" shows the amount, and the dispute card shows the buyer's email, the vendor, the reason and the line items.

Test each of the three outcomes (raise a fresh dispute for each):

| Action | Expect |
|---|---|
| **Release to seller** | Order → `resolved` / `released`. Payout runs in full. |
| **Refund in full** | Order → `resolved` / `refunded_full`, `status = refunded`, `refunded_amount` = total, payout empty. |
| **Partial refund** | Enter *less* than the total. Seller is paid on the remainder — the dialog previews the split before you confirm. |

Also try entering a partial refund **equal to or above** the total.

**Expect:** blocked with a message telling you to use a full refund instead.

Then check the audit trail — every resolution must record who did it:

```sql
SELECT id, resolution, refunded_amount, resolved_by_admin_id, resolved_at, resolution_notes
FROM orders WHERE delivery_status = 'resolved';
```

Finally, confirm the admin area is actually sealed: in the **buyer's** browser (signed in as a buyer, not an admin), visit `/admin`.

**Expect:** you're told to sign in as staff — no data leaks. Also try `http://localhost:3000/api/admin/disputes` directly in that browser; expect `401`.

---

## 6. Escrow auto-release (~6 min)

Buy something and then just **leave it alone**. With `DELIVERY_AUTO_RELEASE_MINUTES=5`, the background job sweeps every 5 minutes.

Wait up to ~10 minutes, refresh `/orders`.

**Expect:** badge becomes "Auto-released after deadline" without you doing anything.

---

## 7. Bookings (~10 min)

As the **seller** (Pro or Premium): Dashboard → **Availability** → New Slot. Give it a title, a category, a time **tomorrow**, 60 min, price `100`, and a call link like `https://meet.google.com/abc-defg`.

As the **buyer**: go to `/sessions`.

**Expect:** the slot listed with date, duration, and "Call link shared after payment".

Click **Reserve slot**, then check the cart.

**Double-booking test** — the important one. Open a **third** browser (or another incognito window), go to `/sessions`, and try to reserve the *same* slot.

**Expect:** rejected with "That session slot has just been taken." Only one buyer can hold it. If both succeed, that's a bug — tell me.

Now complete checkout as the first buyer, then visit `/bookings`.

**Expect:** the booking appears under "Upcoming" **with a "Join session" button** exposing the call link.

Confirm the link is properly gated — as the *second* buyer (who didn't pay), hit:
`http://localhost:3000/api/session-slots?vendorId=1`

**Expect:** `meetingUrl` is `null` in that response.

Back on the seller dashboard → Availability, the slot now shows **booked** with "Mark delivered" and "Cancel" actions. Mark it delivered, then confirm delivery as the buyer on `/orders` to release payment.

**Hold expiry** (optional, ~20 min): reserve a slot, remove it from the cart, and confirm it becomes available to others again immediately.

---

## 8. Reviews (~7 min)

As the **buyer**, on the product page: **Write a review** → pick stars, add a comment, post.

**Expect:** it appears immediately and the product's star rating updates.

Try posting a second review on the same product from the same account.

**Expect:** rejected — "You've already reviewed this product." (One review per account per item.)

Do the same on a vendor page (`/vendors/:id` → Reviews tab).

As the **seller**: Dashboard → **Reviews**. The tab header should show a "N new" badge for unanswered reviews. Click **Respond**, post a reply.

**Expect:** the reply shows as "Seller response" on the public product/vendor page, visible to everyone.

---

## 9. Tier-gated analytics (~5 min)

Set the seller's plan in SQL and refresh Dashboard → Analytics each time.

| Plan | Expect |
|---|---|
| `free` | Lifetime totals only, plus a locked card and "Upgrade to Pro" button |
| `pro` | Revenue trend (12 months) + best-selling listings, and a locked "Advanced analytics" card |
| `premium` | Everything, plus repeat-buyer rate, average order value, escrow position, payout share |

```sql
UPDATE vendors SET plan = 'free'    WHERE id = 1;
UPDATE vendors SET plan = 'pro'     WHERE id = 1;
UPDATE vendors SET plan = 'premium' WHERE id = 1;
```

Sanity check the numbers against your own test purchases — revenue should reflect only *this* vendor's share, not other vendors' items in the same order.

---

## 10. Support priority (~5 min)

Submit the form at `/contact` three times, changing the seller's plan between each.

| Signed in as | Expect on the page | Ticket priority |
|---|---|---|
| Not signed in / buyer | No priority banner | `normal` |
| Pro seller | "Pro support" note | `standard` |
| Premium seller | "Premium priority support" banner | `priority` |

Then check `/admin` → Support tab.

**Expect:** the Premium ticket sorts to the **top** with a "Premium — priority" badge, and the tab shows a priority count. Click "Mark handled" and confirm it leaves the open queue.

Security check: priority must come from the account, not the request. Post a ticket while signed out with a forged body:

```powershell
curl -X POST http://localhost:3000/api/support/tickets -H "Content-Type: application/json" -d "{\"name\":\"X\",\"email\":\"x@x.com\",\"message\":\"trying to fake priority\",\"priority\":\"priority\"}"
```

**Expect:** the created ticket is `normal`. The `priority` field in the body is ignored.

---

## 11. Regression checks on the bugs I fixed (~4 min)

These were broken before and are easy to re-break:

1. **Footer legal links** — click "Privacy Policy" and "Refund Policy". Both must render content, not a 404.
2. **Delete Account** — user menu → Delete Account. A confirmation dialog must actually open. (Use a throwaway account if you go through with it.)
3. **Payouts populated** — re-run the SQL from step 4; `payout_results` must never be `[]` for an order with items.
4. **Single auto-release timer** — restart the API and watch the log; you should not see duplicate release activity for one order.

---

## What "passing" looks like

- No red in either terminal.
- Money is never in two places: an order is either held, released to the seller, refunded, or split — and `refunded_amount` + payout share never exceeds the order total.
- Nothing gated leaks: no `meetingUrl` before payment, no admin data without an admin session, no paid analytics on a Free plan.

If anything deviates, send me the step number plus the terminal output and I'll fix it.
