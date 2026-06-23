import { and, desc, eq, gte, lte, or } from "drizzle-orm"

import { db } from "@/db"
import { transaction } from "@/db/schema"
import { listTransactionsFiltersSchema } from "@/features/transactions/validations"

function mergeFilters(filters: unknown, override: Record<string, string>) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return override
  }

  return {
    ...filters,
    ...override,
  }
}

export async function getTransaction(userId: string, transactionId: string) {
  const [row] = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.id, transactionId), eq(transaction.userId, userId)))
    .limit(1)

  return row ?? null
}

export async function listTransactions(userId: string, filters?: unknown) {
  const parsedFilters = listTransactionsFiltersSchema.parse(filters)
  const conditions = [eq(transaction.userId, userId)]

  if (parsedFilters?.from) {
    conditions.push(gte(transaction.occurredAt, parsedFilters.from))
  }

  if (parsedFilters?.to) {
    conditions.push(lte(transaction.occurredAt, parsedFilters.to))
  }

  if (parsedFilters?.accountId) {
    conditions.push(
      or(
        eq(transaction.accountId, parsedFilters.accountId),
        eq(transaction.transferAccountId, parsedFilters.accountId),
      )!,
    )
  }

  if (parsedFilters?.categoryId) {
    conditions.push(eq(transaction.categoryId, parsedFilters.categoryId))
  }

  if (parsedFilters?.type) {
    conditions.push(eq(transaction.type, parsedFilters.type))
  }

  if (parsedFilters?.status) {
    conditions.push(eq(transaction.status, parsedFilters.status))
  }

  return db
    .select()
    .from(transaction)
    .where(and(...conditions))
    .orderBy(desc(transaction.occurredAt), desc(transaction.createdAt))
}

export async function getTransactionsByAccount(
  userId: string,
  accountId: string,
  filters?: unknown,
) {
  return listTransactions(userId, mergeFilters(filters, { accountId }))
}

export async function getTransactionsByCategory(
  userId: string,
  categoryId: string,
  filters?: unknown,
) {
  return listTransactions(userId, mergeFilters(filters, { categoryId }))
}
