import type { Request, Response, NextFunction } from "express";
import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Guards every /admin/* route. Checks the dedicated `adminId` session key
 * (never `userId`) and re-verifies the admin still exists and is active on
 * each request, so revoking an admin takes effect immediately rather than
 * whenever their cookie happens to expire.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const adminId = req.session?.adminId;

  if (!adminId) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, adminId));

  if (!admin || !admin.active) {
    req.session?.destroy?.(() => {});
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }

  (req as any).admin = admin;
  next();
}
