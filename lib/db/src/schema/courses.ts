import { pgTable, text, serial, boolean, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { categoriesTable } from "./categories";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("GHS"),
  level: text("level").notNull().default("beginner"),
  duration: text("duration"),
  rating: real("rating").notNull().default(0),
  reviewsCount: integer("reviews_count").notNull().default(0),
  enrollments: integer("enrollments").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  published: boolean("published").notNull().default(true),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true, rating: true, reviewsCount: true, enrollments: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
