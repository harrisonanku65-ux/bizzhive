import { Router, type IRouter } from "express";
import { db, coursesTable, vendorsTable, categoriesTable, lessonsTable, reviewsTable } from "@workspace/db";
import { eq, sql, ilike, and, desc, asc } from "drizzle-orm";
import {
  ListCoursesQueryParams,
  ListCoursesResponse,
  CreateCourseBody,
  GetCourseParams,
  GetCourseResponse,
  UpdateCourseParams,
  UpdateCourseBody,
  UpdateCourseResponse,
  DeleteCourseParams,
  CreateLessonParams,
  CreateLessonBody,
  ListCourseReviewsParams,
  ListCourseReviewsResponse,
  CreateCourseReviewParams,
  CreateCourseReviewBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/courses", async (req, res): Promise<void> => {
  const query = ListCoursesQueryParams.safeParse(req.query);
  const filters: any[] = [];

  if (query.success) {
    if (query.data.categoryId != null) filters.push(eq(coursesTable.categoryId, query.data.categoryId));
    if (query.data.vendorId != null) filters.push(eq(coursesTable.vendorId, query.data.vendorId));
    if (query.data.level != null) filters.push(eq(coursesTable.level, query.data.level));
    if (query.data.featured != null) filters.push(eq(coursesTable.featured, query.data.featured));
    if (query.data.search) filters.push(ilike(coursesTable.title, `%${query.data.search}%`));
  }

  let orderBy: any = desc(coursesTable.createdAt);
  if (query.success && query.data.sortBy) {
    switch (query.data.sortBy) {
      case "popular": orderBy = desc(coursesTable.enrollments); break;
      case "price_low": orderBy = asc(coursesTable.price); break;
      case "price_high": orderBy = desc(coursesTable.price); break;
      case "rating": orderBy = desc(coursesTable.rating); break;
      default: orderBy = desc(coursesTable.createdAt);
    }
  }

  const courses = await db
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
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(sql<number>`CASE WHEN ${vendorsTable.plan} = 'premium' THEN 2 WHEN ${vendorsTable.plan} = 'pro' THEN 1 ELSE 0 END`), orderBy);

  res.json(ListCoursesResponse.parse(courses));
});

router.post("/courses", async (req, res): Promise<void> => {
  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slug = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();

  const [existingVendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, parsed.data.vendorId));
  const limit = existingVendor?.plan === "premium" ? Infinity : existingVendor?.plan === "pro" ? 10 : 1;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(coursesTable)
    .where(eq(coursesTable.vendorId, parsed.data.vendorId));

  if (count >= limit) {
    res.status(403).json({ error: "Listing limit reached for your plan. Upgrade to add more." });
    return;
  }

  const [course] = await db.insert(coursesTable).values({
    ...parsed.data,
    slug,
    currency: parsed.data.currency ?? "GHS",
  }).returning();

  const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, course.categoryId));

  const result = {
    ...course,
    vendorName: existingVendor?.name ?? "",
    vendorAvatar: existingVendor?.avatar ?? null,
    categoryName: category?.name ?? "",
    lessonsCount: 0,
  };

  res.status(201).json(result);
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const params = GetCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [course] = await db
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
      vendorBio: vendorsTable.bio,
      categoryId: coursesTable.categoryId,
      categoryName: categoriesTable.name,
      createdAt: coursesTable.createdAt,
      lessonsCount: sql<number>`(SELECT count(*) FROM lessons WHERE lessons.course_id = ${coursesTable.id})::int`,
    })
    .from(coursesTable)
    .innerJoin(vendorsTable, eq(coursesTable.vendorId, vendorsTable.id))
    .innerJoin(categoriesTable, eq(coursesTable.categoryId, categoriesTable.id))
    .where(eq(coursesTable.id, params.data.id));

  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  const lessons = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.courseId, params.data.id))
    .orderBy(asc(lessonsTable.sortOrder));

  res.json(GetCourseResponse.parse({ ...course, lessons }));
});

router.patch("/courses/:id", async (req, res): Promise<void> => {
  const params = UpdateCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [course] = await db
    .update(coursesTable)
    .set(parsed.data)
    .where(eq(coursesTable.id, params.data.id))
    .returning();

  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, course.vendorId));
  const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, course.categoryId));

  res.json(UpdateCourseResponse.parse({
    ...course,
    vendorName: vendor?.name ?? "",
    vendorAvatar: vendor?.avatar ?? null,
    categoryName: category?.name ?? "",
    lessonsCount: 0,
  }));
});

router.delete("/courses/:id", async (req, res): Promise<void> => {
  const params = DeleteCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [course] = await db.delete(coursesTable).where(eq(coursesTable.id, params.data.id)).returning();
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/courses/:courseId/lessons", async (req, res): Promise<void> => {
  const params = CreateLessonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lesson] = await db.insert(lessonsTable).values({
    ...parsed.data,
    isFree: parsed.data.isFree ?? false,
    courseId: params.data.courseId,
  }).returning();

  res.status(201).json(lesson);
});

router.get("/courses/:id/reviews", async (req, res): Promise<void> => {
  const params = ListCourseReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.targetType, "course"), eq(reviewsTable.courseId, params.data.id)))
    .orderBy(desc(reviewsTable.createdAt));

  res.json(ListCourseReviewsResponse.parse(reviews));
});

router.post("/courses/:id/reviews", async (req, res): Promise<void> => {
  const params = CreateCourseReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateCourseReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    ...parsed.data,
    targetType: "course",
    courseId: params.data.id,
    userId: req.session?.userId ?? null,
  }).returning();

  const reviews = await db.select().from(reviewsTable).where(and(eq(reviewsTable.targetType, "course"), eq(reviewsTable.courseId, params.data.id)));
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await db.update(coursesTable).set({
    rating: Math.round(avgRating * 10) / 10,
    reviewsCount: reviews.length,
  }).where(eq(coursesTable.id, params.data.id));

  res.status(201).json(review);
});

export default router;
