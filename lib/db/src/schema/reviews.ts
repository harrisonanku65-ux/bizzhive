import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { productsTable } from "./products";
import { vendorsTable } from "./vendors";

/**
 * Reviews now target a course, a product, or a vendor. Exactly one of
 * courseId / productId / vendorId is set, indicated by `targetType`.
 *
 * (Previously courseId was NOT NULL, which meant products, beats, game
 * accounts and vendors could not be reviewed at all — and left the Pro-plan
 * "customer review management" feature with nothing to manage outside courses.)
 *
 * `vendorResponse` is the seller's public reply, which is what makes the
 * review *management* feature real rather than read-only.
 */
export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  userName: text("user_name").notNull(),

  targetType: text("target_type").notNull().default("course"), // 'course' | 'product' | 'vendor'
  courseId: integer("course_id").references(() => coursesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").references(() => vendorsTable.id, { onDelete: "cascade" }),

  // Set when the review was left by a signed-in account, so sellers can see
  // whether feedback came from a real account and buyers can edit their own.
  userId: integer("user_id"),

  vendorResponse: text("vendor_response"),
  vendorRespondedAt: timestamp("vendor_responded_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
