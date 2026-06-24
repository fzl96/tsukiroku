import Link from "next/link"
import { addDays } from "date-fns"

import type { Category, FinancialAccount, Transaction } from "@/db/schema"
import {
  AccountCardMenu,
  NewAccountButton,
} from "@/features/finances/components/account-management"
import { NewCategoryButton } from "@/features/finances/components/category-management"
import { NewTransactionDrawerButton } from "@/features/finances/components/new-transaction-drawer"
import { TransactionList } from "@/features/finances/components/transaction-list"
import {
  type FinancePeriod,
  type FinanceTransactionTypeFilter,
  groupCategoriesByKind,
  periodOptions,
  toggleFilterId,
  transactionTypeFilterOptions,
} from "@/features/finances/filters"
import {
  formatDateForUser,
  getDateInputValueInTimeZone,
  parseUserDateAsUtc,
} from "@/lib/timezone"
import { formatCurrencyAmount } from "@/lib/money"
import { cn } from "@/lib/utils"

type FinancesPageProps = {
  accounts: FinancialAccount[]
  accountBalances: Array<{
    accountId: string
    amount: string
    currency: string
  }>
  categories: Category[]
  timezone: string
  transactions: Transaction[]
  filters: {
    accountIds: string[]
    categoryIds: string[]
    period: FinancePeriod
    type: FinanceTransactionTypeFilter
  }
}

const periodLabels: Record<FinancePeriod, string> = {
  all: "All",
  week: "Week",
  month: "Month",
  year: "Year",
}

const typeLabels: Record<FinanceTransactionTypeFilter, string> = {
  all: "All",
  INCOME: "Income",
  EXPENSE: "Expense",
  TRANSFER: "Transfer",
}

function formatCurrency(
  amount: string,
  currency: string,
  type: Transaction["type"]
) {
  return formatCurrencyAmount(amount, currency, {
    negative: type === "EXPENSE",
  })
}

function getGroupLabel(date: Date, timezone: string) {
  const today = new Date()
  const todayValue = getDateInputValueInTimeZone(today, timezone)
  const yesterdayValue = getDateInputValueInTimeZone(
    addDays(parseUserDateAsUtc(todayValue, timezone), -1),
    timezone
  )
  const targetValue = getDateInputValueInTimeZone(date, timezone)

  if (targetValue === todayValue) {
    return "Today"
  }

  if (targetValue === yesterdayValue) {
    return "Yesterday"
  }

  return formatDateForUser(date, timezone)
}

function groupTransactions(transactions: Transaction[], timezone: string) {
  return transactions.reduce<
    Array<{ label: string; transactions: Transaction[] }>
  >((groups, transaction) => {
    const label = getGroupLabel(transaction.occurredAt, timezone)
    const group = groups.find((item) => item.label === label)

    if (group) {
      group.transactions.push(transaction)
      return groups
    }

    groups.push({ label, transactions: [transaction] })
    return groups
  }, [])
}

function buildHref(
  filters: FinancesPageProps["filters"],
  updates: {
    accountIds?: string[] | null
    categoryIds?: string[] | null
    period?: FinancePeriod | null
    type?: FinanceTransactionTypeFilter | null
  }
) {
  const params = new URLSearchParams()

  const accountIds = updates.accountIds ?? filters.accountIds
  const categoryIds = updates.categoryIds ?? filters.categoryIds
  const period = updates.period ?? filters.period
  const type = updates.type ?? filters.type

  accountIds?.forEach((accountId) => {
    params.append("accountId", accountId)
  })

  categoryIds?.forEach((categoryId) => {
    params.append("categoryId", categoryId)
  })

  if (period !== "all") {
    params.set("period", period)
  }

  if (type !== "all") {
    params.set("type", type)
  }

  const query = params.toString()

  return query ? `/finances?${query}` : "/finances"
}

function FilterLink({
  active,
  children,
  fallbackToneClassName = "bg-chart-2",
  href,
  tone,
}: {
  active: boolean
  children: React.ReactNode
  fallbackToneClassName?: string
  href: string
  tone?: string | null
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-8 items-center gap-2 border border-border px-3 font-mono text-[11px] tracking-[0.14em] text-foreground uppercase transition-colors hover:bg-accent hover:text-accent-foreground",
        active &&
          "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
      )}
    >
      {tone ? (
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: tone }}
          aria-hidden="true"
        />
      ) : fallbackToneClassName ? (
        <span
          className={cn("size-2 rounded-full", fallbackToneClassName)}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </Link>
  )
}

function CategoryFilterRow({
  categories,
  filters,
  label,
}: {
  categories: Category[]
  filters: FinancesPageProps["filters"]
  label: string
}) {
  if (!categories.length) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="mr-2 w-20 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      {categories.map((category) => (
        <FilterLink
          key={category.id}
          href={buildHref(filters, {
            categoryIds: toggleFilterId(filters.categoryIds, category.id),
          })}
          active={filters.categoryIds.includes(category.id)}
          fallbackToneClassName="bg-chart-3"
          tone={category.color}
        >
          {category.name}
        </FilterLink>
      ))}
    </div>
  )
}

function AccountCards({
  accounts,
  balances,
  selectedAccountIds,
}: {
  accounts: FinancialAccount[]
  balances: FinancesPageProps["accountBalances"]
  selectedAccountIds: string[]
}) {
  const balanceByAccountId = new Map(
    balances.map((balance) => [balance.accountId, balance])
  )

  if (!accounts.length) {
    return (
      <div className="border border-dashed border-border p-4">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          No accounts yet
        </p>
      </div>
    )
  }

  const visibleAccounts = selectedAccountIds.length
    ? accounts.filter((account) => selectedAccountIds.includes(account.id))
    : accounts

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {visibleAccounts.map((account) => {
        const balance = balanceByAccountId.get(account.id)

        return (
          <article
            key={account.id}
            className={cn(
              "group relative border border-border p-4 pe-12 transition-colors focus-within:border-foreground hover:border-foreground",
              selectedAccountIds.includes(account.id) && "border-primary"
            )}
          >
            <AccountCardMenu account={account} />
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              <span className="inline-flex items-center gap-2">
                {account.color ? (
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: account.color }}
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="size-2 rounded-full bg-chart-2"
                    aria-hidden="true"
                  />
                )}
                {account.type.replaceAll("_", " ")}
              </span>
            </p>
            <h2 className="mt-3 text-xl leading-6">{account.name}</h2>
            <p className="mt-5 font-heading text-3xl leading-none tracking-tight">
              {formatCurrency(
                balance?.amount ?? account.initialBalance,
                balance?.currency ?? account.currency,
                "INCOME"
              )}
            </p>
            <div className="mt-4 flex items-center justify-between gap-4 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              <span>{account.currency}</span>
              <span>{account.isArchived ? "Archived" : "Active"}</span>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function FinancesPage({
  accountBalances,
  accounts,
  categories,
  timezone,
  transactions,
  filters,
}: FinancesPageProps) {
  const accountNames = new Map(
    accounts.map((account) => [account.id, account.name])
  )
  const categoryById = new Map(categories.map((item) => [item.id, item]))
  const groupedTransactions = groupTransactions(transactions, timezone)
  const activeAccounts = filters.accountIds
    .map((accountId) => accountNames.get(accountId))
    .filter((name): name is string => Boolean(name))
  const activeCategories = filters.categoryIds
    .map((categoryId) => categoryById.get(categoryId)?.name)
    .filter((name): name is string => Boolean(name))
  const groupedCategories = groupCategoriesByKind(categories)

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1180px]">
        <header className="border-b border-border pb-9">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
                Ledger
              </p>
              <h1 className="mt-2 font-heading text-5xl leading-none tracking-tight sm:text-6xl">
                Finances
              </h1>
            </div>
            <p className="pt-10 font-mono text-[12px] tracking-[0.16em] text-muted-foreground uppercase">
              {transactions.length} transactions
            </p>
          </div>
        </header>

        <section className="border-b border-border py-6">
          <details className="group">
            <summary className="inline-flex h-8 cursor-pointer list-none items-center border border-border px-3 font-mono text-[11px] tracking-[0.14em] text-foreground uppercase transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show Filters</span>
              <span className="hidden group-open:inline">Hide Filters</span>
            </summary>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-2 w-20 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                  Period
                </p>
                {periodOptions.map((period) => (
                  <FilterLink
                    key={period}
                    href={buildHref(filters, { period })}
                    active={filters.period === period}
                    fallbackToneClassName=""
                  >
                    {periodLabels[period]}
                  </FilterLink>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-2 w-20 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                  Account
                </p>
                <FilterLink
                  href={buildHref(filters, { accountIds: [] })}
                  active={!filters.accountIds.length}
                  fallbackToneClassName=""
                >
                  All
                </FilterLink>
                {accounts.map((account) => (
                  <FilterLink
                    key={account.id}
                    href={buildHref(filters, {
                      accountIds: toggleFilterId(
                        filters.accountIds,
                        account.id
                      ),
                    })}
                    active={filters.accountIds.includes(account.id)}
                    tone={account.color}
                  >
                    {account.name}
                  </FilterLink>
                ))}
                <NewAccountButton />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-2 w-20 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                  Type
                </p>
                {transactionTypeFilterOptions.map((type) => (
                  <FilterLink
                    key={type}
                    href={buildHref(filters, { type })}
                    active={filters.type === type}
                    fallbackToneClassName=""
                  >
                    {typeLabels[type]}
                  </FilterLink>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-2 w-20 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                  Category
                </p>
                <FilterLink
                  href={buildHref(filters, { categoryIds: [] })}
                  active={!filters.categoryIds.length}
                  fallbackToneClassName=""
                >
                  All
                </FilterLink>
                <NewCategoryButton />
              </div>

              <CategoryFilterRow
                categories={groupedCategories.income}
                filters={filters}
                label="Income"
              />

              <CategoryFilterRow
                categories={groupedCategories.expense}
                filters={filters}
                label="Expense"
              />
            </div>
          </details>
        </section>

        <section className="space-y-6 border-b border-border py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              Showing {periodLabels[filters.period]}
              {filters.type !== "all" ? ` / ${typeLabels[filters.type]}` : ""}
              {activeAccounts.length ? ` / ${activeAccounts.join(", ")}` : ""}
              {activeCategories.length
                ? ` / ${activeCategories.join(", ")}`
                : ""}
            </p>
            <NewTransactionDrawerButton
              accountBalances={accountBalances}
              accounts={accounts}
              categories={categories}
              timezone={timezone}
            />
          </div>
          <AccountCards
            accounts={accounts}
            balances={accountBalances}
            selectedAccountIds={filters.accountIds}
          />
        </section>

        <section className="py-6">
          {groupedTransactions.length ? (
            <TransactionList
              key={[
                filters.period,
                filters.type,
                filters.accountIds.join(","),
                filters.categoryIds.join(","),
              ].join(":")}
              accounts={accounts}
              categories={categories}
              groups={groupedTransactions}
              timezone={timezone}
            />
          ) : (
            <div className="border-b border-border py-14">
              <p className="text-lg">No transactions found.</p>
              <p className="mt-2 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                Adjust the account, category, or period filters.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
