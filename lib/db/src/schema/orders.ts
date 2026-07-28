import { pgTable, text, serial, real, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  items: jsonb("items").notNull(),
  total: real("total").notNull(),
  currency: text("currency").notNull().default("GHS"),
  status: text("status").notNull().default("pending"),
  paymentReference: text("payment_reference"),
  paymentProvider: text("payment_provider"),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  payoutStatus: text("payout_status").notNull().default("pending"), // 'pending' | 'processed'
  payoutResults: jsonb("payout_results"),
  payoutProcessedAt: timestamp("payout_processed_at", { withTimezone: true }),
  deliveryStatus: text("delivery_status").notNull().default("awaiting_confirmation"), // 'awaiting_confirmation' | 'confirmed' | 'disputed' | 'auto_released' | 'resolved'
  deliveryConfirmedAt: timestamp("delivery_confirmed_at", { withTimezone: true }),
  deliveryDeadline: timestamp("delivery_deadline", { withTimezone: true }),
  disputeReason: text("dispute_reason"),

  // --- Dispute resolution (admin console) ---
  // Set when an admin resolves a disputed order. `resolution` records which
  // action was taken so the outcome is auditable after the fact.
  disputeRaisedAt: timestamp("dispute_raised_at", { withTimezone: true }),
  resolution: text("resolution"), // 'released' | 'refunded_full' | 'refunded_partial'
  resolutionNotes: text("resolution_notes"),
  resolvedByAdminId: integer("resolved_by_admin_id"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  refundedAmount: real("refunded_amount").notNull().default(0),
  refundReference: text("refund_reference"),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
