import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Support requests raised from the Contact page.
 *
 * `priority` is derived server-side from the requester's vendor plan, never
 * from client input — Premium vendors get "priority", Pro gets "standard",
 * everyone else "normal". That is what makes the Premium plan's "Dedicated
 * support" line mean something operationally: the admin queue sorts on it.
 */
export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  requesterRole: text("requester_role").notNull().default("other"), // 'buyer' | 'seller' | 'other'

  userId: integer("user_id"),
  vendorId: integer("vendor_id"),
  vendorPlan: text("vendor_plan"),
  priority: text("priority").notNull().default("normal"), // 'priority' | 'standard' | 'normal'

  status: text("status").notNull().default("open"), // 'open' | 'closed'
  adminNotes: text("admin_notes"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTicketsTable).omit({
  id: true,
  createdAt: true,
  closedAt: true,
});
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTicketsTable.$inferSelect;
