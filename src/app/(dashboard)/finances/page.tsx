import { Suspense, type ReactNode } from "react"

import {
  getAccountBalances,
  getCachedFinancialAccounts,
} from "@/features/accounts/queries"
import { getCachedCategories } from "@/features/categories/queries"
import { FinanceTimezoneInitializer } from "@/features/finances/components/finance-timezone-initializer"
import {
  FinancesHeaderAside,
  FinancesHeaderAsideSkeleton,
  FinancesOverviewStreamingBody,
  FinancesShell,
  FinancesTabBody,
  FinancesTabSkeleton,
} from "@/features/finances/components/finances-page"
import {
  getPeriodRange,
  parseFilterIds,
  parseFinanceTab,
  parseOverviewChartPeriod,
  parsePeriod,
  parseTransactionTypeFilter,
} from "@/features/finances/filters"
import {
  DEFAULT_VISIBLE_TRANSACTION_DAYS,
  DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
} from "@/features/finances/transaction-list"
import {
  createDefaultFinanceSettings,
  getCachedUserFinanceSettings,
} from "@/features/settings/service"
import { listRecurringPayments } from "@/features/recurring-payments/queries"
import {
  listTransactionPage,
  listTransactions,
} from "@/features/transactions/queries"
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

  const accountsPromise = getCachedFinancialAccounts(user.id)
  const categoriesPromise = getCachedCategories(user.id)

  const renderFinances = (aside: ReactNode, children: ReactNode) => (
    <>
      {!existingSettings ? (
        <FinanceTimezoneInitializer
          baseCurrency={settings.baseCurrency}
          monthStartDay={settings.monthStartDay}
          timezone={settings.timezone}
          weekStartsOn={settings.weekStartsOn}
        />
      ) : null}
      <FinancesShell tab={tab} aside={aside}>
        {children}
      </FinancesShell>
    </>
  )

  if (tab === "overview") {
    const transactionsPromise = listTransactions(user.id, transactionFilters)
    const accountBalancesPromise = accountsPromise.then((accounts) =>
      getAccountBalances(user.id, accounts)
    )

    return renderFinances(
      <Suspense fallback={<FinancesHeaderAsideSkeleton tab={tab} />}>
        <OverviewHeaderAside transactionsPromise={transactionsPromise} />
      </Suspense>,
      <FinancesOverviewStreamingBody
        accountBalancesPromise={accountBalancesPromise}
        accountsPromise={accountsPromise}
        categoriesPromise={categoriesPromise}
        chartPeriod={chartPeriod}
        financeSettings={settings}
        transactionsPromise={transactionsPromise}
      />
    )
  }

  if (tab === "transactions") {
    const transactionPagePromise = listTransactionPage(
      user.id,
      transactionFilters,
      {
        timezone: settings.timezone,
        transactionsPerDay: DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
        visibleDays: DEFAULT_VISIBLE_TRANSACTION_DAYS,
      }
    )
    const accountBalancesPromise = accountsPromise.then((accounts) =>
      getAccountBalances(user.id, accounts)
    )

    return renderFinances(
      <Suspense fallback={<FinancesHeaderAsideSkeleton tab={tab} />}>
        <TransactionsHeaderAside
          transactionPagePromise={transactionPagePromise}
        />
      </Suspense>,
      <Suspense
        key={JSON.stringify(query)}
        fallback={<FinancesTabSkeleton tab={tab} />}
      >
        <TransactionsTabContent
          accountBalancesPromise={accountBalancesPromise}
          accountsPromise={accountsPromise}
          categoriesPromise={categoriesPromise}
          chartPeriod={chartPeriod}
          financeSettings={settings}
          filters={{ accountIds, categoryIds, period, type }}
          tab={tab}
          timezone={settings.timezone}
          transactionFilters={transactionFilters}
          transactionPagePromise={transactionPagePromise}
        />
      </Suspense>
    )
  }

  if (tab === "recurring") {
    const recurringPaymentsPromise = listRecurringPayments(user.id, {
      includeInactive: true,
    })

    return renderFinances(
      <Suspense fallback={<FinancesHeaderAsideSkeleton tab={tab} />}>
        <RecurringHeaderAside
          recurringPaymentsPromise={recurringPaymentsPromise}
        />
      </Suspense>,
      <Suspense
        key={JSON.stringify(query)}
        fallback={<FinancesTabSkeleton tab={tab} />}
      >
        <RecurringTabContent
          accountsPromise={accountsPromise}
          categoriesPromise={categoriesPromise}
          chartPeriod={chartPeriod}
          financeSettings={settings}
          filters={{ accountIds, categoryIds, period, type }}
          recurringPaymentsPromise={recurringPaymentsPromise}
          tab={tab}
          timezone={settings.timezone}
          transactionFilters={transactionFilters}
        />
      </Suspense>
    )
  }

  const accountBalancesPromise = accountsPromise.then((accounts) =>
    getAccountBalances(user.id, accounts)
  )

  return renderFinances(
    <FinancesHeaderAside tab={tab} />,
    <Suspense
      key={JSON.stringify(query)}
      fallback={<FinancesTabSkeleton tab={tab} />}
    >
      <ManageTabContent
        accountBalancesPromise={accountBalancesPromise}
        accountsPromise={accountsPromise}
        categoriesPromise={categoriesPromise}
        chartPeriod={chartPeriod}
        financeSettings={settings}
        filters={{ accountIds, categoryIds, period, type }}
        tab={tab}
        timezone={settings.timezone}
        transactionFilters={transactionFilters}
      />
    </Suspense>
  )
}

async function OverviewHeaderAside({
  transactionsPromise,
}: {
  transactionsPromise: ReturnType<typeof listTransactions>
}) {
  const transactions = await transactionsPromise

  return (
    <FinancesHeaderAside
      tab="overview"
      transactionCount={transactions.length}
    />
  )
}

async function TransactionsHeaderAside({
  transactionPagePromise,
}: {
  transactionPagePromise: ReturnType<typeof listTransactionPage>
}) {
  const transactionPage = await transactionPagePromise

  return (
    <FinancesHeaderAside
      tab="transactions"
      transactionCount={transactionPage.transactions.length}
    />
  )
}

async function RecurringHeaderAside({
  recurringPaymentsPromise,
}: {
  recurringPaymentsPromise: ReturnType<typeof listRecurringPayments>
}) {
  const recurringPayments = await recurringPaymentsPromise

  return (
    <FinancesHeaderAside
      recurringCount={recurringPayments.length}
      tab="recurring"
    />
  )
}

async function TransactionsTabContent({
  accountBalancesPromise,
  accountsPromise,
  categoriesPromise,
  chartPeriod,
  financeSettings,
  filters,
  tab,
  timezone,
  transactionFilters,
  transactionPagePromise,
}: {
  accountBalancesPromise: ReturnType<typeof getAccountBalances>
  accountsPromise: ReturnType<typeof getCachedFinancialAccounts>
  categoriesPromise: ReturnType<typeof getCachedCategories>
  chartPeriod: ReturnType<typeof parseOverviewChartPeriod>
  financeSettings: Parameters<typeof FinancesTabBody>[0]["financeSettings"]
  filters: Parameters<typeof FinancesTabBody>[0]["filters"]
  tab: "transactions"
  timezone: string
  transactionFilters: unknown
  transactionPagePromise: ReturnType<typeof listTransactionPage>
}) {
  const [accounts, categories, accountBalances, transactionPage] =
    await Promise.all([
      accountsPromise,
      categoriesPromise,
      accountBalancesPromise,
      transactionPagePromise,
    ])

  return (
    <FinancesTabBody
      accounts={accounts}
      accountBalances={accountBalances}
      categories={categories}
      chartPeriod={chartPeriod}
      financeSettings={financeSettings}
      filters={filters}
      hasMoreTransactionDays={transactionPage.hasMoreDays}
      nextTransactionDayOffset={transactionPage.nextDayOffset}
      tab={tab}
      timezone={timezone}
      transactionFilters={transactionFilters}
      transactions={transactionPage.transactions}
    />
  )
}

async function RecurringTabContent({
  accountsPromise,
  categoriesPromise,
  chartPeriod,
  financeSettings,
  filters,
  recurringPaymentsPromise,
  tab,
  timezone,
  transactionFilters,
}: {
  accountsPromise: ReturnType<typeof getCachedFinancialAccounts>
  categoriesPromise: ReturnType<typeof getCachedCategories>
  chartPeriod: ReturnType<typeof parseOverviewChartPeriod>
  financeSettings: Parameters<typeof FinancesTabBody>[0]["financeSettings"]
  filters: Parameters<typeof FinancesTabBody>[0]["filters"]
  recurringPaymentsPromise: ReturnType<typeof listRecurringPayments>
  tab: "recurring"
  timezone: string
  transactionFilters: unknown
}) {
  const [accounts, categories, recurringPayments] = await Promise.all([
    accountsPromise,
    categoriesPromise,
    recurringPaymentsPromise,
  ])

  return (
    <FinancesTabBody
      accounts={accounts}
      accountBalances={[]}
      categories={categories}
      chartPeriod={chartPeriod}
      financeSettings={financeSettings}
      filters={filters}
      recurringPayments={recurringPayments}
      tab={tab}
      timezone={timezone}
      transactionFilters={transactionFilters}
      transactions={[]}
    />
  )
}

async function ManageTabContent({
  accountBalancesPromise,
  accountsPromise,
  categoriesPromise,
  chartPeriod,
  financeSettings,
  filters,
  tab,
  timezone,
  transactionFilters,
}: {
  accountBalancesPromise: ReturnType<typeof getAccountBalances>
  accountsPromise: ReturnType<typeof getCachedFinancialAccounts>
  categoriesPromise: ReturnType<typeof getCachedCategories>
  chartPeriod: ReturnType<typeof parseOverviewChartPeriod>
  financeSettings: Parameters<typeof FinancesTabBody>[0]["financeSettings"]
  filters: Parameters<typeof FinancesTabBody>[0]["filters"]
  tab: "manage"
  timezone: string
  transactionFilters: unknown
}) {
  const [accounts, categories, accountBalances] = await Promise.all([
    accountsPromise,
    categoriesPromise,
    accountBalancesPromise,
  ])

  return (
    <FinancesTabBody
      accounts={accounts}
      accountBalances={accountBalances}
      categories={categories}
      chartPeriod={chartPeriod}
      financeSettings={financeSettings}
      filters={filters}
      tab={tab}
      timezone={timezone}
      transactionFilters={transactionFilters}
      transactions={[]}
    />
  )
}
