import type { Request, Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Resolves the signed-in user's own vendor account. Every route that creates,
 * edits or deletes a vendor's listings (courses, products, session slots,
 * payout settings) must use THIS vendorId rather than one supplied in the
 * request body or URL — otherwise any signed-in user could act as any vendor.
 *
 * Sends the 401/403 response itself and returns null when the caller isn't a
 * vendor; the route handler should return immediately when it gets null back.
 */
export async function requireOwnVendorId(req: Request, res: Response): Promise<number | null> {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "You must be signed in to do this" });
    return null;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.vendorId) {
    res.status(403).json({ error: "Only sellers can do this" });
    return null;
  }

  return user.vendorId;
}
