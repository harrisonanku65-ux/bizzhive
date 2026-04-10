import { pgTable, text, serial, boolean, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  avatar: text("avatar"),
  location: text("location"),
  rating: real("rating").notNull().default(0),
  totalSales: integer("total_sales").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  email: text("email"),
  momoNumber: text("momo_number"),
  momoNetwork: text("momo_network"),
  paystackRecipientCode: text("paystack_recipient_code"),
  payoutPercentage: real("payout_percentage").notNull().default(80),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true, rating: true, totalSales: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
