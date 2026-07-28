import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import {
  db,
  adminsTable,
  ordersTable,
  supportTicketsTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, sql, inArray, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { adminLoginRateLimit } from "../middlewares/rateLimit";
import { processPayoutForOrder, refundOrder } from "./payouts";
import { notifyDisputeResolved } from "../lib/notifications";

const router: IRouter = Router();

function buildAdmin(admin: any) {
  return { id: admin.id, email: admin.email, name: admin.name };
}

/* ------------------------------------------------------------------ *
 * Admin authentication (separate table, separate session key)
 * ------------------------------------------------------------------ */

router.post("/admin/login", adminLoginRateLimit, async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, String(email).toLowerCase()));

  // Same generic message for unknown email, wrong password and deactivated
  // account so this endpoint can't be used to enumerate admin accounts.
  if (!admin || !admin.active) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.adminId = admin.id;
  req.session.adminEmail = admin.email;
  await db.update(adminsTable).set({ lastLoginAt: new Date() }).where(eq(adminsTable.id, admin.id));

  res.json(buildAdmin(admin));
});

router.get("/admin/me", requireAdmin, async (req, res): Promise<void> => {
  res.json(buildAdmin((req as any).admin));
});

router.post("/admin/logout", (req, res): void => {
  req.session?.destroy?.(() => {});
  res.json({ success: true });
});

/* ------------------------------------------------------------------ *
 * Dispute queue
 * ------------------------------------------------------------------ */

/**
 * Enriches a raw order row for the admin console: who bought it, which
 * vendors are owed, and how much is still refundable.
 */
async function buildAdminOrder(order: any) {
  const items = (order.items as any[]) ?? [];

  const vendorNames = Array.from(
    new Set(items.map((i) => i.vendorName).filter(Boolean)),
  ) as string[];

  // Orders are keyed by session id; logged-in buyers use "user-<id>".
  let buyerEmail: string | null = null;
  let buyerName: string | null = null;
  const match = /^user-(\d+)$/.exec(order.sessionId ?? "");
  if (match) {
    const [user] = await db
      .select({ email: usersTable.email, displayName: usersTable.displayName })
      .from(usersTable)
      .where(eq(usersTable.id, Number(match[1])));
    buyerEmail = user?.email ?? null;
    buyerName = user?.displayName ?? null;
  }

  return {
    id: order.id,
    total: order.total,
    currency: order.currency,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentProvider: order.paymentProvider,
    paymentReference: order.paymentReference,
    deliveryStatus: order.deliveryStatus,
    disputeReason: order.disputeReason,
    disputeRaisedAt: order.disputeRaisedAt,
    payoutStatus: order.payoutStatus,
    refundedAmount: order.refundedAmount,
    refundableAmount: Math.round((order.total - order.refundedAmount) * 100) / 100,
    resolution: order.resolution,
    resolutionNotes: order.resolutionNotes,
    resolvedAt: order.resolvedAt,
    buyerEmail,
    buyerName,
    vendorNames,
    items: items.map((i) => ({
      title: i.title,
      price: i.price,
      itemType: i.itemType,
      vendorName: i.vendorName ?? null,
    })),
    createdAt: order.createdAt,
  };
}

router.get("/admin/disputes", requireAdmin, async (req, res): Promise<void> => {
  const status = String(req.query.status ?? "open");

  // "open" is the working queue; "resolved" is the audit trail.
  const statuses =
    status === "resolved" ? ["resolved"] : status === "all" ? ["disputed", "resolved"] : ["disputed"];

  const orders = await db
    .select()
    .from(ordersTable)
    .where(inArray(ordersTable.deliveryStatus, statuses))
    .orderBy(desc(ordersTable.disputeRaisedAt), desc(ordersTable.createdAt));

  const enriched = await Promise.all(orders.map(buildAdminOrder));
  res.json(enriched);
});

router.get("/admin/disputes/:id", requireAdmin, async (req, res): Promise<void> => {
  // Passing `requireAdmin` alongside this handler makes TS widen req.params
  // to allow string[] (a path-to-regexp wildcard shape); :id here is always
  // a single path segment, so it's always a plain string at runtime.
  const orderId = parseInt(req.params.id as string);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(await buildAdminOrder(order));
});

/**
 * Resolves a disputed order. Three outcomes:
 *
 *  - released         seller was right; pay them in full
 *  - refunded_full    buyer was right; refund everything, no payout
 *  - refunded_partial split; refund `amount` and pay the seller on the remainder
 *
 * Every outcome is written to the order with the acting admin and a timestamp
 * so the decision is auditable later.
 */
router.post("/admin/disputes/:id/resolve", requireAdmin, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const { resolution, amount, notes } = req.body ?? {};
  const admin = (req as any).admin;

  const allowed = ["released", "refunded_full", "refunded_partial"];
  if (!allowed.includes(resolution)) {
    res.status(400).json({ error: `resolution must be one of: ${allowed.join(", ")}` });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.deliveryStatus !== "disputed") {
    res.status(400).json({ error: "Order is not under dispute" });
    return;
  }
  if (order.paymentStatus !== "paid") {
    res.status(400).json({ error: "Order was never paid" });
    return;
  }

  const refundable = Math.round((order.total - order.refundedAmount) * 100) / 100;
  let refundAmount = 0;

  if (resolution === "refunded_full") {
    refundAmount = refundable;
  } else if (resolution === "refunded_partial") {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      res.status(400).json({ error: "A positive refund amount is required for a partial refund" });
      return;
    }
    if (parsed >= refundable) {
      res.status(400).json({
        error: `Partial refund must be less than the refundable total (GHS ${refundable.toFixed(2)}). Use refunded_full instead.`,
      });
      return;
    }
    refundAmount = Math.round(parsed * 100) / 100;
  }

  let refundResult: any = null;
  if (refundAmount > 0) {
    refundResult = await refundOrder(orderId, refundAmount);
    if (refundResult.status === "failed") {
      res.status(502).json({ error: "Refund could not be processed", detail: refundResult });
      return;
    }
  }

  // Seller is paid on whatever the buyer did not get refunded.
  const payoutRatio = order.total > 0 ? (order.total - order.refundedAmount - refundAmount) / order.total : 0;
  const payoutResult = await processPayoutForOrder(orderId, Math.max(0, payoutRatio));

  await db.update(ordersTable).set({
    deliveryStatus: "resolved",
    resolution,
    resolutionNotes: notes ?? null,
    resolvedByAdminId: admin.id,
    resolvedAt: new Date(),
    refundedAmount: Math.round((order.refundedAmount + refundAmount) * 100) / 100,
    refundReference: refundResult?.reference ?? order.refundReference ?? null,
    status: resolution === "refunded_full" ? "refunded" : order.status,
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, orderId));

  void notifyDisputeResolved(orderId, resolution, refundAmount);

  res.json({
    orderId,
    resolution,
    refundedAmount: refundAmount,
    refund: refundResult,
    payout: payoutResult,
    resolvedBy: admin.email,
  });
});

/* ------------------------------------------------------------------ *
 * Support queue (Premium vendors surface first)
 * ------------------------------------------------------------------ */

router.get("/admin/support-tickets", requireAdmin, async (req, res): Promise<void> => {
  const status = String(req.query.status ?? "open");
  const rows = await db
    .select()
    .from(supportTicketsTable)
    .where(status === "all" ? sql`true` : eq(supportTicketsTable.status, status))
    .orderBy(
      // priority > standard > normal, then oldest first within a band
      desc(sql`CASE WHEN ${supportTicketsTable.priority} = 'priority' THEN 2 WHEN ${supportTicketsTable.priority} = 'standard' THEN 1 ELSE 0 END`),
      supportTicketsTable.createdAt,
    );
  res.json(rows);
});

router.post("/admin/support-tickets/:id/close", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { adminNotes } = req.body ?? {};

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  await db.update(supportTicketsTable).set({
    status: "closed",
    adminNotes: adminNotes ?? ticket.adminNotes,
    closedAt: new Date(),
  }).where(eq(supportTicketsTable.id, id));

  res.json({ id, status: "closed" });
});

/* ------------------------------------------------------------------ *
 * Queue counters for the console header
 * ------------------------------------------------------------------ */

router.get("/admin/overview", requireAdmin, async (_req, res): Promise<void> => {
  const [{ count: openDisputes }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(eq(ordersTable.deliveryStatus, "disputed"));

  const [{ count: awaitingConfirmation }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(and(eq(ordersTable.deliveryStatus, "awaiting_confirmation"), eq(ordersTable.paymentStatus, "paid")));

  const [{ count: openTickets }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.status, "open"));

  const [{ count: priorityTickets }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportTicketsTable)
    .where(and(eq(supportTicketsTable.status, "open"), eq(supportTicketsTable.priority, "priority")));

  const [heldRow] = await db
    .select({ held: sql<number>`coalesce(sum(${ordersTable.total}), 0)::float` })
    .from(ordersTable)
    .where(and(eq(ordersTable.paymentStatus, "paid"), eq(ordersTable.payoutStatus, "pending")));

  res.json({
    openDisputes,
    awaitingConfirmation,
    openTickets,
    priorityTickets,
    fundsHeldInEscrow: Math.round((heldRow?.held ?? 0) * 100) / 100,
  });
});

export default router;
