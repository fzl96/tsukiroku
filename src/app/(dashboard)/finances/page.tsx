import { listFinancialAccounts } from "@/features/accounts/queries"
import { getAccountBalance } from "@/features/accounts/service"
import { listCategories } from "@/features/categories/queries"
import { FinanceTimezoneInitializer } from "@/features/finances/components/finance-timezone-initializer"
import { FinancesPage } from "@/features/finances/components/finances-page"
import {
  getPeriodRange,
  parseFilterIds,
  parsePeriod,
  parseTransactionTypeFilter,
} from "@/features/finances/filters"
import {
  createDefaultFinanceSettings,
  getUserFinanceSettings,
} from "@/features/settings/service"
import { listTransactions } from "@/features/transactions/queries"
import { requireUser } from "@/lib/auth"

type FinancesSearchParams = Promise<{
  accountId?: string | string[]
  categoryId?: string | string[]
  period?: string | string[]
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

  const [accounts, categories, transactions] = await Promise.all([
    listFinancialAccounts(user.id),
    listCategories(user.id),
    listTransactions(user.id, transactionFilters),
  ])
  const accountBalances = await Promise.all(
    accounts.map((account) => getAccountBalance(user.id, account.id))
  )

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
        timezone={settings.timezone}
        transactions={transactions}
        filters={{ accountIds, categoryIds, period, type }}
      />
    </>
  )
}
