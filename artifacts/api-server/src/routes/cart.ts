import { Router, type IRouter } from "express";
import { db, cartItemsTable, coursesTable, productsTable, vendorsTable, ordersTable, sessionSlotsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { holdSlot, releaseSlotHold } from "./sessions";
import { notifyDisputeRaised } from "../lib/notifications";
import {
  GetCartResponse,
  AddToCartBody,
  AddToCartResponse,
  RemoveFromCartParams,
  RemoveFromCartResponse,
  ListOrdersResponse,
} from "@workspace/api-zod";
import { processPayoutForOrder } from "./payouts";

const router: IRouter = Router();

function getSessionId(req: any): string {
  if (req.session?.userId) {
    return `user-${req.session.userId}`;
  }
  if (!req.cookies?.session_id) {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    req.res.cookie("session_id", id, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return id;
  }
  return req.cookies.session_id;
}

async function buildCart(sessionId: string) {
  const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));

  const cartItems = [];
  let total = 0;

  for (const item of items) {
    if (item.itemType === "course") {
      const [course] = await db
        .select({
          title: coursesTable.title,
          thumbnail: coursesTable.thumbnail,
          price: coursesTable.price,
          currency: coursesTable.currency,
          vendorId: coursesTable.vendorId,
        })
        .from(coursesTable)
        .where(eq(coursesTable.id, item.itemId));

      if (course) {
        const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, course.vendorId));
        cartItems.push({
          id: item.id,
          itemType: item.itemType,
          itemId: item.itemId,
          title: course.title,
          thumbnail: course.thumbnail,
          price: course.price,
          currency: course.currency,
          // vendorId must be carried through into the order's items jsonb —
          // processPayoutForOrder groups by it to work out who to pay.
          vendorId: course.vendorId,
          vendorName: vendor?.name ?? "",
        });
        total += course.price;
      }
    } else if (item.itemType === "session") {
      const [slot] = await db
        .select({
          title: sessionSlotsTable.title,
          price: sessionSlotsTable.price,
          currency: sessionSlotsTable.currency,
          vendorId: sessionSlotsTable.vendorId,
          startsAt: sessionSlotsTable.startsAt,
          durationMinutes: sessionSlotsTable.durationMinutes,
          status: sessionSlotsTable.status,
        })
        .from(sessionSlotsTable)
        .where(eq(sessionSlotsTable.id, item.itemId));

      // Drop the line silently if someone else completed payment first — the
      // buyer sees it disappear rather than paying for a gone slot.
      if (slot && slot.status === "available") {
        const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, slot.vendorId));
        cartItems.push({
          id: item.id,
          itemType: item.itemType,
          itemId: item.itemId,
          title: slot.title,
          thumbnail: null,
          price: slot.price,
          currency: slot.currency,
          vendorId: slot.vendorId,
          vendorName: vendor?.name ?? "",
          startsAt: slot.startsAt,
          durationMinutes: slot.durationMinutes,
        });
        total += slot.price;
      } else {
        await db.delete(cartItemsTable).where(eq(cartItemsTable.id, item.id));
      }
    } else {
      const [product] = await db
        .select({
          title: productsTable.title,
          thumbnail: productsTable.thumbnail,
          price: productsTable.price,
          currency: productsTable.currency,
          vendorId: productsTable.vendorId,
        })
        .from(productsTable)
        .where(eq(productsTable.id, item.itemId));

      if (product) {
        const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, product.vendorId));
        cartItems.push({
          id: item.id,
          itemType: item.itemType,
          itemId: item.itemId,
          title: product.title,
          thumbnail: product.thumbnail,
          price: product.price,
          currency: product.currency,
          vendorId: product.vendorId,
          vendorName: vendor?.name ?? "",
        });
        total += product.price;
      }
    }
  }

  return {
    items: cartItems,
    total: Math.round(total * 100) / 100,
    currency: "GHS",
    itemCount: cartItems.length,
  };
}

router.get("/cart", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const cart = await buildCart(sessionId);
  res.json(GetCartResponse.parse(cart));
});

router.post("/cart/items", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // A session slot is a single physical appointment, so reserve it before it
  // goes in the cart. If the hold can't be claimed, someone else got there first.
  if (parsed.data.itemType === "session") {
    const held = await holdSlot(parsed.data.itemId, sessionId);
    if (!held) {
      res.status(409).json({
        error: "That session slot has just been taken. Please pick another time.",
        code: "slot_unavailable",
      });
      return;
    }
  }

  const existing = await db.select().from(cartItemsTable).where(
    and(
      eq(cartItemsTable.sessionId, sessionId),
      eq(cartItemsTable.itemType, parsed.data.itemType),
      eq(cartItemsTable.itemId, parsed.data.itemId)
    )
  );

  if (existing.length === 0) {
    await db.insert(cartItemsTable).values({
      sessionId,
      itemType: parsed.data.itemType,
      itemId: parsed.data.itemId,
    });
  }

  const cart = await buildCart(sessionId);
  res.json(AddToCartResponse.parse(cart));
});

router.delete("/cart/items/:id", async (req, res): Promise<void> => {
  const params = RemoveFromCartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const sessionId = getSessionId(req);

  // Free the reservation so another buyer can take the slot.
  const [row] = await db.select().from(cartItemsTable).where(
    and(
      eq(cartItemsTable.id, params.data.id),
      eq(cartItemsTable.sessionId, sessionId)
    )
  );
  if (row?.itemType === "session") {
    await releaseSlotHold(row.itemId, sessionId);
  }

  await db.delete(cartItemsTable).where(
    and(
      eq(cartItemsTable.id, params.data.id),
      eq(cartItemsTable.sessionId, sessionId)
    )
  );

  const cart = await buildCart(sessionId);
  res.json(RemoveFromCartResponse.parse(cart));
});

router.get("/orders", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.sessionId, sessionId));
  res.json(ListOrdersResponse.parse(orders));
});

router.post("/orders", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const cart = await buildCart(sessionId);

  if (cart.items.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const [order] = await db.insert(ordersTable).values({
    sessionId,
    items: cart.items,
    total: cart.total,
    currency: cart.currency,
    status: "completed",
  }).returning();

  await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));

  res.status(201).json(order);
});


router.post("/orders/:id/confirm-delivery", async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id);
  const sessionId = getSessionId(req);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || order.sessionId !== sessionId) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.deliveryStatus !== "awaiting_confirmation") { res.status(400).json({ error: "Order is not awaiting confirmation" }); return; }

  await db.update(ordersTable).set({ deliveryStatus: "confirmed", deliveryConfirmedAt: new Date() }).where(eq(ordersTable.id, orderId));
  const result = await processPayoutForOrder(orderId);
  res.json({ status: "confirmed", payout: result });
});

router.post("/orders/:id/report-issue", async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id);
  const sessionId = getSessionId(req);
  const { reason } = req.body;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || order.sessionId !== sessionId) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.deliveryStatus !== "awaiting_confirmation") { res.status(400).json({ error: "Order is not awaiting confirmation" }); return; }

  await db.update(ordersTable).set({
    deliveryStatus: "disputed",
    disputeReason: reason ?? null,
    disputeRaisedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, orderId));

  void notifyDisputeRaised(orderId, reason ?? "No reason given");

  res.json({ status: "disputed" });
});

export default router;
