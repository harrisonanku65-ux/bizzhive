import type { Request } from "express";
import { db, ordersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Read-only session id for the current viewer — does NOT set a guest cookie
 * like cart.ts's getSessionId does, since a visitor with no session at all
 * has obviously never purchased anything and we don't need to start tracking
 * them just to answer that question.
 */
export function getViewerSessionId(req: Request): string | null {
  const userId = (req.session as any)?.userId;
  if (userId) return `user-${userId}`;
  return req.cookies?.session_id ?? null;
}

/**
 * Whether this session has a paid order containing the given course/product.
 * Used to gate the real content/download URL (lesson video, product file)
 * behind an actual purchase instead of returning it to every visitor.
 */
export async function hasPurchased(
  sessionId: string,
  itemType: "course" | "product",
  itemId: number,
): Promise<boolean> {
  const result: any = await db.execute(sql`
    SELECT 1
    FROM ${ordersTable} o, jsonb_array_elements(o.items) item
    WHERE o.session_id = ${sessionId}
      AND o.payment_status = 'paid'
      AND (item->>'itemType') = ${itemType}
      AND (item->>'itemId')::int = ${itemId}
    LIMIT 1
  `);
  return (result.rows?.length ?? 0) > 0;
}
