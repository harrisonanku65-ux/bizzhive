import { Router, type IRouter } from "express";
import {
  db,
  reviewsTable,
  coursesTable,
  productsTable,
  vendorsTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

type Target = "course" | "product" | "vendor";

const TARGET_COLUMN = {
  course: reviewsTable.courseId,
  product: reviewsTable.productId,
  vendor: reviewsTable.vendorId,
} as const;

function shapeReview(row: any) {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    userName: row.userName,
    targetType: row.targetType,
    courseId: row.courseId ?? null,
    productId: row.productId ?? null,
    vendorId: row.vendorId ?? null,
    vendorResponse: row.vendorResponse ?? null,
    vendorRespondedAt: row.vendorRespondedAt ?? null,
    createdAt: row.createdAt,
  };
}

/**
 * Recomputes the cached rating/reviewsCount on whatever was reviewed.
 *
 * Kept as a recalculation from the reviews table rather than an incremental
 * bump so the aggregate can't drift out of sync after edits or deletions.
 */
async function recalcRating(target: Target, targetId: number) {
  const [agg] = await db
    .select({
      avg: sql<number>`coalesce(avg(${reviewsTable.rating}), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.targetType, target), eq(TARGET_COLUMN[target], targetId)));

  const rating = Math.round((agg?.avg ?? 0) * 100) / 100;
  const count = agg?.count ?? 0;

  if (target === "course") {
    await db.update(coursesTable).set({ rating, reviewsCount: count }).where(eq(coursesTable.id, targetId));
  } else if (target === "product") {
    await db.update(productsTable).set({ rating, reviewsCount: count }).where(eq(productsTable.id, targetId));
  } else {
    await db.update(vendorsTable).set({ rating }).where(eq(vendorsTable.id, targetId));
  }
}

async function listReviews(target: Target, targetId: number) {
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.targetType, target), eq(TARGET_COLUMN[target], targetId)))
    .orderBy(desc(reviewsTable.createdAt));

  return rows.map(shapeReview);
}

/**
 * Creates a review. Signed-in users are limited to one review per item so a
 * single account can't inflate or tank a rating by posting repeatedly.
 * Anonymous reviews are still allowed (guests can buy) but can't be edited.
 */
async function createReview(
  target: Target,
  targetId: number,
  body: any,
  userId: number | undefined,
) {
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "rating must be a whole number between 1 and 5", status: 400 };
  }
  if (!body?.userName) {
    return { error: "userName is required", status: 400 };
  }

  if (userId) {
    const [existing] = await db
      .select({ id: reviewsTable.id })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.targetType, target),
          eq(TARGET_COLUMN[target], targetId),
          eq(reviewsTable.userId, userId),
        ),
      );
    if (existing) {
      return { error: "You have already reviewed this", status: 409 };
    }
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      rating,
      comment: body.comment ?? null,
      userName: body.userName,
      targetType: target,
      courseId: target === "course" ? targetId : null,
      productId: target === "product" ? targetId : null,
      vendorId: target === "vendor" ? targetId : null,
      userId: userId ?? null,
    })
    .returning();

  await recalcRating(target, targetId);
  return { review: shapeReview(review) };
}

/* ------------------------------------------------------------------ *
 * Product reviews
 * ------------------------------------------------------------------ */

router.get("/products/:id/reviews", async (req, res): Promise<void> => {
  res.json(await listReviews("product", parseInt(req.params.id)));
});

router.post("/products/:id/reviews", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id);
  const [product] = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const result = await createReview("product", productId, req.body, req.session?.userId);
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(201).json(result.review);
});

/* ------------------------------------------------------------------ *
 * Vendor reviews
 * ------------------------------------------------------------------ */

router.get("/vendors/:id/reviews", async (req, res): Promise<void> => {
  res.json(await listReviews("vendor", parseInt(req.params.id)));
});

router.post("/vendors/:id/reviews", async (req, res): Promise<void> => {
  const vendorId = parseInt(req.params.id);
  const [vendor] = await db.select({ id: vendorsTable.id }).from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  const result = await createReview("vendor", vendorId, req.body, req.session?.userId);
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(201).json(result.review);
});

/* ------------------------------------------------------------------ *
 * Seller-side review management
 * ------------------------------------------------------------------ */

/**
 * Every review across a vendor's courses, products and their own profile —
 * this is the feed behind the Pro plan's "customer review management".
 */
router.get("/vendors/:vendorId/all-reviews", async (req, res): Promise<void> => {
  const vendorId = parseInt(req.params.vendorId);

  const courseReviews = await db
    .select({
      id: reviewsTable.id,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      userName: reviewsTable.userName,
      targetType: reviewsTable.targetType,
      courseId: reviewsTable.courseId,
      productId: reviewsTable.productId,
      vendorId: reviewsTable.vendorId,
      vendorResponse: reviewsTable.vendorResponse,
      vendorRespondedAt: reviewsTable.vendorRespondedAt,
      createdAt: reviewsTable.createdAt,
      itemTitle: coursesTable.title,
    })
    .from(reviewsTable)
    .innerJoin(coursesTable, eq(reviewsTable.courseId, coursesTable.id))
    .where(eq(coursesTable.vendorId, vendorId));

  const productReviews = await db
    .select({
      id: reviewsTable.id,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      userName: reviewsTable.userName,
      targetType: reviewsTable.targetType,
      courseId: reviewsTable.courseId,
      productId: reviewsTable.productId,
      vendorId: reviewsTable.vendorId,
      vendorResponse: reviewsTable.vendorResponse,
      vendorRespondedAt: reviewsTable.vendorRespondedAt,
      createdAt: reviewsTable.createdAt,
      itemTitle: productsTable.title,
    })
    .from(reviewsTable)
    .innerJoin(productsTable, eq(reviewsTable.productId, productsTable.id))
    .where(eq(productsTable.vendorId, vendorId));

  const directReviews = await db
    .select({
      id: reviewsTable.id,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      userName: reviewsTable.userName,
      targetType: reviewsTable.targetType,
      courseId: reviewsTable.courseId,
      productId: reviewsTable.productId,
      vendorId: reviewsTable.vendorId,
      vendorResponse: reviewsTable.vendorResponse,
      vendorRespondedAt: reviewsTable.vendorRespondedAt,
      createdAt: reviewsTable.createdAt,
      itemTitle: vendorsTable.name,
    })
    .from(reviewsTable)
    .innerJoin(vendorsTable, eq(reviewsTable.vendorId, vendorsTable.id))
    .where(and(eq(reviewsTable.targetType, "vendor"), eq(reviewsTable.vendorId, vendorId)));

  const all = [...courseReviews, ...productReviews, ...directReviews]
    .map((r) => ({ ...shapeReview(r), itemTitle: r.itemTitle }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(all);
});

/**
 * Seller replies publicly to a review. Ownership is checked against the
 * reviewed item so a vendor can't answer on someone else's listing.
 */
router.post("/reviews/:id/respond", async (req, res): Promise<void> => {
  const reviewId = parseInt(req.params.id);
  const userId = req.session?.userId;
  const { response } = req.body ?? {};

  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (!response || !String(response).trim()) {
    res.status(400).json({ error: "response text is required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.vendorId) {
    res.status(403).json({ error: "Only sellers can respond to reviews" });
    return;
  }

  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, reviewId));
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  let ownerVendorId: number | null = null;
  if (review.targetType === "course" && review.courseId) {
    const [c] = await db.select({ vendorId: coursesTable.vendorId }).from(coursesTable).where(eq(coursesTable.id, review.courseId));
    ownerVendorId = c?.vendorId ?? null;
  } else if (review.targetType === "product" && review.productId) {
    const [p] = await db.select({ vendorId: productsTable.vendorId }).from(productsTable).where(eq(productsTable.id, review.productId));
    ownerVendorId = p?.vendorId ?? null;
  } else if (review.targetType === "vendor") {
    ownerVendorId = review.vendorId ?? null;
  }

  if (ownerVendorId !== user.vendorId) {
    res.status(403).json({ error: "You can only respond to reviews on your own listings" });
    return;
  }

  const [updated] = await db
    .update(reviewsTable)
    .set({ vendorResponse: String(response).trim(), vendorRespondedAt: new Date() })
    .where(eq(reviewsTable.id, reviewId))
    .returning();

  res.json(shapeReview(updated));
});

export default router;
