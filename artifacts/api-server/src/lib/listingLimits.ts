import { db, coursesTable, productsTable, sessionSlotsTable } from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";

export function listingLimitForPlan(plan: string | null | undefined): number {
  return plan === "premium" ? Infinity : plan === "pro" ? 10 : 1;
}

/**
 * Active listings are counted across courses, products AND session slots
 * combined — the pricing page advertises one shared limit per plan, not one
 * limit per listing type. Each subquery keeps that listing type's existing
 * "what counts as active" rule (courses/products count every row regardless
 * of published state; slots only count published, still-available, future
 * ones, since a past or booked slot isn't taking up a publishing slot).
 */
export async function countActiveListings(vendorId: number): Promise<number> {
  const [{ count: courseCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(coursesTable)
    .where(eq(coursesTable.vendorId, vendorId));

  const [{ count: productCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.vendorId, vendorId));

  const [{ count: slotCount }] = await db
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

  return courseCount + productCount + slotCount;
}
