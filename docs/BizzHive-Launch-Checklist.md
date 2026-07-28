# BizzHive — Launch Checklist

Where things stand and what's genuinely left. Ordered by what blocks launch, not by effort.

---

## 🔴 Blockers — cannot launch without these

### 1. Test what's been built
None of the escrow, dispute, booking or payout flows have been exercised yet. Work through `BizzHive-Manual-Test-Guide.md` (~65 min). Steps 4, 5 and 7 matter most — they cover money changing hands.

**Why it's first:** everything below assumes the code works. Finding a payout bug after real money is involved is a very different problem from finding it now.

### 2. Paystack merchant account
You need a live Paystack Ghana account, which requires business registration and a settlement bank account. Approval is not instant — start this early, as it's the longest lead time on the list.

Then fill in `.env`:
- `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`
- Create two subscription plans in the Paystack dashboard (GHS 80/mo, GHS 200/mo) and paste their codes into `PAYSTACK_PRO_PLAN_CODE` and `PAYSTACK_PREMIUM_PLAN_CODE` — **seller upgrades fail silently without these**
- Flutterwave keys if you want it as a second option (Paystack alone is fine to start)

### 3. Cloudinary account
Every upload — course thumbnails, product files, audio previews — goes through Cloudinary. Without `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`, uploads fail with a 502 and sellers can't list anything. The free tier is enough to start.

*(These were missing from `env.example` entirely — now added.)*

### 4. Register webhooks
In the Paystack dashboard, point the webhook at `https://your-api-domain/api/payments/paystack/webhook`. Same for Flutterwave if used, and set `FLUTTERWAVE_WEBHOOK_HASH` to match.

**Why it matters:** webhooks are the reliable path for confirming payment. Browser-side verification breaks whenever someone closes the tab mid-payment. Without webhooks you *will* get paid orders stuck as unpaid.

### 5. Hosting
Three pieces to deploy: the API server, the frontend, and Postgres.

- Set `NODE_ENV=production` — this is what turns on the `secure` cookie flag
- Generate a long random `SESSION_SECRET`. Anyone holding it can forge session cookies, **including admin sessions**
- Set `APP_URL` to your real domain so payment callbacks return to the right place
- If the API and frontend end up on different domains, session cookies need `sameSite: "none"` in `app.ts` — otherwise nobody stays logged in

### 6. Keep the escrow timer alive
`startDeliveryAutoRelease()` is a `setInterval` inside the API process. It only runs while that process is alive, so **deploy the API to a always-on host, not a serverless platform**. On serverless, held payments would never auto-release and sellers would go unpaid.

### 7. Production database setup
```
pnpm --filter @workspace/db run push
pnpm run db:seed
pnpm run create-admin you@bizzhive.com "<strong password>" "Your Name"
```
Then confirm you can reach `/admin/login` on the live site.

### 8. Point the domain
`bizzhivegh.com` currently serves the static Bootstrap site. Repoint DNS to the new app once you've smoke-tested it on a temporary URL. Keep the old files until you're confident — don't delete the `Bizzhive` folder yet.

---

## ✅ Done — no longer blockers

### ~~9. Email notifications~~ — BUILT
Seven transactional emails now fire at every state change: order receipt to the
buyer, sale alert to each seller, dispute acknowledgement, dispute alert to ops,
resolution notices to both sides, and session booking confirmations.

Built on Resend's REST API with no SDK dependency. **Works with no account** —
when `RESEND_API_KEY` is unset, messages are logged instead of sent, so you can
see exactly what would go out. To switch on: verify a domain in Resend, then set
`RESEND_API_KEY`, `MAIL_FROM` and `ADMIN_NOTIFICATION_EMAIL`.

All sends are fire-and-forget and swallow their own errors — a mail outage can
never roll back a completed payment.

### ~~10. Rate limiting~~ — BUILT
Sign-in (8 per 15 min), registration (5/hour), admin login (5 per 15 min, then a
30-minute lockout) and the support form (5/hour). Dependency-free, bucketed per
IP *and* per email, so it catches both one attacker hammering many accounts and
a distributed attack on one account.

Note: state is per-process. Behind multiple API instances the effective limit
multiplies — move it to Redis if you scale horizontally.

### ~~Missing environment variables~~ — FIXED
`env.example` was missing six variables the code reads, including all three
Cloudinary keys. Uploads would have failed in production with no explanation.

### ~~Production cookie/proxy config~~ — FIXED
`sameSite` is now configurable for split-domain deploys, `trust proxy` is set in
production so rate limiting sees real client IPs, and **the server now refuses
to boot in production if `SESSION_SECRET` is still the development default.**

---

## 🟠 Strongly recommended before real users

### 11. Legal pages
Terms, Privacy and Refund Policy pages exist but should be reviewed by someone who knows Ghanaian consumer and data protection law before you take real payments. Your refund policy in particular must match what the escrow system actually does.

### 12. Database backups
Automated daily backups with a tested restore. Most managed Postgres hosts include this — just confirm it's switched on.

---

## 🟡 Worth doing soon after

- **Vendor session cancellation doesn't auto-refund** — it flags the buyer to contact support, who resolves it manually in the admin console
- **No password reset flow** — users who forget passwords currently need you to intervene
- **No search on courses page** — only products reads `?search=`
- **No image optimisation** — Cloudinary can resize on delivery; worth using given Ghanaian mobile data costs
- **Analytics** — you have no visibility into traffic or conversion
- **Error monitoring** — Sentry or similar, so you learn about production errors before users report them

---

## Suggested order

1. Test locally (guide, ~1 hr)
2. Start the Paystack merchant application — longest lead time
3. Cloudinary account, fill in `.env`
4. Deploy to a staging URL, run the same tests against it
5. Add email notifications and rate limiting
6. Legal review
7. Repoint the domain

Realistically: a few days of your time, plus however long Paystack approval takes.

---

## What's already done

Escrow with three dispute outcomes, an admin console with an audit trail, bookable sessions with double-booking protection, plan-gated listings and analytics, reviews with seller responses, priority support routing, seller handbook, and the landing page rebuilt on your brand.

Five pre-existing bugs were also fixed along the way — most seriously, no vendor could ever actually be paid, because cart items never carried `vendorId` into the payout calculation.
