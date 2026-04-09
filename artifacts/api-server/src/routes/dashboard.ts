import { Router, type IRouter } from "express";
import { db, coursesTable, productsTable, vendorsTable, ordersTable, categoriesTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import {
  GetDashboardStatsResponse,
  GetVendorStatsParams,
  GetVendorStatsResponse,
  GetFeaturedContentResponse,
  GetRecentActivityResponse,
  GetTopVendorsResponse,
  GetCategoryBreakdownResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [courseCount] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable);
  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
  const [vendorCount] = await db.select({ count: sql<number>`count(*)::int` }).from(vendorsTable);
  const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable);
  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(total), 0)::float` }).from(ordersTable);

  res.json(GetDashboardStatsResponse.parse({
    totalCourses: courseCount.count,
    totalProducts: productCount.count,
    totalVendors: vendorCount.count,
    totalOrders: orderCount.count,
    totalRevenue: revenue.total,
    currency: "GHS",
  }));
});

router.get("/dashboard/vendor/:vendorId/stats", async (req, res): Promise<void> => {
  const params = GetVendorStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [courseCount] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable).where(eq(coursesTable.vendorId, params.data.vendorId));
  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.vendorId, params.data.vendorId));
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, params.data.vendorId));

  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  const [enrollments] = await db.select({ total: sql<number>`coalesce(sum(enrollments), 0)::int` }).from(coursesTable).where(eq(coursesTable.vendorId, params.data.vendorId));

  res.json(GetVendorStatsResponse.parse({
    totalCourses: courseCount.count,
    totalProducts: productCount.count,
    totalSales: vendor.totalSales,
    totalRevenue: 0,
    averageRating: vendor.rating,
    totalEnrollments: enrollments.total,
    currency: "GHS",
  }));
});

router.get("/dashboard/featured", async (_req, res): Promise<void> => {
  const featuredCourses = await db
    .select({
      id: coursesTable.id,
      title: coursesTable.title,
      slug: coursesTable.slug,
      description: coursesTable.description,
      thumbnail: coursesTable.thumbnail,
      price: coursesTable.price,
      currency: coursesTable.currency,
      level: coursesTable.level,
      duration: coursesTable.duration,
      rating: coursesTable.rating,
      reviewsCount: coursesTable.reviewsCount,
      enrollments: coursesTable.enrollments,
      featured: coursesTable.featured,
      published: coursesTable.published,
      vendorId: coursesTable.vendorId,
      vendorName: vendorsTable.name,
      vendorAvatar: vendorsTable.avatar,
      categoryId: coursesTable.categoryId,
      categoryName: categoriesTable.name,
      createdAt: coursesTable.createdAt,
      lessonsCount: sql<number>`(SELECT count(*) FROM lessons WHERE lessons.course_id = ${coursesTable.id})::int`,
    })
    .from(coursesTable)
    .innerJoin(vendorsTable, eq(coursesTable.vendorId, vendorsTable.id))
    .innerJoin(categoriesTable, eq(coursesTable.categoryId, categoriesTable.id))
    .where(eq(coursesTable.featured, true))
    .limit(6);

  const featuredProducts = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      slug: productsTable.slug,
      description: productsTable.description,
      thumbnail: productsTable.thumbnail,
      price: productsTable.price,
      currency: productsTable.currency,
      productType: productsTable.productType,
      fileUrl: productsTable.fileUrl,
      rating: productsTable.rating,
      reviewsCount: productsTable.reviewsCount,
      salesCount: productsTable.salesCount,
      featured: productsTable.featured,
      published: productsTable.published,
      vendorId: productsTable.vendorId,
      vendorName: vendorsTable.name,
      vendorAvatar: vendorsTable.avatar,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.featured, true))
    .limit(6);

  const topVendors = await db
    .select({
      id: vendorsTable.id,
      name: vendorsTable.name,
      slug: vendorsTable.slug,
      bio: vendorsTable.bio,
      avatar: vendorsTable.avatar,
      location: vendorsTable.location,
      rating: vendorsTable.rating,
      totalSales: vendorsTable.totalSales,
      featured: vendorsTable.featured,
      createdAt: vendorsTable.createdAt,
      totalCourses: sql<number>`(SELECT count(*) FROM courses WHERE courses.vendor_id = ${vendorsTable.id})::int`,
      totalProducts: sql<number>`(SELECT count(*) FROM products WHERE products.vendor_id = ${vendorsTable.id})::int`,
    })
    .from(vendorsTable)
    .where(eq(vendorsTable.featured, true))
    .limit(4);

  res.json(GetFeaturedContentResponse.parse({
    featuredCourses,
    featuredProducts,
    topVendors,
  }));
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const recentCourses = await db
    .select({
      id: coursesTable.id,
      title: coursesTable.title,
      createdAt: coursesTable.createdAt,
    })
    .from(coursesTable)
    .orderBy(desc(coursesTable.createdAt))
    .limit(5);

  const recentProducts = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .orderBy(desc(productsTable.createdAt))
    .limit(5);

  const activity = [
    ...recentCourses.map((c) => ({
      id: c.id,
      type: "new_course" as const,
      title: `New course: ${c.title}`,
      description: `A new course "${c.title}" was published`,
      createdAt: c.createdAt,
    })),
    ...recentProducts.map((p) => ({
      id: p.id + 10000,
      type: "new_product" as const,
      title: `New product: ${p.title}`,
      description: `A new digital product "${p.title}" was listed`,
      createdAt: p.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  res.json(GetRecentActivityResponse.parse(activity));
});

router.get("/dashboard/top-vendors", async (_req, res): Promise<void> => {
  const vendors = await db
    .select({
      id: vendorsTable.id,
      name: vendorsTable.name,
      slug: vendorsTable.slug,
      bio: vendorsTable.bio,
      avatar: vendorsTable.avatar,
      location: vendorsTable.location,
      rating: vendorsTable.rating,
      totalSales: vendorsTable.totalSales,
      featured: vendorsTable.featured,
      createdAt: vendorsTable.createdAt,
      totalCourses: sql<number>`(SELECT count(*) FROM courses WHERE courses.vendor_id = ${vendorsTable.id})::int`,
      totalProducts: sql<number>`(SELECT count(*) FROM products WHERE products.vendor_id = ${vendorsTable.id})::int`,
    })
    .from(vendorsTable)
    .orderBy(desc(vendorsTable.rating))
    .limit(10);

  res.json(GetTopVendorsResponse.parse(vendors));
});

router.get("/dashboard/category-breakdown", async (_req, res): Promise<void> => {
  const categories = await db
    .select({
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      courseCount: sql<number>`(SELECT count(*) FROM courses WHERE courses.category_id = ${categoriesTable.id})::int`,
      productCount: sql<number>`(SELECT count(*) FROM products WHERE products.category_id = ${categoriesTable.id})::int`,
    })
    .from(categoriesTable);

  const result = categories.map((c) => ({
    ...c,
    totalItems: c.courseCount + c.productCount,
  }));

  res.json(GetCategoryBreakdownResponse.parse(result));
});

export default router;
