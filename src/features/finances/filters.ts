import {
  getZonedMonthRange,
  getZonedWeekRange,
  getZonedYearRange,
} from "@/lib/timezone"

export const periodOptions = ["all", "week", "month", "year"] as const
export const financeTabOptions = [
  "overview",
  "transactions",
  "recurring",
  "setup",
] as const
export const transactionTypeFilterOptions = [
  "all",
  "INCOME",
  "EXPENSE",
  "TRANSFER",
] as const

export type FinancePeriod = (typeof periodOptions)[number]
export type FinanceTab = (typeof financeTabOptions)[number]
export type FinanceTransactionTypeFilter =
  (typeof transactionTypeFilterOptions)[number]

export type PeriodRange = {
  from: Date
  toExclusive: Date
}

type CategoryLike = {
  kind: "INCOME" | "EXPENSE"
}

export function parsePeriod(
  value: string | string[] | undefined
): FinancePeriod {
  if (typeof value !== "string") {
    return "all"
  }

  return periodOptions.includes(value as FinancePeriod)
    ? (value as FinancePeriod)
    : "all"
}

export function parseFinanceTab(
  value: string | string[] | undefined
): FinanceTab {
  if (typeof value !== "string") {
    return "transactions"
  }

  return financeTabOptions.includes(value as FinanceTab)
    ? (value as FinanceTab)
    : "transactions"
}

export function parseTransactionTypeFilter(
  value: string | string[] | undefined
): FinanceTransactionTypeFilter {
  if (typeof value !== "string") {
    return "all"
  }

  return transactionTypeFilterOptions.includes(
    value as FinanceTransactionTypeFilter
  )
    ? (value as FinanceTransactionTypeFilter)
    : "all"
}

export function parseFilterIds(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : []

  return [...new Set(values.map((item) => item.trim()).filter(Boolean))]
}

export function toggleFilterId(ids: readonly string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

export function getPeriodRange(
  period: FinancePeriod,
  now = new Date(),
  options?: {
    monthStartDay?: number
    timezone?: string
    weekStartsOn?: number
  }
): PeriodRange | null {
  if (period === "all") {
    return null
  }

  if (options?.timezone) {
    if (period === "week") {
      const range = getZonedWeekRange(
        now,
        options.timezone,
        options.weekStartsOn ?? 1
      )
      return { from: range.startUtc, toExclusive: range.endUtc }
    }

    if (period === "month") {
      const range = getZonedMonthRange(
        now,
        options.timezone,
        options.monthStartDay ?? 1
      )
      return { from: range.startUtc, toExclusive: range.endUtc }
    }

    const range = getZonedYearRange(now, options.timezone)
    return { from: range.startUtc, toExclusive: range.endUtc }
  }

  if (period === "week") {
    const day = now.getDay()
    const daysSinceMonday = (day + 6) % 7
    const from = new Date(now)
    from.setDate(now.getDate() - daysSinceMonday)
    from.setHours(0, 0, 0, 0)

    const to = new Date(from)
    to.setDate(from.getDate() + 7)

    return { from, toExclusive: to }
  }

  if (period === "month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      toExclusive: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
        0,
        0,
        0,
        0
      ),
    }
  }

  return {
    from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
    toExclusive: new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0),
  }
}

export function groupCategoriesByKind<TCategory extends CategoryLike>(
  categories: readonly TCategory[]
) {
  return {
    income: categories.filter((category) => category.kind === "INCOME"),
    expense: categories.filter((category) => category.kind === "EXPENSE"),
  }
}
