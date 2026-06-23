import { listFinancialAccounts } from "@/features/accounts/queries"
import { listCategories } from "@/features/categories/queries"
import { FinancesPage } from "@/features/finances/components/finances-page"
import { getPeriodRange, parsePeriod } from "@/features/finances/filters"
import { listTransactions } from "@/features/transactions/queries"
import { requireUser } from "@/lib/auth"

type FinancesSearchParams = Promise<{
  accountId?: string | string[]
  categoryId?: string | string[]
  period?: string | string[]
}>

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function FinancesRoute({
  searchParams,
}: {
  searchParams: FinancesSearchParams
}) {
  const user = await requireUser()
  const query = await searchParams
  const period = parsePeriod(query.period)
  const periodRange = getPeriodRange(period)
  const accountId = getFirstParam(query.accountId)
  const categoryId = getFirstParam(query.categoryId)

  const transactionFilters = {
    ...(periodRange ?? {}),
    ...(accountId ? { accountId } : {}),
    ...(categoryId ? { categoryId } : {}),
  }

  const [accounts, categories, transactions] = await Promise.all([
    listFinancialAccounts(user.id),
    listCategories(user.id),
    listTransactions(user.id, transactionFilters),
  ])

  return (
    <FinancesPage
      accounts={accounts}
      categories={categories}
      transactions={transactions}
      filters={{ accountId, categoryId, period }}
    />
  )
}
