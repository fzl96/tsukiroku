import Link from "next/link"

import type { Category, FinancialAccount, Transaction } from "@/db/schema"
import {
  AccountCardMenu,
  NewAccountButton,
} from "@/features/finances/components/account-management"
import { NewCategoryButton } from "@/features/finances/components/category-management"
import {
  type FinancePeriod,
  type FinanceTransactionTypeFilter,
  groupCategoriesByKind,
  periodOptions,
  toggleFilterId,
  transactionTypeFilterOptions,
} from "@/features/finances/filters"
import { cn } from "@/lib/utils"

type FinancesPageProps = {
  accounts: FinancialAccount[]
  accountBalances: Array<{
    accountId: string
    amount: string
    currency: string
  }>
  categories: Category[]
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
  const value = Number(amount)
  const signedValue = type === "EXPENSE" ? -value : value

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(signedValue)
  } catch {
    return `${signedValue.toFixed(2)} ${currency}`
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function getTransactionTitle(
  transaction: Transaction,
  accounts: Map<string, string>
) {
  if (transaction.merchant) {
    return transaction.merchant
  }

  if (transaction.type === "TRANSFER") {
    const destination = transaction.transferAccountId
      ? accounts.get(transaction.transferAccountId)
      : null

    return destination ? `Transfer to ${destination}` : "Transfer"
  }

  return transaction.note ?? "Untitled transaction"
}

function getGroupLabel(date: Date) {
  const today = new Date()
  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round(
    (target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diff === 0) {
    return "Today"
  }

  if (diff === -1) {
    return "Yesterday"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function groupTransactions(transactions: Transaction[]) {
  return transactions.reduce<
    Array<{ label: string; transactions: Transaction[] }>
  >((groups, transaction) => {
    const label = getGroupLabel(transaction.occurredAt)
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

function TransactionActionLink() {
  return (
    <Link
      href="/finances/transaction/new"
      className="inline-flex h-8 items-center border border-transparent px-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground"
    >
      + New Transaction
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
  transactions,
  filters,
}: FinancesPageProps) {
  const accountNames = new Map(
    accounts.map((account) => [account.id, account.name])
  )
  const categoryById = new Map(categories.map((item) => [item.id, item]))
  const groupedTransactions = groupTransactions(transactions)
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

        <section className="space-y-4 border-b border-border py-10">
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
                  accountIds: toggleFilterId(filters.accountIds, account.id),
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
            <TransactionActionLink />
          </div>
          <AccountCards
            accounts={accounts}
            balances={accountBalances}
            selectedAccountIds={filters.accountIds}
          />
        </section>

        <section className="py-6">
          {groupedTransactions.length ? (
            <div className="space-y-10">
              {groupedTransactions.map((group) => (
                <div key={group.label}>
                  <div className="mb-5 border-b border-border pb-3">
                    <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                      {group.label} · {group.transactions.length}
                    </p>
                  </div>
                  <div className="space-y-5">
                    {group.transactions.map((transaction) => {
                      const category = transaction.categoryId
                        ? categoryById.get(transaction.categoryId)
                        : null
                      const accountName =
                        accountNames.get(transaction.accountId) ??
                        "Unknown account"

                      return (
                        <article
                          key={transaction.id}
                          className="grid grid-cols-[24px_1fr_auto] items-start gap-4"
                        >
                          <span className="mt-1 size-5 border border-border" />
                          <div className="min-w-0">
                            <h2 className="truncate text-base leading-6">
                              {getTransactionTitle(transaction, accountNames)}
                            </h2>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                              <span className="inline-flex items-center gap-2">
                                {category?.color ? (
                                  <span
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <span
                                    className="size-2 rounded-full bg-chart-2"
                                    aria-hidden="true"
                                  />
                                )}
                                {category?.name ?? accountName}
                              </span>
                              <span>{transaction.type}</span>
                              <span>{transaction.status}</span>
                              <span>{formatDate(transaction.occurredAt)}</span>
                            </div>
                          </div>
                          <p
                            className={cn(
                              "pt-0.5 text-right font-mono text-sm",
                              transaction.type === "EXPENSE"
                                ? "text-destructive"
                                : "text-chart-2"
                            )}
                          >
                            {formatCurrency(
                              transaction.amount,
                              transaction.currency,
                              transaction.type
                            )}
                          </p>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
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
