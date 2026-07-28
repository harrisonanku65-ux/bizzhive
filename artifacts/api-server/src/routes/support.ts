import { Router, type IRouter } from "express";
import { db, supportTicketsTable, usersTable, vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { supportRateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

/**
 * Maps a vendor plan to a support priority.
 *
 * Derived server-side from the signed-in account, never taken from the request
 * body — otherwise anyone could claim priority support. This is what backs the
 * Premium plan's "Dedicated support" promise: the admin queue sorts on it.
 */
function priorityForPlan(plan: string | null | undefined): "priority" | "standard" | "normal" {
  if (plan === "premium") return "priority";
  if (plan === "pro") return "standard";
  return "normal";
}

router.post("/support/tickets", supportRateLimit, async (req, res): Promise<void> => {
  const { name, email, subject, message, requesterRole } = req.body ?? {};

  if (!name || !email || !message) {
    res.status(400).json({ error: "name, email and message are required" });
    return;
  }
  if (String(message).trim().length < 10) {
    res.status(400).json({ error: "Please describe your issue in a little more detail" });
    return;
  }

  const userId = req.session?.userId ?? null;
  let vendorId: number | null = null;
  let vendorPlan: string | null = null;

  if (userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (user?.vendorId) {
      vendorId = user.vendorId;
      const [vendor] = await db.select({ plan: vendorsTable.plan }).from(vendorsTable).where(eq(vendorsTable.id, user.vendorId));
      vendorPlan = vendor?.plan ?? null;
    }
  }

  const priority = priorityForPlan(vendorPlan);

  const [ticket] = await db
    .insert(supportTicketsTable)
    .values({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      subject: subject ? String(subject).trim() : "General enquiry",
      message: String(message).trim(),
      requesterRole: ["buyer", "seller"].includes(requesterRole) ? requesterRole : "other",
      userId,
      vendorId,
      vendorPlan,
      priority,
    })
    .returning();

  res.status(201).json({
    id: ticket.id,
    priority: ticket.priority,
    status: ticket.status,
    // Set expectations honestly rather than promising a fixed SLA we can't keep.
    expectedResponse:
      priority === "priority"
        ? "Premium support — we aim to reply within a few hours."
        : priority === "standard"
          ? "Pro support — we aim to reply within one business day."
          : "We aim to reply within two business days.",
    createdAt: ticket.createdAt,
  });
});

/** Lets a signed-in seller see the priority band their plan gives them. */
router.get("/support/my-priority", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.json({ priority: "normal", plan: null });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.vendorId) {
    res.json({ priority: "normal", plan: null });
    return;
  }

  const [vendor] = await db.select({ plan: vendorsTable.plan }).from(vendorsTable).where(eq(vendorsTable.id, user.vendorId));
  res.json({ priority: priorityForPlan(vendor?.plan), plan: vendor?.plan ?? null });
});

export default router;
