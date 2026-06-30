import { Suspense } from "react"

import {
  getAccountBalances,
  getCachedFinancialAccounts,
} from "@/features/accounts/queries"
import { getCachedCategories } from "@/features/categories/queries"
import { FinanceTimezoneInitializer } from "@/features/finances/components/finance-timezone-initializer"
import { FinancesPage } from "@/features/finances/components/finances-page"
import { FinancesPageSkeleton } from "@/features/finances/components/finances-page-skeleton"
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
  getCachedUserFinanceSettings,
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
  const query = await searchParams

  return (
    <Suspense
      key={JSON.stringify(query)}
      fallback={<FinancesPageSkeleton tab={parseFinanceTab(query.tab)} />}
    >
      <FinancesContent query={query} />
    </Suspense>
  )
}

async function FinancesContent({
  query,
}: {
  query: Awaited<FinancesSearchParams>
}) {
  const user = await requireUser()
  const existingSettings = await getCachedUserFinanceSettings(user.id)
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

  // Only the overview and transactions tabs render the transaction list and
  // derived stats; balances are needed everywhere except recurring.
  const needsTransactions = tab === "overview" || tab === "transactions"
  const needsBalances = tab !== "recurring"
  const needsRecurring = tab === "recurring"

  // Always-needed, lightweight reads run together.
  const [accounts, categories] = await Promise.all([
    getCachedFinancialAccounts(user.id),
    getCachedCategories(user.id),
  ])

  // Tab-specific, heavier reads run in parallel and are skipped when the active
  // tab does not render them.
  const [transactions, accountBalances, recurringPayments] = await Promise.all([
    needsTransactions
      ? listTransactions(user.id, transactionFilters)
      : Promise.resolve([]),
    needsBalances
      ? getAccountBalances(user.id, accounts)
      : Promise.resolve([]),
    needsRecurring
      ? listRecurringPayments(user.id, { includeInactive: true })
      : Promise.resolve([]),
  ])

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
