export const periodOptions = ["all", "week", "month", "year"] as const

export type FinancePeriod = (typeof periodOptions)[number]

export type PeriodRange = {
  from: Date
  to: Date
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

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  )
}

export function getPeriodRange(
  period: FinancePeriod,
  now = new Date()
): PeriodRange | null {
  if (period === "all") {
    return null
  }

  if (period === "week") {
    const day = now.getDay()
    const daysSinceMonday = (day + 6) % 7
    const from = new Date(now)
    from.setDate(now.getDate() - daysSinceMonday)
    from.setHours(0, 0, 0, 0)

    const to = new Date(from)
    to.setDate(from.getDate() + 6)

    return { from, to: endOfDay(to) }
  }

  if (period === "month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    }
  }

  return {
    from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
    to: endOfDay(new Date(now.getFullYear(), 11, 31)),
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
