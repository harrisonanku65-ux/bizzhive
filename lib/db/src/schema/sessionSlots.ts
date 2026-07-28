import { pgTable, text, serial, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { categoriesTable } from "./categories";

/**
 * Bookable one-on-one session slots — the backing model for the Coaching &
 * Mentorship, Consultation Calls and Gaming Coaching categories.
 *
 * Deliberately modelled as *discrete published slots* rather than a recurring
 * availability pattern: the vendor publishes concrete start times, so there is
 * no recurrence expansion or timezone inference to get wrong. `startsAt` is
 * stored with timezone; the UI renders in the viewer's locale.
 *
 * A slot moves through: available -> booked -> completed (or cancelled).
 * Payment reuses the normal cart/checkout/escrow path via cart itemType
 * "session", so funds are held until the buyer confirms the session happened.
 */
export const sessionSlotsTable = pgTable("session_slots", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),

  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("GHS"),

  // How the session is delivered — a call link the vendor supplies. Only
  // revealed to the buyer once the slot is paid for.
  meetingUrl: text("meeting_url"),
  meetingNotes: text("meeting_notes"),

  status: text("status").notNull().default("available"), // 'available' | 'booked' | 'completed' | 'cancelled'
  bookedBySessionId: text("booked_by_session_id"),
  bookedAt: timestamp("booked_at", { withTimezone: true }),
  orderId: integer("order_id"),

  // Soft reservation while a slot sits in someone's cart. Without this two
  // buyers could pay for the same slot, which is exactly the kind of failure
  // the platform exists to prevent. Holds are claimed with a conditional
  // UPDATE and expire on their own, so an abandoned cart frees the slot.
  heldBySessionId: text("held_by_session_id"),
  heldUntil: timestamp("held_until", { withTimezone: true }),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSessionSlotSchema = createInsertSchema(sessionSlotsTable).omit({
  id: true,
  createdAt: true,
  bookedBySessionId: true,
  bookedAt: true,
  orderId: true,
});
export type InsertSessionSlot = z.infer<typeof insertSessionSlotSchema>;
export type SessionSlot = typeof sessionSlotsTable.$inferSelect;
