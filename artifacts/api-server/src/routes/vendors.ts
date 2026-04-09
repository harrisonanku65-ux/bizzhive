import { Router, type IRouter } from "express";
import { db, vendorsTable, coursesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  ListVendorsQueryParams,
  ListVendorsResponse,
  CreateVendorBody,
  GetVendorParams,
  GetVendorResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/vendors", async (req, res): Promise<void> => {
  const query = ListVendorsQueryParams.safeParse(req.query);

  let vendorRows = await db
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
    .where(
      query.success && query.data.featured != null
        ? eq(vendorsTable.featured, query.data.featured)
        : undefined
    );

  res.json(ListVendorsResponse.parse(vendorRows));
});

router.post("/vendors", async (req, res): Promise<void> => {
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const [vendor] = await db.insert(vendorsTable).values({ ...parsed.data, slug }).returning();

  const result = {
    ...vendor,
    totalCourses: 0,
    totalProducts: 0,
  };

  res.status(201).json(result);
});

router.get("/vendors/:id", async (req, res): Promise<void> => {
  const params = GetVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [vendor] = await db
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
    .where(eq(vendorsTable.id, params.data.id));

  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  res.json(GetVendorResponse.parse(vendor));
});

export default router;
