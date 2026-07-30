import { Router, type IRouter } from "express";
import { db, categoriesTable, coursesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ListCategoriesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      description: categoriesTable.description,
      icon: categoriesTable.icon,
      // categories.id must stay qualified (not interpolated as ${categoriesTable.id})
      // — Drizzle renders that as a bare "id", which Postgres then resolves
      // against the subquery's own table instead of the outer categories row,
      // silently turning this into courses.id = courses.category_id.
      courseCount: sql<number>`(SELECT count(*) FROM courses WHERE courses.category_id = categories.id)::int`,
      productCount: sql<number>`(SELECT count(*) FROM products WHERE products.category_id = categories.id)::int`,
    })
    .from(categoriesTable);

  res.json(ListCategoriesResponse.parse(categories));
});

export default router;
