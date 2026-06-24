import { listFinancialAccounts } from "@/features/accounts/queries"
import { getAccountBalance } from "@/features/accounts/service"
import { listCategories } from "@/features/categories/queries"
import { FinanceTimezoneInitializer } from "@/features/finances/components/finance-timezone-initializer"
import { NewTransactionPage } from "@/features/finances/components/new-transaction-page"
import {
  createDefaultFinanceSettings,
  getUserFinanceSettings,
} from "@/features/settings/service"
import { requireUser } from "@/lib/auth"

export default async function NewTransactionRoute() {
  const user = await requireUser()
  const existingSettings = await getUserFinanceSettings(user.id)
  const settings =
    existingSettings ?? (await createDefaultFinanceSettings(user.id))
  const [accounts, categories] = await Promise.all([
    listFinancialAccounts(user.id),
    listCategories(user.id),
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
      <NewTransactionPage
        accountBalances={accountBalances}
        accounts={accounts}
        categories={categories}
        timezone={settings.timezone}
      />
    </>
  )
}
