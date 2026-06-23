import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { category, recurringPayment, transaction } from "@/db/schema"
import { getCategory } from "@/features/categories/queries"
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/features/categories/validations"
import { notFound, validationError } from "@/lib/errors"

export async function createCategory(userId: string, input: unknown) {
  const data = createCategorySchema.parse(input)
  const [created] = await db
    .insert(category)
    .values({
      userId,
      ...data,
    })
    .returning()

  return created
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: unknown,
) {
  const existing = await getCategory(userId, categoryId)

  if (!existing) {
    throw notFound("Category not found.")
  }

  const data = updateCategorySchema.parse(input)
  const [updated] = await db
    .update(category)
    .set(data)
    .where(and(eq(category.id, categoryId), eq(category.userId, userId)))
    .returning()

  return updated
}

export async function archiveCategory(userId: string, categoryId: string) {
  return updateCategory(userId, categoryId, { isArchived: true })
}

export async function deleteCategory(userId: string, categoryId: string) {
  const existing = await getCategory(userId, categoryId)

  if (!existing) {
    throw notFound("Category not found.")
  }

  const [linkedTransaction] = await db
    .select({ id: transaction.id })
    .from(transaction)
    .where(
      and(eq(transaction.userId, userId), eq(transaction.categoryId, categoryId)),
    )
    .limit(1)

  if (linkedTransaction) {
    throw validationError("Archive categories that have transactions.")
  }

  const [linkedRecurringPayment] = await db
    .select({ id: recurringPayment.id })
    .from(recurringPayment)
    .where(
      and(
        eq(recurringPayment.userId, userId),
        eq(recurringPayment.categoryId, categoryId),
      ),
    )
    .limit(1)

  if (linkedRecurringPayment) {
    throw validationError("Archive categories that have recurring payments.")
  }

  await db
    .delete(category)
    .where(and(eq(category.id, categoryId), eq(category.userId, userId)))
}
