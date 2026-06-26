import { and, eq, gte, inArray, lte, sql } from "drizzle-orm"

import { category, transaction } from "@/db/schema"
import { db } from "@/db"
import {
  getAccountBalances as getAccountBalancesForAccounts,
  listFinancialAccounts,
} from "@/features/accounts/queries"
import { getNetCashflowByCurrency } from "@/features/dashboard/summary"
import type {
  CategorySummary,
  DashboardParams,
  DashboardSummary,
} from "@/features/dashboard/types"
import { generateRecurringPaymentForecast } from "@/features/recurring-payments/service"

function transactionRangeConditions(userId: string, params: DashboardParams) {
  const conditions = [
    eq(transaction.userId, userId),
    eq(transaction.status, "POSTED" as const),
    gte(transaction.occurredAt, params.from),
    lte(transaction.occurredAt, params.to),
  ]

  if (params.accountIds?.length) {
    conditions.push(inArray(transaction.accountId, params.accountIds))
  }

  if (params.currency) {
    conditions.push(eq(transaction.currency, params.currency))
  }

  return conditions
}

async function getTotalsByType(
  userId: string,
  params: DashboardParams,
  type: "INCOME" | "EXPENSE",
) {
  const rows = await db
    .select({
      amount: sql<string>`coalesce(sum(${transaction.amount}), 0)`,
      currency: transaction.currency,
    })
    .from(transaction)
    .where(and(...transactionRangeConditions(userId, params), eq(transaction.type, type)))
    .groupBy(transaction.currency)

  return rows.map((row) => ({
    amount: row.amount,
    currency: row.currency,
  }))
}

export async function getCashflowSummary(
  userId: string,
  params: DashboardParams,
) {
  const totalIncome = await getTotalsByType(userId, params, "INCOME")
  const totalExpense = await getTotalsByType(userId, params, "EXPENSE")

  return {
    totalIncome,
    totalExpense,
    netCashflow: getNetCashflowByCurrency(totalIncome, totalExpense),
  }
}

async function getByCategory(
  userId: string,
  params: DashboardParams,
  type: "INCOME" | "EXPENSE",
): Promise<CategorySummary[]> {
  const rows = await db
    .select({
      categoryId: transaction.categoryId,
      categoryName: category.name,
      amount: sql<string>`coalesce(sum(${transaction.amount}), 0)`,
      currency: transaction.currency,
      transactionCount: sql<string>`count(*)`,
    })
    .from(transaction)
    .leftJoin(category, eq(transaction.categoryId, category.id))
    .where(and(...transactionRangeConditions(userId, params), eq(transaction.type, type)))
    .groupBy(transaction.categoryId, category.name, transaction.currency)

  return rows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    amount: row.amount,
    currency: row.currency,
    transactionCount: Number(row.transactionCount),
  }))
}

export async function getSpendingByCategory(
  userId: string,
  params: DashboardParams,
) {
  return getByCategory(userId, params, "EXPENSE")
}

export async function getIncomeByCategory(
  userId: string,
  params: DashboardParams,
) {
  return getByCategory(userId, params, "INCOME")
}

export async function getAccountBalances(userId: string) {
  const accounts = await listFinancialAccounts(userId)
  const balances = await getAccountBalancesForAccounts(userId, accounts)
  const nameByAccountId = new Map(
    accounts.map((account) => [account.id, account.name]),
  )

  return balances.map((balance) => ({
    ...balance,
    name: nameByAccountId.get(balance.accountId) ?? "",
  }))
}

export async function getUpcomingRecurringPayments(
  userId: string,
  params: Pick<DashboardParams, "from" | "to">,
) {
  return generateRecurringPaymentForecast(userId, params)
}

export async function getDashboardSummary(
  userId: string,
  params: DashboardParams,
): Promise<DashboardSummary> {
  const [cashflow, accountBalances, spendingByCategory, incomeByCategory, upcoming] =
    await Promise.all([
      getCashflowSummary(userId, params),
      getAccountBalances(userId),
      getSpendingByCategory(userId, params),
      getIncomeByCategory(userId, params),
      getUpcomingRecurringPayments(userId, params),
    ])

  return {
    ...cashflow,
    accountBalances,
    spendingByCategory,
    incomeByCategory,
    upcomingRecurringPayments: upcoming,
  }
}
