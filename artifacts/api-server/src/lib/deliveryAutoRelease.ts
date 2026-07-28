import { db, ordersTable } from "@workspace/db";
import { and, eq, lte } from "drizzle-orm";
import { processPayoutForOrder } from "../routes/payouts";

export function startDeliveryAutoRelease() {
  setInterval(async () => {
    const eligible = await db.select().from(ordersTable).where(
      and(
        eq(ordersTable.paymentStatus, "paid"),
        eq(ordersTable.deliveryStatus, "awaiting_confirmation"),
        lte(ordersTable.deliveryDeadline, new Date())
      )
    );

    for (const order of eligible) {
      await db.update(ordersTable).set({ deliveryStatus: "auto_released" }).where(eq(ordersTable.id, order.id));
      await processPayoutForOrder(order.id);
    }
  }, 5 * 60 * 1000); // checks every 5 minutes
}