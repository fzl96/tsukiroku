import { listFinancialAccounts } from "@/features/accounts/queries"
import { getAccountBalance } from "@/features/accounts/service"
import { listCategories } from "@/features/categories/queries"
import { FinanceTimezoneInitializer } from "@/features/finances/components/finance-timezone-initializer"
import { FinancesPage } from "@/features/finances/components/finances-page"
import {
  getPeriodRange,
  parseFilterIds,
  parseFinanceTab,
  parseOverviewChartPeriod,
  parsePeriod,
  parseTransactionTypeFilter,
} from "@/features/finances/filters"
import {
  createDefaultFinanceSettings,
  getUserFinanceSettings,
} from "@/features/settings/service"
import { listRecurringPayments } from "@/features/recurring-payments/queries"
import { listTransactions } from "@/features/transactions/queries"
import { requireUser } from "@/lib/auth"

type FinancesSearchParams = Promise<{
  accountId?: string | string[]
  categoryId?: string | string[]
  chartPeriod?: string | string[]
  period?: string | string[]
  tab?: string | string[]
  type?: string | string[]
}>

export default async function FinancesRoute({
  searchParams,
}: {
  searchParams: FinancesSearchParams
}) {
  const user = await requireUser()
  const query = await searchParams
  const existingSettings = await getUserFinanceSettings(user.id)
  const settings =
    existingSettings ?? (await createDefaultFinanceSettings(user.id))
  const tab = parseFinanceTab(query.tab)
  const chartPeriod = parseOverviewChartPeriod(query.chartPeriod)
  const period = parsePeriod(query.period)
  const type = parseTransactionTypeFilter(query.type)
  const periodRange = getPeriodRange(period, new Date(), {
    monthStartDay: settings.monthStartDay,
    timezone: settings.timezone,
    weekStartsOn: settings.weekStartsOn,
  })
  const accountIds = parseFilterIds(query.accountId)
  const categoryIds = parseFilterIds(query.categoryId)

  const transactionFilters = {
    ...(periodRange ?? {}),
    ...(accountIds.length ? { accountIds } : {}),
    ...(categoryIds.length ? { categoryIds } : {}),
    ...(type !== "all" ? { type } : {}),
  }

  const accounts = await listFinancialAccounts(user.id)
  const categories = await listCategories(user.id)
  const recurringPayments = await listRecurringPayments(user.id, {
    includeInactive: true,
  })
  const transactions = await listTransactions(user.id, transactionFilters)
  const accountBalances = []

  for (const account of accounts) {
    accountBalances.push(await getAccountBalance(user.id, account.id))
  }

  return (
    <>
      {!existingSettings ? (
        <FinanceTimezoneInitializer
          baseCurrency={settings.baseCurrency}
          monthStartDay={settings.monthStartDay}
          timezone={settings.timezone}
          weekStartsOn={settings.weekStartsOn}
        />
      ) : null}
      <FinancesPage
        accounts={accounts}
        accountBalances={accountBalances}
        categories={categories}
        financeSettings={settings}
        recurringPayments={recurringPayments}
        timezone={settings.timezone}
        transactions={transactions}
        tab={tab}
        chartPeriod={chartPeriod}
        filters={{ accountIds, categoryIds, period, type }}
      />
    </>
  )
}
