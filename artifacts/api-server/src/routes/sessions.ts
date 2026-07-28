import { Router, type IRouter } from "express";
import {
  db,
  sessionSlotsTable,
  vendorsTable,
  categoriesTable,
  ordersTable,
} from "@workspace/db";
import { and, asc, desc, eq, gt, gte, isNull, lt, or, sql } from "drizzle-orm";

const router: IRouter = Router();

/** How long a slot stays reserved once it's added to a cart. */
export const SLOT_HOLD_MINUTES = 20;

function getSessionId(req: any): string {
  if (req.session?.userId) return `user-${req.session.userId}`;
  if (!req.cookies?.session_id) {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    req.res.cookie("session_id", id, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return id;
  }
  return req.cookies.session_id;
}

/**
 * A slot is takeable if it's available and either unheld, past its hold, or
 * already held by this same visitor.
 */
function claimableBy(sessionId: string) {
  return and(
    eq(sessionSlotsTable.status, "available"),
    or(
      isNull(sessionSlotsTable.heldUntil),
      lt(sessionSlotsTable.heldUntil, new Date()),
      eq(sessionSlotsTable.heldBySessionId, sessionId),
    ),
  );
}

/**
 * Attempts to reserve a slot for this visitor. The conditional UPDATE means
 * two simultaneous requests can't both succeed — whoever loses gets 0 rows
 * back and is told the slot is gone.
 */
export async function holdSlot(slotId: number, sessionId: string) {
  const held = await db
    .update(sessionSlotsTable)
    .set({
      heldBySessionId: sessionId,
      heldUntil: new Date(Date.now() + SLOT_HOLD_MINUTES * 60 * 1000),
    })
    .where(and(eq(sessionSlotsTable.id, slotId), claimableBy(sessionId)))
    .returning();

  return held.length > 0 ? held[0] : null;
}

export async function releaseSlotHold(slotId: number, sessionId: string) {
  await db
    .update(sessionSlotsTable)
    .set({ heldBySessionId: null, heldUntil: null })
    .where(
      and(
        eq(sessionSlotsTable.id, slotId),
        eq(sessionSlotsTable.heldBySessionId, sessionId),
        eq(sessionSlotsTable.status, "available"),
      ),
    );
}

/**
 * Called once an order is paid: flips every session slot in the order from
 * held to properly booked. Runs after payment so an unpaid cart never
 * permanently consumes a slot.
 */
export async function confirmSlotBookingsForOrder(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return;

  const items = (order.items as any[]) ?? [];
  const slotIds = items.filter((i) => i.itemType === "session").map((i) => i.itemId);

  for (const slotId of slotIds) {
    await db
      .update(sessionSlotsTable)
      .set({
        status: "booked",
        bookedBySessionId: order.sessionId,
        bookedAt: new Date(),
        orderId: order.id,
        heldBySessionId: null,
        heldUntil: null,
      })
      .where(and(eq(sessionSlotsTable.id, slotId), eq(sessionSlotsTable.status, "available")));
  }
}

function shapeSlot(row: any, opts: { includePrivate?: boolean } = {}) {
  return {
    id: row.id,
    vendorId: row.vendorId,
    vendorName: row.vendorName ?? undefined,
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? undefined,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt,
    durationMinutes: row.durationMinutes,
    price: row.price,
    currency: row.currency,
    status: row.status,
    published: row.published,
    // The call link is the deliverable — only the buyer (or the vendor who
    // owns the slot) should ever see it.
    meetingUrl: opts.includePrivate ? (row.meetingUrl ?? null) : null,
    meetingNotes: opts.includePrivate ? (row.meetingNotes ?? null) : null,
    createdAt: row.createdAt,
  };
}

/* ------------------------------------------------------------------ *
 * Public browsing
 * ------------------------------------------------------------------ */

/** Upcoming bookable slots, optionally narrowed to one vendor or category. */
router.get("/session-slots", async (req, res): Promise<void> => {
  const vendorId = req.query.vendorId ? parseInt(String(req.query.vendorId)) : null;
  const categoryId = req.query.categoryId ? parseInt(String(req.query.categoryId)) : null;

  const filters = [
    eq(sessionSlotsTable.published, true),
    eq(sessionSlotsTable.status, "available"),
    // Never advertise a slot that has already started.
    gt(sessionSlotsTable.startsAt, new Date()),
  ];
  if (vendorId) filters.push(eq(sessionSlotsTable.vendorId, vendorId));
  if (categoryId) filters.push(eq(sessionSlotsTable.categoryId, categoryId));

  const rows = await db
    .select({
      id: sessionSlotsTable.id,
      vendorId: sessionSlotsTable.vendorId,
      vendorName: vendorsTable.name,
      categoryId: sessionSlotsTable.categoryId,
      categoryName: categoriesTable.name,
      title: sessionSlotsTable.title,
      description: sessionSlotsTable.description,
      startsAt: sessionSlotsTable.startsAt,
      durationMinutes: sessionSlotsTable.durationMinutes,
      price: sessionSlotsTable.price,
      currency: sessionSlotsTable.currency,
      status: sessionSlotsTable.status,
      published: sessionSlotsTable.published,
      createdAt: sessionSlotsTable.createdAt,
    })
    .from(sessionSlotsTable)
    .innerJoin(vendorsTable, eq(sessionSlotsTable.vendorId, vendorsTable.id))
    .innerJoin(categoriesTable, eq(sessionSlotsTable.categoryId, categoriesTable.id))
    .where(and(...filters))
    .orderBy(asc(sessionSlotsTable.startsAt));

  res.json(rows.map((r) => shapeSlot(r)));
});

/* ------------------------------------------------------------------ *
 * Vendor availability management
 * ------------------------------------------------------------------ */

/** Everything the vendor has published, including booked and past slots. */
router.get("/vendors/:vendorId/session-slots", async (req, res): Promise<void> => {
  const vendorId = parseInt(req.params.vendorId);
  const isOwner = req.session?.userId != null;

  const rows = await db
    .select({
      id: sessionSlotsTable.id,
      vendorId: sessionSlotsTable.vendorId,
      categoryId: sessionSlotsTable.categoryId,
      categoryName: categoriesTable.name,
      title: sessionSlotsTable.title,
      description: sessionSlotsTable.description,
      startsAt: sessionSlotsTable.startsAt,
      durationMinutes: sessionSlotsTable.durationMinutes,
      price: sessionSlotsTable.price,
      currency: sessionSlotsTable.currency,
      status: sessionSlotsTable.status,
      published: sessionSlotsTable.published,
      meetingUrl: sessionSlotsTable.meetingUrl,
      meetingNotes: sessionSlotsTable.meetingNotes,
      createdAt: sessionSlotsTable.createdAt,
    })
    .from(sessionSlotsTable)
    .innerJoin(categoriesTable, eq(sessionSlotsTable.categoryId, categoriesTable.id))
    .where(eq(sessionSlotsTable.vendorId, vendorId))
    .orderBy(desc(sessionSlotsTable.startsAt));

  res.json(rows.map((r) => shapeSlot(r, { includePrivate: isOwner })));
});

router.post("/session-slots", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "You must be signed in to publish availability" });
    return;
  }

  const {
    vendorId,
    categoryId,
    title,
    description,
    startsAt,
    durationMinutes,
    price,
    meetingUrl,
    meetingNotes,
  } = req.body ?? {};

  if (!vendorId || !categoryId || !title || !startsAt || price == null) {
    res.status(400).json({ error: "vendorId, categoryId, title, startsAt and price are required" });
    return;
  }

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    res.status(400).json({ error: "startsAt must be a valid date-time" });
    return;
  }
  if (start.getTime() < Date.now()) {
    res.status(400).json({ error: "Session start time must be in the future" });
    return;
  }
  if (Number(price) < 0) {
    res.status(400).json({ error: "Price cannot be negative" });
    return;
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  // Bookable slots count as active listings, same as courses and products, so
  // the plan limits advertised on the pricing page hold across all listing types.
  const limit = vendor.plan === "premium" ? Infinity : vendor.plan === "pro" ? 10 : 1;
  const [{ count: activeSlots }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionSlotsTable)
    .where(
      and(
        eq(sessionSlotsTable.vendorId, vendorId),
        eq(sessionSlotsTable.published, true),
        eq(sessionSlotsTable.status, "available"),
        gte(sessionSlotsTable.startsAt, new Date()),
      ),
    );

  if (activeSlots >= limit) {
    res.status(403).json({
      error: `Your ${vendor.plan} plan allows ${limit === Infinity ? "unlimited" : limit} active listing${limit === 1 ? "" : "s"}. Upgrade your plan to publish more session slots.`,
      code: "listing_limit_reached",
    });
    return;
  }

  const [slot] = await db
    .insert(sessionSlotsTable)
    .values({
      vendorId,
      categoryId,
      title,
      description: description ?? null,
      startsAt: start,
      durationMinutes: durationMinutes ?? 60,
      price: Number(price),
      meetingUrl: meetingUrl ?? null,
      meetingNotes: meetingNotes ?? null,
    })
    .returning();

  res.status(201).json(shapeSlot(slot, { includePrivate: true }));
});

router.put("/session-slots/:id", async (req, res): Promise<void> => {
  const slotId = parseInt(req.params.id);
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [slot] = await db.select().from(sessionSlotsTable).where(eq(sessionSlotsTable.id, slotId));
  if (!slot) {
    res.status(404).json({ error: "Session slot not found" });
    return;
  }
  if (slot.status === "booked") {
    res.status(400).json({ error: "A booked session can't be edited. Cancel it instead." });
    return;
  }

  const { title, description, startsAt, durationMinutes, price, meetingUrl, meetingNotes, published } = req.body ?? {};

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
  if (price !== undefined) updates.price = Number(price);
  if (meetingUrl !== undefined) updates.meetingUrl = meetingUrl;
  if (meetingNotes !== undefined) updates.meetingNotes = meetingNotes;
  if (published !== undefined) updates.published = published;

  if (startsAt !== undefined) {
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) {
      res.status(400).json({ error: "startsAt must be a valid future date-time" });
      return;
    }
    updates.startsAt = start;
  }

  const [updated] = await db
    .update(sessionSlotsTable)
    .set(updates)
    .where(eq(sessionSlotsTable.id, slotId))
    .returning();

  res.json(shapeSlot(updated, { includePrivate: true }));
});

router.delete("/session-slots/:id", async (req, res): Promise<void> => {
  const slotId = parseInt(req.params.id);
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [slot] = await db.select().from(sessionSlotsTable).where(eq(sessionSlotsTable.id, slotId));
  if (!slot) {
    res.status(404).json({ error: "Session slot not found" });
    return;
  }
  if (slot.status === "booked") {
    res.status(400).json({ error: "A booked session can't be deleted. Cancel it instead." });
    return;
  }

  await db.delete(sessionSlotsTable).where(eq(sessionSlotsTable.id, slotId));
  res.json({ id: slotId, deleted: true });
});

/** Vendor cancels a booked session; the buyer is refunded by support. */
router.post("/session-slots/:id/cancel", async (req, res): Promise<void> => {
  const slotId = parseInt(req.params.id);
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [slot] = await db.select().from(sessionSlotsTable).where(eq(sessionSlotsTable.id, slotId));
  if (!slot) {
    res.status(404).json({ error: "Session slot not found" });
    return;
  }

  await db
    .update(sessionSlotsTable)
    .set({ status: "cancelled", published: false })
    .where(eq(sessionSlotsTable.id, slotId));

  res.json({ id: slotId, status: "cancelled" });
});

/** Vendor marks a session as delivered. The buyer still confirms to release funds. */
router.post("/session-slots/:id/complete", async (req, res): Promise<void> => {
  const slotId = parseInt(req.params.id);
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [slot] = await db.select().from(sessionSlotsTable).where(eq(sessionSlotsTable.id, slotId));
  if (!slot) {
    res.status(404).json({ error: "Session slot not found" });
    return;
  }
  if (slot.status !== "booked") {
    res.status(400).json({ error: "Only a booked session can be marked complete" });
    return;
  }

  await db.update(sessionSlotsTable).set({ status: "completed" }).where(eq(sessionSlotsTable.id, slotId));
  res.json({ id: slotId, status: "completed" });
});

/* ------------------------------------------------------------------ *
 * Buyer's bookings
 * ------------------------------------------------------------------ */

router.get("/my-bookings", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);

  const rows = await db
    .select({
      id: sessionSlotsTable.id,
      vendorId: sessionSlotsTable.vendorId,
      vendorName: vendorsTable.name,
      categoryId: sessionSlotsTable.categoryId,
      categoryName: categoriesTable.name,
      title: sessionSlotsTable.title,
      description: sessionSlotsTable.description,
      startsAt: sessionSlotsTable.startsAt,
      durationMinutes: sessionSlotsTable.durationMinutes,
      price: sessionSlotsTable.price,
      currency: sessionSlotsTable.currency,
      status: sessionSlotsTable.status,
      published: sessionSlotsTable.published,
      meetingUrl: sessionSlotsTable.meetingUrl,
      meetingNotes: sessionSlotsTable.meetingNotes,
      createdAt: sessionSlotsTable.createdAt,
    })
    .from(sessionSlotsTable)
    .innerJoin(vendorsTable, eq(sessionSlotsTable.vendorId, vendorsTable.id))
    .innerJoin(categoriesTable, eq(sessionSlotsTable.categoryId, categoriesTable.id))
    .where(eq(sessionSlotsTable.bookedBySessionId, sessionId))
    .orderBy(asc(sessionSlotsTable.startsAt));

  // Buyer paid for it, so they get the meeting link.
  res.json(rows.map((r) => shapeSlot(r, { includePrivate: true })));
});

export default router;
