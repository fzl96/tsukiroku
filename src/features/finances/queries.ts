import { listFinancialAccounts } from "@/features/accounts/queries"
import { listCategories } from "@/features/categories/queries"
import { listTransactions } from "@/features/transactions/queries"
import { listRecurringPayments } from "@/features/recurring-payments/queries"
import { getUserFinanceSettings } from "@/features/settings/service"

// One consistent client cache feeds all four views. The ledger is rendered in
// bounded day groups; switching views and filtering require no round trip.
export async function getFinanceSnapshot(userId: string) {
  const [accounts, categories, transactions, recurringPayments, settings] =
    await Promise.all([
      listFinancialAccounts(userId),
      listCategories(userId),
      listTransactions(userId),
      listRecurringPayments(userId, { includeInactive: true }),
      getUserFinanceSettings(userId),
    ])
  return {
    accounts,
    categories,
    transactions,
    recurringPayments,
    settings: {
      baseCurrency: settings?.baseCurrency ?? "IDR",
      timezone: settings?.timezone ?? "Asia/Jakarta",
      weekStartsOn: settings?.weekStartsOn ?? 1,
      monthStartDay: settings?.monthStartDay ?? 1,
    },
    needsTimezone: !settings,
    userId,
    asOf: new Date(),
  }
}
export type FinanceSnapshot = Awaited<ReturnType<typeof getFinanceSnapshot>>
