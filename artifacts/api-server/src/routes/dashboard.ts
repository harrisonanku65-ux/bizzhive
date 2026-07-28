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

/**
 * Vendor analytics, gated by plan.
 *
 * The pricing page sells "Sales analytics dashboard" on Pro and "Advanced
 * analytics" on Premium, so the tiers have to actually differ:
 *
 *   free     lifetime totals only, with `locked: true` so the UI can upsell
 *   pro      + monthly revenue trend and best-selling listings
 *   premium  + repeat-buyer rate, average order value and escrow position
 *
 * Every figure is computed from paid orders, reading each order's items jsonb
 * so a vendor only ever sees their own share of a multi-vendor order.
 */
router.get("/dashboard/vendor/:vendorId/analytics", async (req, res): Promise<void> => {
  const vendorId = parseInt(req.params.vendorId);
  if (Number.isNaN(vendorId)) {
    res.status(400).json({ error: "Invalid vendorId" });
    return;
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  const plan = vendor.plan ?? "free";
  const tier = plan === "premium" ? "advanced" : plan === "pro" ? "standard" : "basic";

  // Lifetime totals — available on every plan.
  const totalsResult: any = await db.execute(sql`
    SELECT
      coalesce(sum((item->>'price')::float), 0)::float AS revenue,
      count(*)::int                                   AS units,
      count(DISTINCT o.id)::int                        AS orders
    FROM orders o, jsonb_array_elements(o.items) item
    WHERE (item->>'vendorId')::int = ${vendorId}
      AND o.payment_status = 'paid'
  `);
  const totals = totalsResult.rows?.[0] ?? { revenue: 0, units: 0, orders: 0 };

  const payload: Record<string, unknown> = {
    vendorId,
    plan,
    tier,
    locked: tier === "basic",
    currency: "GHS",
    summary: {
      totalRevenue: Math.round((totals.revenue ?? 0) * 100) / 100,
      unitsSold: totals.units ?? 0,
      orderCount: totals.orders ?? 0,
    },
    revenueTrend: [],
    topListings: [],
    advanced: null,
  };

  if (tier === "basic") {
    payload.upgradeMessage =
      "Sales analytics are part of the Pro plan. Upgrade to see your revenue trend and best-selling listings.";
    res.json(payload);
    return;
  }

  // --- Pro and above ---
  const trendResult: any = await db.execute(sql`
    SELECT
      to_char(date_trunc('month', o.created_at), 'YYYY-MM')  AS month,
      coalesce(sum((item->>'price')::float), 0)::float        AS revenue,
      count(*)::int                                          AS units
    FROM orders o, jsonb_array_elements(o.items) item
    WHERE (item->>'vendorId')::int = ${vendorId}
      AND o.payment_status = 'paid'
      AND o.created_at >= now() - interval '12 months'
    GROUP BY 1
    ORDER BY 1
  `);

  payload.revenueTrend = (trendResult.rows ?? []).map((r: any) => ({
    month: r.month,
    revenue: Math.round((r.revenue ?? 0) * 100) / 100,
    units: r.units ?? 0,
  }));

  const topResult: any = await db.execute(sql`
    SELECT
      item->>'title'                                   AS title,
      item->>'itemType'                                AS item_type,
      coalesce(sum((item->>'price')::float), 0)::float AS revenue,
      count(*)::int                                    AS units
    FROM orders o, jsonb_array_elements(o.items) item
    WHERE (item->>'vendorId')::int = ${vendorId}
      AND o.payment_status = 'paid'
    GROUP BY 1, 2
    ORDER BY revenue DESC
    LIMIT 10
  `);

  payload.topListings = (topResult.rows ?? []).map((r: any) => ({
    title: r.title,
    itemType: r.item_type,
    revenue: Math.round((r.revenue ?? 0) * 100) / 100,
    units: r.units ?? 0,
  }));

  if (tier !== "advanced") {
    payload.upgradeMessage =
      "Go Premium for repeat-buyer rate, average order value and your escrow position.";
    res.json(payload);
    return;
  }

  // --- Premium only ---
  const repeatResult: any = await db.execute(sql`
    WITH vendor_orders AS (
      SELECT DISTINCT o.id, o.session_id
      FROM orders o, jsonb_array_elements(o.items) item
      WHERE (item->>'vendorId')::int = ${vendorId}
        AND o.payment_status = 'paid'
    ),
    per_buyer AS (
      SELECT session_id, count(*)::int AS order_count
      FROM vendor_orders
      GROUP BY session_id
    )
    SELECT
      count(*)::int                                        AS buyers,
      coalesce(sum(CASE WHEN order_count > 1 THEN 1 ELSE 0 END), 0)::int AS repeat_buyers
    FROM per_buyer
  `);
  const repeat = repeatResult.rows?.[0] ?? { buyers: 0, repeat_buyers: 0 };

  // Money already earned but still held in escrow awaiting buyer confirmation.
  const escrowResult: any = await db.execute(sql`
    SELECT coalesce(sum((item->>'price')::float), 0)::float AS held
    FROM orders o, jsonb_array_elements(o.items) item
    WHERE (item->>'vendorId')::int = ${vendorId}
      AND o.payment_status = 'paid'
      AND o.payout_status = 'pending'
  `);

  const buyers = repeat.buyers ?? 0;
  const orderCount = totals.orders ?? 0;
  const revenue = totals.revenue ?? 0;

  payload.advanced = {
    uniqueBuyers: buyers,
    repeatBuyers: repeat.repeat_buyers ?? 0,
    repeatBuyerRate: buyers > 0 ? Math.round(((repeat.repeat_buyers ?? 0) / buyers) * 1000) / 10 : 0,
    averageOrderValue: orderCount > 0 ? Math.round((revenue / orderCount) * 100) / 100 : 0,
    fundsHeldInEscrow: Math.round((escrowResult.rows?.[0]?.held ?? 0) * 100) / 100,
    payoutPercentage: vendor.payoutPercentage,
  };

  res.json(payload);
});

export default router;
