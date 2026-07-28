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
  // Payout rate is derived from `plan` (see payoutPercentageForPlan in the
  // api-server) rather than stored here, so it can never drift out of sync
  // with what a vendor's plan actually pays.
  plan: text("plan").notNull().default("free"), // 'free' | 'pro' | 'premium'
  planExpiresAt: timestamp("plan_expires_at"),
  verifiedSeller: boolean("verified_seller").notNull().default(false),
  paystackCustomerCode: text("paystack_customer_code"),
  paystackSubscriptionCode: text("paystack_subscription_code"),
  paystackEmailToken: text("paystack_email_token"),
});



export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true, rating: true, totalSales: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
