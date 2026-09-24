import type {
  Category,
  FinancialAccount,
  RecurringPayment,
  Transaction,
  UserFinanceSettings,
} from "@/db/schema"

export type FinancePatch = {
  account?: FinancialAccount
  category?: Category
  transaction?: Transaction
  recurringPayment?: RecurringPayment
  settings?: UserFinanceSettings
}
