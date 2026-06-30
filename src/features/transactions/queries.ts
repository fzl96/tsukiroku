import {
  and,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm"

import { db } from "@/db"
import { transaction } from "@/db/schema"
import {
  initialTransactionListOptionsSchema,
  transactionListDayOptionsSchema,
  transactionListPageOptionsSchema,
  listTransactionsFiltersSchema,
} from "@/features/transactions/validations"

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

function getTransactionConditions(
  userId: string,
  filters: ReturnType<typeof listTransactionsFiltersSchema.parse>
) {
  const conditions = [eq(transaction.userId, userId)]

  if (filters?.from) {
    conditions.push(gte(transaction.occurredAt, filters.from))
  }

  if (filters?.to) {
    conditions.push(lte(transaction.occurredAt, filters.to))
  }

  if (filters?.toExclusive) {
    conditions.push(lt(transaction.occurredAt, filters.toExclusive))
  }

  const accountIds = mergeUniqueIds(
    filters?.accountId ? [filters.accountId] : undefined,
    filters?.accountIds
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
    filters?.categoryId ? [filters.categoryId] : undefined,
    filters?.categoryIds
  )

  if (categoryIds.length === 1) {
    conditions.push(eq(transaction.categoryId, categoryIds[0]))
  } else if (categoryIds.length > 1) {
    conditions.push(inArray(transaction.categoryId, categoryIds))
  }

  if (filters?.type) {
    conditions.push(eq(transaction.type, filters.type))
  }

  if (filters?.status) {
    conditions.push(eq(transaction.status, filters.status))
  }

  return conditions
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
  const conditions = getTransactionConditions(userId, parsedFilters)

  return db
    .select()
    .from(transaction)
    .where(and(...conditions))
    .orderBy(desc(transaction.occurredAt), desc(transaction.createdAt))
}

export async function listInitialTransactions(
  userId: string,
  filters: unknown,
  options: unknown
) {
  const page = await listTransactionPage(userId, filters, {
    ...initialTransactionListOptionsSchema.parse(options),
    dayOffset: 0,
  })

  return page.transactions
}

export async function listTransactionPage(
  userId: string,
  filters: unknown,
  options: unknown
) {
  const parsedFilters = listTransactionsFiltersSchema.parse(filters)
  const parsedOptions = transactionListPageOptionsSchema.parse(options)
  const conditions = getTransactionConditions(userId, parsedFilters)
  const localDay = sql`(${transaction.occurredAt} at time zone ${parsedOptions.timezone})::date`
  const rankedTransactions = db
    .select({
      ...getTableColumns(transaction),
      dayKey: sql<string>`to_char(${localDay}, 'YYYY-MM-DD')`.as("day_key"),
      dayRank:
        sql<number>`(dense_rank() over (order by ${localDay} desc))::int`.as(
          "day_rank"
        ),
      totalTransactions:
        sql<number>`(count(*) over (partition by ${localDay}))::int`.as(
          "total_transactions"
        ),
      transactionRank:
        sql<number>`(row_number() over (partition by ${localDay} order by ${transaction.occurredAt} desc, ${transaction.createdAt} desc))::int`.as(
          "transaction_rank"
        ),
    })
    .from(transaction)
    .where(and(...conditions))
    .as("ranked_transactions")

  const rows = await db
    .select({
      id: rankedTransactions.id,
      userId: rankedTransactions.userId,
      accountId: rankedTransactions.accountId,
      transferAccountId: rankedTransactions.transferAccountId,
      title: rankedTransactions.title,
      type: rankedTransactions.type,
      status: rankedTransactions.status,
      amount: rankedTransactions.amount,
      currency: rankedTransactions.currency,
      occurredAt: rankedTransactions.occurredAt,
      merchant: rankedTransactions.merchant,
      note: rankedTransactions.note,
      reference: rankedTransactions.reference,
      categoryId: rankedTransactions.categoryId,
      recurringPaymentId: rankedTransactions.recurringPaymentId,
      createdAt: rankedTransactions.createdAt,
      updatedAt: rankedTransactions.updatedAt,
      dayKey: rankedTransactions.dayKey,
      dayRank: rankedTransactions.dayRank,
      totalTransactions: rankedTransactions.totalTransactions,
      transactionRank: rankedTransactions.transactionRank,
    })
    .from(rankedTransactions)
    .where(
      and(
        sql`${rankedTransactions.dayRank} > ${parsedOptions.dayOffset}`,
        lte(
          rankedTransactions.dayRank,
          parsedOptions.dayOffset + parsedOptions.visibleDays + 1
        ),
        lte(
          rankedTransactions.transactionRank,
          parsedOptions.transactionsPerDay
        )
      )
    )
    .orderBy(
      desc(rankedTransactions.occurredAt),
      desc(rankedTransactions.createdAt)
    )

  const nextDayOffset = parsedOptions.dayOffset + parsedOptions.visibleDays
  const transactions = rows.filter((row) => row.dayRank <= nextDayOffset)
  const hasMoreDays = rows.some((row) => row.dayRank > nextDayOffset)

  return {
    hasMoreDays,
    nextDayOffset: hasMoreDays ? nextDayOffset : null,
    transactions,
  }
}

export async function listTransactionsForLocalDay(
  userId: string,
  filters: unknown,
  options: unknown
) {
  const parsedFilters = listTransactionsFiltersSchema.parse(filters)
  const parsedOptions = transactionListDayOptionsSchema.parse(options)
  const conditions = getTransactionConditions(userId, parsedFilters)
  const localDay = sql`(${transaction.occurredAt} at time zone ${parsedOptions.timezone})::date`
  const rankedTransactions = db
    .select({
      ...getTableColumns(transaction),
      dayKey: sql<string>`to_char(${localDay}, 'YYYY-MM-DD')`.as("day_key"),
      totalTransactions: sql<number>`(count(*) over ())::int`.as(
        "total_transactions"
      ),
      transactionRank:
        sql<number>`(row_number() over (order by ${transaction.occurredAt} desc, ${transaction.createdAt} desc))::int`.as(
          "transaction_rank"
        ),
    })
    .from(transaction)
    .where(and(...conditions, sql`${localDay} = ${parsedOptions.dayKey}::date`))
    .as("ranked_transactions_for_day")

  return db
    .select({
      id: rankedTransactions.id,
      userId: rankedTransactions.userId,
      accountId: rankedTransactions.accountId,
      transferAccountId: rankedTransactions.transferAccountId,
      title: rankedTransactions.title,
      type: rankedTransactions.type,
      status: rankedTransactions.status,
      amount: rankedTransactions.amount,
      currency: rankedTransactions.currency,
      occurredAt: rankedTransactions.occurredAt,
      merchant: rankedTransactions.merchant,
      note: rankedTransactions.note,
      reference: rankedTransactions.reference,
      categoryId: rankedTransactions.categoryId,
      recurringPaymentId: rankedTransactions.recurringPaymentId,
      createdAt: rankedTransactions.createdAt,
      updatedAt: rankedTransactions.updatedAt,
      dayKey: rankedTransactions.dayKey,
      totalTransactions: rankedTransactions.totalTransactions,
      transactionRank: rankedTransactions.transactionRank,
    })
    .from(rankedTransactions)
    .where(
      and(
        sql`${rankedTransactions.transactionRank} > ${parsedOptions.transactionOffset}`,
        lte(
          rankedTransactions.transactionRank,
          parsedOptions.transactionOffset + parsedOptions.transactionsPerPage
        )
      )
    )
    .orderBy(
      desc(rankedTransactions.occurredAt),
      desc(rankedTransactions.createdAt)
    )
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
