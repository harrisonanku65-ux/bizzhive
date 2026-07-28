import { Router, type IRouter } from "express";
import { db, productsTable, vendorsTable, categoriesTable } from "@workspace/db";
import { eq, sql, ilike, and, desc, asc } from "drizzle-orm";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  CreateProductBody,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
} from "@workspace/api-zod";
import { requireOwnVendorId } from "../middlewares/requireVendor";
import { countActiveListings, listingLimitForPlan } from "../lib/listingLimits";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  const filters: any[] = [];

  if (query.success) {
    if (query.data.categoryId != null) filters.push(eq(productsTable.categoryId, query.data.categoryId));
    if (query.data.vendorId != null) filters.push(eq(productsTable.vendorId, query.data.vendorId));
    if (query.data.type != null) filters.push(eq(productsTable.productType, query.data.type));
    if (query.data.featured != null) filters.push(eq(productsTable.featured, query.data.featured));
    if (query.data.search) filters.push(ilike(productsTable.title, `%${query.data.search}%`));
  }

  let orderBy: any = desc(productsTable.createdAt);
  if (query.success && query.data.sortBy) {
    switch (query.data.sortBy) {
      case "popular": orderBy = desc(productsTable.salesCount); break;
      case "price_low": orderBy = asc(productsTable.price); break;
      case "price_high": orderBy = desc(productsTable.price); break;
      case "rating": orderBy = desc(productsTable.rating); break;
      default: orderBy = desc(productsTable.createdAt);
    }
  }

  const products = await db
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
      previewUrl: productsTable.previewUrl,
      licenseTerms: productsTable.licenseTerms,
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
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(sql<number>`CASE WHEN ${vendorsTable.plan} = 'premium' THEN 2 WHEN ${vendorsTable.plan} = 'pro' THEN 1 ELSE 0 END`), orderBy);

  res.json(ListProductsResponse.parse(products));
});

router.post("/products", async (req, res): Promise<void> => {
  const vendorId = await requireOwnVendorId(req, res);
  if (vendorId === null) return;

  const parsed = CreateProductBody.safeParse({ ...req.body, vendorId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existingVendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  const limit = listingLimitForPlan(existingVendor?.plan);
  const count = await countActiveListings(vendorId);

  if (count >= limit) {
    res.status(403).json({ error: "Listing limit reached for your plan. Upgrade to add more." });
    return;
  }

  const slug = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    slug,
    currency: parsed.data.currency ?? "GHS",
  }).returning();

  const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));

  res.status(201).json({
    ...product,
    vendorName: existingVendor?.name ?? "",
    vendorAvatar: existingVendor?.avatar ?? null,
    categoryName: category?.name ?? "",
  });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
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
      previewUrl: productsTable.previewUrl,
      licenseTerms: productsTable.licenseTerms,
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
    .where(eq(productsTable.id, params.data.id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(GetProductResponse.parse(product));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set(parsed.data)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, product.vendorId));
  const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));

  res.json(UpdateProductResponse.parse({
    ...product,
    vendorName: vendor?.name ?? "",
    vendorAvatar: vendor?.avatar ?? null,
    categoryName: category?.name ?? "",
  }));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const vendorId = await requireOwnVendorId(req, res);
  if (vendorId === null) return;

  const [existing] = await db.select({ vendorId: productsTable.vendorId }).from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (existing.vendorId !== vendorId) {
    res.status(403).json({ error: "You can only delete your own products" });
    return;
  }

  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
