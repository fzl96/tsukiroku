import { addDays } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import Decimal from "decimal.js"

import type { Category, Transaction } from "@/db/schema"
import { formatMoney } from "@/lib/money"
import {
  getDateInputValueInTimeZone,
  getZonedMonthRange,
  getZonedWeekRange,
  getZonedYearRange,
  parseUserDateAsUtc,
} from "@/lib/timezone"

export type CashflowBucket = {
  key: string
  label: string
  income: number
  expense: number
  incomeAmount: string
  expenseAmount: string
}

export type MonthOverviewStats = {
  totalIncome: string
  totalExpense: string
  netCashflow: string
  transactionCount: number
  highestExpense: {
    amount: string
    categoryName: string
    currency: string
    label: string
  } | null
  topExpenseCategory: {
    amount: string
    categoryName: string
    currency: string
    transactionCount: number
  } | null
}

type CashflowAccumulator = {
  income: Decimal
  expense: Decimal
}

function isInRange(date: Date, from: Date, toExclusive: Date) {
  return date >= from && date < toExclusive
}

function createAccumulator() {
  return {
    income: new Decimal(0),
    expense: new Decimal(0),
  }
}

function toBucket(
  key: string,
  label: string,
  accumulator: CashflowAccumulator
): CashflowBucket {
  const expense = accumulator.expense.eq(0)
    ? 0
    : accumulator.expense.negated().toNumber()

  return {
    key,
    label,
    income: accumulator.income.toNumber(),
    expense,
    incomeAmount: formatMoney(accumulator.income),
    expenseAmount: formatMoney(accumulator.expense),
  }
}

function getPostedCashflowTransactions(transactions: readonly Transaction[]) {
  return transactions.filter(
    (transaction) =>
      transaction.status === "POSTED" &&
      (transaction.type === "INCOME" || transaction.type === "EXPENSE")
  )
}

function addToAccumulator(
  accumulator: CashflowAccumulator,
  transaction: Transaction
) {
  if (transaction.type === "INCOME") {
    accumulator.income = accumulator.income.plus(transaction.amount)
  }

  if (transaction.type === "EXPENSE") {
    accumulator.expense = accumulator.expense.plus(transaction.amount)
  }
}

export function buildMonthlyCashflowBuckets(
  transactions: readonly Transaction[],
  now: Date,
  timezone: string
) {
  const year = Number(formatInTimeZone(now, timezone, "yyyy"))
  const range = getZonedYearRange(now, timezone)
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`
    const date = parseUserDateAsUtc(`${key}-01`, timezone)

    return {
      key,
      label: formatInTimeZone(date, timezone, "MMM"),
      accumulator: createAccumulator(),
    }
  })
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  for (const transaction of getPostedCashflowTransactions(transactions)) {
    if (!isInRange(transaction.occurredAt, range.startUtc, range.endUtc)) {
      continue
    }

    const key = formatInTimeZone(transaction.occurredAt, timezone, "yyyy-MM")
    const bucket = bucketByKey.get(key)

    if (bucket) {
      addToAccumulator(bucket.accumulator, transaction)
    }
  }

  return buckets.map((bucket) =>
    toBucket(bucket.key, bucket.label, bucket.accumulator)
  )
}

export function buildWeeklyCashflowBuckets(
  transactions: readonly Transaction[],
  now: Date,
  timezone: string,
  weekStartsOn: number
) {
  const range = getZonedWeekRange(now, timezone, weekStartsOn)
  const startDate = getDateInputValueInTimeZone(range.startUtc, timezone)
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(parseUserDateAsUtc(startDate, timezone), index)
    const key = getDateInputValueInTimeZone(date, timezone)

    return {
      key,
      label: formatInTimeZone(date, timezone, "EEE"),
      accumulator: createAccumulator(),
    }
  })
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  for (const transaction of getPostedCashflowTransactions(transactions)) {
    if (!isInRange(transaction.occurredAt, range.startUtc, range.endUtc)) {
      continue
    }

    const key = getDateInputValueInTimeZone(transaction.occurredAt, timezone)
    const bucket = bucketByKey.get(key)

    if (bucket) {
      addToAccumulator(bucket.accumulator, transaction)
    }
  }

  return buckets.map((bucket) =>
    toBucket(bucket.key, bucket.label, bucket.accumulator)
  )
}

function getTransactionLabel(transaction: Transaction) {
  return (
    transaction.title ??
    transaction.merchant ??
    transaction.note ??
    "Unlabeled expense"
  )
}

export function getMonthOverviewStats(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  now: Date,
  options: {
    monthStartDay: number
    timezone: string
  }
): MonthOverviewStats {
  const range = getZonedMonthRange(now, options.timezone, options.monthStartDay)
  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  )
  const postedTransactions = transactions.filter(
    (transaction) =>
      transaction.status === "POSTED" &&
      isInRange(transaction.occurredAt, range.startUtc, range.endUtc)
  )
  let totalIncome = new Decimal(0)
  let totalExpense = new Decimal(0)
  let highestExpense: MonthOverviewStats["highestExpense"] = null
  const categoryTotals = new Map<
    string,
    {
      amount: Decimal
      categoryName: string
      currency: string
      transactionCount: number
    }
  >()

  for (const transaction of postedTransactions) {
    if (transaction.type === "INCOME") {
      totalIncome = totalIncome.plus(transaction.amount)
      continue
    }

    if (transaction.type !== "EXPENSE") {
      continue
    }

    const amount = new Decimal(transaction.amount)
    const categoryName = transaction.categoryId
      ? (categoryById.get(transaction.categoryId)?.name ?? "Uncategorized")
      : "Uncategorized"

    totalExpense = totalExpense.plus(amount)

    if (!highestExpense || amount.gt(highestExpense.amount)) {
      highestExpense = {
        amount: formatMoney(amount),
        categoryName,
        currency: transaction.currency,
        label: getTransactionLabel(transaction),
      }
    }

    const categoryKey = `${transaction.categoryId ?? "uncategorized"}:${transaction.currency}`
    const categoryTotal = categoryTotals.get(categoryKey) ?? {
      amount: new Decimal(0),
      categoryName,
      currency: transaction.currency,
      transactionCount: 0,
    }

    categoryTotal.amount = categoryTotal.amount.plus(amount)
    categoryTotal.transactionCount += 1
    categoryTotals.set(categoryKey, categoryTotal)
  }

  const topExpenseCategory = [...categoryTotals.values()].reduce<
    MonthOverviewStats["topExpenseCategory"]
  >((topCategory, categoryTotal) => {
    if (!topCategory || categoryTotal.amount.gt(topCategory.amount)) {
      return {
        amount: formatMoney(categoryTotal.amount),
        categoryName: categoryTotal.categoryName,
        currency: categoryTotal.currency,
        transactionCount: categoryTotal.transactionCount,
      }
    }

    return topCategory
  }, null)

  return {
    totalIncome: formatMoney(totalIncome),
    totalExpense: formatMoney(totalExpense),
    netCashflow: formatMoney(totalIncome.minus(totalExpense)),
    transactionCount: postedTransactions.length,
    highestExpense,
    topExpenseCategory,
  }
}
