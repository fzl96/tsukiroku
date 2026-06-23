import { listFinancialAccounts } from "@/features/accounts/queries"
import { getAccountBalance } from "@/features/accounts/service"
import { listCategories } from "@/features/categories/queries"
import { NewTransactionPage } from "@/features/finances/components/new-transaction-page"
import { requireUser } from "@/lib/auth"

export default async function NewTransactionRoute() {
  const user = await requireUser()
  const [accounts, categories] = await Promise.all([
    listFinancialAccounts(user.id),
    listCategories(user.id),
  ])
  const accountBalances = await Promise.all(
    accounts.map((account) => getAccountBalance(user.id, account.id))
  )

  return (
    <NewTransactionPage
      accountBalances={accountBalances}
      accounts={accounts}
      categories={categories}
    />
  )
}
