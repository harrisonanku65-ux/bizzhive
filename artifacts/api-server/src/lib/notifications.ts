import { db, ordersTable, usersTable, vendorsTable, sessionSlotsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { sendEmail, notifyAdmin } from "./mailer";
import { logger } from "./logger";

/**
 * Notification triggers for the points where money or delivery state changes.
 *
 * Every function here is fire-and-forget and self-contained: it looks up who
 * to tell, composes the message, and never throws. Call sites use
 * `void notifyX(...)` so a slow mail provider can't delay a payment response.
 */

const money = (n: number) => `GHS ${n.toFixed(2)}`;

/** Orders are keyed by session id; signed-in buyers use "user-<id>". */
async function buyerFor(sessionId: string) {
  const match = /^user-(\d+)$/.exec(sessionId ?? "");
  if (!match) return null;
  const [user] = await db
    .select({
      email: usersTable.email,
      firstName: usersTable.firstName,
      displayName: usersTable.displayName,
    })
    .from(usersTable)
    .where(eq(usersTable.id, Number(match[1])));
  return user ?? null;
}

function itemLines(items: any[]): string {
  return items
    .map((i) => `• ${i.title} — ${money(i.price ?? 0)}`)
    .join("\n");
}

/** Payment confirmed: receipt to the buyer, sale alert to each seller. */
export async function notifyOrderPaid(orderId: number): Promise<void> {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return;

    const items = (order.items as any[]) ?? [];
    const buyer = await buyerFor(order.sessionId);

    const deadline = order.deliveryDeadline
      ? new Date(order.deliveryDeadline).toLocaleDateString("en-GH", { dateStyle: "long" })
      : null;

    if (buyer?.email) {
      await sendEmail({
        to: buyer.email,
        subject: `Order #${order.id} confirmed`,
        body:
          `Hi ${buyer.firstName ?? buyer.displayName ?? "there"},\n\n` +
          `Thanks for your order. We've received your payment of ${money(order.total)}.\n\n` +
          `${itemLines(items)}\n\n` +
          `Your payment is being held securely. Once you've received what you paid for, ` +
          `confirm delivery from your orders page and the seller gets paid.\n\n` +
          (deadline
            ? `If you don't respond, the payment releases automatically on ${deadline}. ` +
              `If anything is wrong, report a problem before then and we'll step in.`
            : ""),
        action: { label: "View your order", path: "/orders" },
      });
    }

    // One alert per vendor, covering only their own lines of the order.
    const vendorIds = Array.from(
      new Set(items.map((i) => i.vendorId).filter(Boolean)),
    ) as number[];
    if (vendorIds.length === 0) return;

    const vendors = await db
      .select({ id: vendorsTable.id, name: vendorsTable.name, email: vendorsTable.email })
      .from(vendorsTable)
      .where(inArray(vendorsTable.id, vendorIds));

    for (const vendor of vendors) {
      if (!vendor.email) continue;
      const theirs = items.filter((i) => i.vendorId === vendor.id);
      const subtotal = theirs.reduce((s, i) => s + (i.price ?? 0), 0);

      await sendEmail({
        to: vendor.email,
        subject: `You made a sale — order #${order.id}`,
        body:
          `Hi ${vendor.name},\n\n` +
          `You've got a new order worth ${money(subtotal)}.\n\n` +
          `${itemLines(theirs)}\n\n` +
          `Deliver as soon as you can. Your payout is released once the buyer confirms ` +
          `delivery, or automatically after the holding period if they don't respond.`,
        action: { label: "Open your dashboard", path: "/dashboard" },
      });
    }
  } catch (err) {
    logger.error({ err, orderId }, "notifyOrderPaid failed");
  }
}

/** Buyer raised a dispute: acknowledge to them, alert the ops inbox. */
export async function notifyDisputeRaised(orderId: number, reason: string): Promise<void> {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return;

    const buyer = await buyerFor(order.sessionId);

    if (buyer?.email) {
      await sendEmail({
        to: buyer.email,
        subject: `We're looking into order #${order.id}`,
        body:
          `Hi ${buyer.firstName ?? "there"},\n\n` +
          `Thanks for letting us know. Your payment of ${money(order.total)} stays on hold ` +
          `while our team reviews what happened — the seller has not been paid.\n\n` +
          `What you told us:\n"${reason}"\n\n` +
          `We'll email you as soon as it's resolved.`,
        action: { label: "View your order", path: "/orders" },
      });
    }

    await notifyAdmin(
      `Dispute raised on order #${order.id}`,
      `Order #${order.id} (${money(order.total)}) is disputed.\n\n` +
        `Buyer: ${buyer?.email ?? "guest"}\nReason: ${reason}\n\n` +
        `Resolve it in the admin console.`,
    );
  } catch (err) {
    logger.error({ err, orderId }, "notifyDisputeRaised failed");
  }
}

/** Admin resolved a dispute: tell the buyer, and the sellers involved. */
export async function notifyDisputeResolved(
  orderId: number,
  resolution: string,
  refundedAmount: number,
): Promise<void> {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return;

    const buyer = await buyerFor(order.sessionId);
    const items = (order.items as any[]) ?? [];

    const outcome =
      resolution === "refunded_full"
        ? `We've refunded your full ${money(refundedAmount)}. It should reach your account within a few working days.`
        : resolution === "refunded_partial"
          ? `We've refunded ${money(refundedAmount)} to you, and released the remainder to the seller.`
          : `After reviewing, we've released the payment to the seller. If you think this is wrong, reply and tell us why.`;

    if (buyer?.email) {
      await sendEmail({
        to: buyer.email,
        subject: `Order #${order.id} — resolved`,
        body: `Hi ${buyer.firstName ?? "there"},\n\nWe've finished reviewing order #${order.id}.\n\n${outcome}`,
        action: { label: "View your order", path: "/orders" },
      });
    }

    const vendorIds = Array.from(
      new Set(items.map((i) => i.vendorId).filter(Boolean)),
    ) as number[];
    if (vendorIds.length === 0) return;

    const vendors = await db
      .select({ name: vendorsTable.name, email: vendorsTable.email })
      .from(vendorsTable)
      .where(inArray(vendorsTable.id, vendorIds));

    const sellerOutcome =
      resolution === "refunded_full"
        ? `The buyer has been refunded in full, so no payout will be made for this order.`
        : resolution === "refunded_partial"
          ? `The buyer was partially refunded. You've been paid on the remaining amount.`
          : `The dispute was resolved in your favour and your payout has been released.`;

    for (const vendor of vendors) {
      if (!vendor.email) continue;
      await sendEmail({
        to: vendor.email,
        subject: `Dispute resolved — order #${order.id}`,
        body: `Hi ${vendor.name},\n\nThe dispute on order #${order.id} has been resolved.\n\n${sellerOutcome}`,
        action: { label: "Open your dashboard", path: "/dashboard" },
      });
    }
  } catch (err) {
    logger.error({ err, orderId }, "notifyDisputeResolved failed");
  }
}

/** Session slot booked: confirm to the buyer, alert the vendor. */
export async function notifySessionBooked(orderId: number): Promise<void> {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return;

    const items = (order.items as any[]) ?? [];
    const slotIds = items.filter((i) => i.itemType === "session").map((i) => i.itemId);
    if (slotIds.length === 0) return;

    const slots = await db
      .select()
      .from(sessionSlotsTable)
      .where(inArray(sessionSlotsTable.id, slotIds));

    const buyer = await buyerFor(order.sessionId);

    for (const slot of slots) {
      const when = new Date(slot.startsAt).toLocaleString("en-GH", {
        dateStyle: "full",
        timeStyle: "short",
      });

      if (buyer?.email) {
        await sendEmail({
          to: buyer.email,
          subject: `Session booked — ${slot.title}`,
          body:
            `Hi ${buyer.firstName ?? "there"},\n\n` +
            `Your session is confirmed.\n\n` +
            `${slot.title}\n${when}\n${slot.durationMinutes} minutes\n\n` +
            (slot.meetingUrl
              ? `Join here when it's time:\n${slot.meetingUrl}`
              : `The seller hasn't shared a call link yet — it'll appear under My Bookings.`),
          action: { label: "View your bookings", path: "/bookings" },
        });
      }

      const [vendor] = await db
        .select({ name: vendorsTable.name, email: vendorsTable.email })
        .from(vendorsTable)
        .where(eq(vendorsTable.id, slot.vendorId));

      if (vendor?.email) {
        await sendEmail({
          to: vendor.email,
          subject: `New booking — ${slot.title}`,
          body:
            `Hi ${vendor.name},\n\n` +
            `Someone booked your session.\n\n${slot.title}\n${when}\n\n` +
            `Make sure your call link is set. After the session, mark it delivered ` +
            `so the buyer can confirm and release your payment.`,
          action: { label: "Open your dashboard", path: "/dashboard" },
        });
      }
    }
  } catch (err) {
    logger.error({ err, orderId }, "notifySessionBooked failed");
  }
}
