import Decimal from "decimal.js"
import { and, asc, eq, gte, lte, or, sql } from "drizzle-orm"

import { db } from "@/db"
import {
  category,
  financialAccount,
  recurringPayment,
  transaction,
} from "@/db/schema"
import { getFinancialAccount } from "@/features/accounts/queries"
import type { DashboardParams } from "@/features/dashboard/types"
import { formatMoney } from "@/lib/money"

export async function getMonthlyCashflow(userId: string, year: number) {
  const from = new Date(Date.UTC(year, 0, 1))
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))

  return db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${transaction.occurredAt}), 'YYYY-MM')`,
      type: transaction.type,
      currency: transaction.currency,
      amount: sql<string>`coalesce(sum(${transaction.amount}), 0)`,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.status, "POSTED"),
        gte(transaction.occurredAt, from),
        lte(transaction.occurredAt, to),
        sql`${transaction.type} in ('INCOME', 'EXPENSE')`,
      ),
    )
    .groupBy(sql`date_trunc('month', ${transaction.occurredAt})`, transaction.type, transaction.currency)
    .orderBy(sql`date_trunc('month', ${transaction.occurredAt})`)
}

export async function getCategoryBreakdown(
  userId: string,
  params: DashboardParams & { type: "INCOME" | "EXPENSE" },
) {
  const rows = await db
    .select({
      categoryId: transaction.categoryId,
      categoryName: category.name,
      currency: transaction.currency,
      amount: sql<string>`coalesce(sum(${transaction.amount}), 0)`,
      transactionCount: sql<string>`count(*)`,
    })
    .from(transaction)
    .leftJoin(category, eq(transaction.categoryId, category.id))
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.status, "POSTED"),
        eq(transaction.type, params.type),
        gte(transaction.occurredAt, params.from),
        lte(transaction.occurredAt, params.to),
        params.currency ? eq(transaction.currency, params.currency) : undefined,
      ),
    )
    .groupBy(transaction.categoryId, category.name, transaction.currency)

  const totalsByCurrency = new Map<string, Decimal>()

  for (const row of rows) {
    totalsByCurrency.set(
      row.currency,
      (totalsByCurrency.get(row.currency) ?? new Decimal(0)).plus(row.amount),
    )
  }

  return rows.map((row) => {
    const total = totalsByCurrency.get(row.currency) ?? new Decimal(0)
    const percentage = total.eq(0)
      ? "0.00"
      : new Decimal(row.amount).div(total).times(100).toFixed(2)

    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      currency: row.currency,
      amount: row.amount,
      transactionCount: Number(row.transactionCount),
      percentage,
    }
  })
}

export async function getAccountBalanceTimeline(
  userId: string,
  accountId: string,
  params: Pick<DashboardParams, "from" | "to">,
) {
  const account = await getFinancialAccount(userId, accountId)

  if (!account) {
    return []
  }

  const rows = await db
    .select({
      id: transaction.id,
      accountId: transaction.accountId,
      transferAccountId: transaction.transferAccountId,
      type: transaction.type,
      amount: transaction.amount,
      occurredAt: transaction.occurredAt,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.status, "POSTED"),
        gte(transaction.occurredAt, params.from),
        lte(transaction.occurredAt, params.to),
        or(
          eq(transaction.accountId, accountId),
          eq(transaction.transferAccountId, accountId),
        ),
      ),
    )
    .orderBy(asc(transaction.occurredAt), asc(transaction.createdAt))

  let balance = new Decimal(account.initialBalance)

  return rows.map((row) => {
    const amount = new Decimal(row.amount)

    if (row.type === "INCOME" && row.accountId === accountId) {
      balance = balance.plus(amount)
    } else if (row.type === "EXPENSE" && row.accountId === accountId) {
      balance = balance.minus(amount)
    } else if (row.type === "TRANSFER" && row.accountId === accountId) {
      balance = balance.minus(amount)
    } else if (row.type === "TRANSFER" && row.transferAccountId === accountId) {
      balance = balance.plus(amount)
    }

    return {
      transactionId: row.id,
      occurredAt: row.occurredAt,
      amount: formatMoney(balance),
      currency: account.currency,
    }
  })
}

export async function getRecurringMonthlyEstimate(
  userId: string,
  params?: { currency?: string },
) {
  const rows = await db
    .select({
      type: recurringPayment.type,
      amount: recurringPayment.amount,
      currency: recurringPayment.currency,
      frequency: recurringPayment.frequency,
      intervalCount: recurringPayment.intervalCount,
    })
    .from(recurringPayment)
    .innerJoin(
      financialAccount,
      eq(recurringPayment.accountId, financialAccount.id),
    )
    .where(
      and(
        eq(recurringPayment.userId, userId),
        eq(recurringPayment.status, "ACTIVE"),
        eq(financialAccount.isArchived, false),
        sql`${recurringPayment.type} in ('INCOME', 'EXPENSE')`,
        params?.currency
          ? eq(recurringPayment.currency, params.currency)
          : undefined,
      ),
    )

  const estimates = new Map<string, Decimal>()

  for (const row of rows) {
    const key = `${row.type}:${row.currency}`
    const interval = new Decimal(row.intervalCount)
    let monthlyAmount = new Decimal(row.amount)

    if (row.frequency === "DAILY") {
      monthlyAmount = monthlyAmount.times(365).div(12).div(interval)
    } else if (row.frequency === "WEEKLY") {
      monthlyAmount = monthlyAmount.times(52).div(12).div(interval)
    } else if (row.frequency === "YEARLY") {
      monthlyAmount = monthlyAmount.div(12).div(interval)
    } else {
      monthlyAmount = monthlyAmount.div(interval)
    }

    estimates.set(key, (estimates.get(key) ?? new Decimal(0)).plus(monthlyAmount))
  }

  return [...estimates.entries()].map(([key, amount]) => {
    const [type, currency] = key.split(":") as ["INCOME" | "EXPENSE", string]

    return {
      type,
      currency,
      amount: formatMoney(amount),
    }
  })
}
