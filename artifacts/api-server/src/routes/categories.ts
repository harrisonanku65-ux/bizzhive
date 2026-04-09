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
      courseCount: sql<number>`(SELECT count(*) FROM courses WHERE courses.category_id = ${categoriesTable.id})::int`,
      productCount: sql<number>`(SELECT count(*) FROM products WHERE products.category_id = ${categoriesTable.id})::int`,
    })
    .from(categoriesTable);

  res.json(ListCategoriesResponse.parse(categories));
});

export default router;
