import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { category } from "@/db/schema"
import { listCategoriesFiltersSchema } from "@/features/categories/validations"

export async function getCategory(userId: string, categoryId: string) {
  const [row] = await db
    .select()
    .from(category)
    .where(and(eq(category.id, categoryId), eq(category.userId, userId)))
    .limit(1)

  return row ?? null
}

export async function listCategories(userId: string, filters?: unknown) {
  const parsedFilters = listCategoriesFiltersSchema.parse(filters)
  const conditions = [eq(category.userId, userId)]

  if (parsedFilters?.kind) {
    conditions.push(eq(category.kind, parsedFilters.kind))
  }

  if (!parsedFilters?.includeArchived) {
    conditions.push(eq(category.isArchived, false))
  }

  return db
    .select()
    .from(category)
    .where(and(...conditions))
    .orderBy(asc(category.kind), asc(category.name))
}
