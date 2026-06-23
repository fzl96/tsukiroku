import type { RecurringPaymentForecastItem } from "@/features/recurring-payments/schedule"

export type Money = {
  amount: string
  currency: string
}

export type DashboardParams = {
  from: Date
  to: Date
  accountIds?: string[]
  currency?: string
}

export type AccountBalance = Money & {
  accountId: string
  name: string
}

export type CategorySummary = Money & {
  categoryId: string | null
  categoryName: string | null
  transactionCount: number
}

export type CashflowSummary = {
  totalIncome: Money[]
  totalExpense: Money[]
  netCashflow: Money[]
}

export type DashboardSummary = CashflowSummary & {
  accountBalances: AccountBalance[]
  spendingByCategory: CategorySummary[]
  incomeByCategory: CategorySummary[]
  upcomingRecurringPayments: RecurringPaymentForecastItem[]
}
