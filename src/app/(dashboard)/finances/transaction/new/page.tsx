import { listFinancialAccounts } from "@/features/accounts/queries"
import { listCategories } from "@/features/categories/queries"
import { NewTransactionPage } from "@/features/finances/components/new-transaction-page"
import { requireUser } from "@/lib/auth"

export default async function NewTransactionRoute() {
  const user = await requireUser()
  const [accounts, categories] = await Promise.all([
    listFinancialAccounts(user.id),
    listCategories(user.id),
  ])

  return <NewTransactionPage accounts={accounts} categories={categories} />
}
