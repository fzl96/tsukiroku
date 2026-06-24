import { and, desc, eq, gte, inArray, lt, lte, or } from "drizzle-orm"

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

function mergeUniqueIds(...idLists: Array<string[] | undefined>) {
  return [...new Set(idLists.flatMap((ids) => ids ?? []))]
}

export async function getTransaction(userId: string, transactionId: string) {
  const [row] = await db
    .select()
    .from(transaction)
    .where(
      and(eq(transaction.id, transactionId), eq(transaction.userId, userId))
    )
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

  if (parsedFilters?.toExclusive) {
    conditions.push(lt(transaction.occurredAt, parsedFilters.toExclusive))
  }

  const accountIds = mergeUniqueIds(
    parsedFilters?.accountId ? [parsedFilters.accountId] : undefined,
    parsedFilters?.accountIds
  )

  if (accountIds.length === 1) {
    conditions.push(
      or(
        eq(transaction.accountId, accountIds[0]),
        eq(transaction.transferAccountId, accountIds[0])
      )!
    )
  } else if (accountIds.length > 1) {
    conditions.push(
      or(
        inArray(transaction.accountId, accountIds),
        inArray(transaction.transferAccountId, accountIds)
      )!
    )
  }

  const categoryIds = mergeUniqueIds(
    parsedFilters?.categoryId ? [parsedFilters.categoryId] : undefined,
    parsedFilters?.categoryIds
  )

  if (categoryIds.length === 1) {
    conditions.push(eq(transaction.categoryId, categoryIds[0]))
  } else if (categoryIds.length > 1) {
    conditions.push(inArray(transaction.categoryId, categoryIds))
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
  filters?: unknown
) {
  return listTransactions(userId, mergeFilters(filters, { accountId }))
}

export async function getTransactionsByCategory(
  userId: string,
  categoryId: string,
  filters?: unknown
) {
  return listTransactions(userId, mergeFilters(filters, { categoryId }))
}
