import Link from "next/link"

import type { Category, FinancialAccount, Transaction } from "@/db/schema"
import { type FinancePeriod, periodOptions } from "@/features/finances/filters"
import { cn } from "@/lib/utils"

type FinancesPageProps = {
  accounts: FinancialAccount[]
  categories: Category[]
  transactions: Transaction[]
  filters: {
    accountId?: string
    categoryId?: string
    period: FinancePeriod
  }
}

const periodLabels: Record<FinancePeriod, string> = {
  all: "All",
  week: "Week",
  month: "Month",
  year: "Year",
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
  updates: Partial<Record<keyof FinancesPageProps["filters"], string | null>>
) {
  const params = new URLSearchParams()

  if (filters.accountId) {
    params.set("accountId", filters.accountId)
  }

  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId)
  }

  if (filters.period !== "all") {
    params.set("period", filters.period)
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!value || value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }

  const query = params.toString()

  return query ? `/finances?${query}` : "/finances"
}

function FilterLink({
  active,
  children,
  href,
  tone,
}: {
  active: boolean
  children: React.ReactNode
  href: string
  tone?: string | null
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-8 items-center gap-2 border border-[#ead8d3] px-3 font-mono text-[11px] tracking-[0.14em] text-[#4f4240] uppercase transition-colors hover:bg-[#f1ddd8]",
        active &&
          "border-[#111111] bg-[#111111] text-[#fff9f6] hover:bg-[#111111]"
      )}
    >
      {tone ? (
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: tone }}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </Link>
  )
}

export function FinancesPage({
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
  const activeAccount = filters.accountId
    ? accountNames.get(filters.accountId)
    : null
  const activeCategory = filters.categoryId
    ? categoryById.get(filters.categoryId)?.name
    : null

  return (
    <main className="min-h-screen bg-[#f7e8e4] px-5 py-8 text-[#181313] sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1180px]">
        <header className="border-b border-[#ead8d3] pb-9">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.22em] text-[#8b7a76] uppercase">
                Ledger
              </p>
              <h1 className="mt-2 font-heading text-5xl leading-none tracking-tight sm:text-6xl">
                Finances
              </h1>
            </div>
            <p className="pt-10 font-mono text-[12px] tracking-[0.16em] text-[#8b7a76] uppercase">
              {transactions.length} transactions
            </p>
          </div>
        </header>

        <section className="space-y-4 border-b border-[#ead8d3] py-10">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 w-20 font-mono text-[11px] tracking-[0.18em] text-[#8b7a76] uppercase">
              Period
            </p>
            {periodOptions.map((period) => (
              <FilterLink
                key={period}
                href={buildHref(filters, { period })}
                active={filters.period === period}
              >
                {periodLabels[period]}
              </FilterLink>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 w-20 font-mono text-[11px] tracking-[0.18em] text-[#8b7a76] uppercase">
              Account
            </p>
            <FilterLink
              href={buildHref(filters, { accountId: null })}
              active={!filters.accountId}
            >
              All
            </FilterLink>
            {accounts.map((account) => (
              <FilterLink
                key={account.id}
                href={buildHref(filters, { accountId: account.id })}
                active={filters.accountId === account.id}
                tone="#1f7786"
              >
                {account.name}
              </FilterLink>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 w-20 font-mono text-[11px] tracking-[0.18em] text-[#8b7a76] uppercase">
              Category
            </p>
            <FilterLink
              href={buildHref(filters, { categoryId: null })}
              active={!filters.categoryId}
            >
              All
            </FilterLink>
            {categories.map((category) => (
              <FilterLink
                key={category.id}
                href={buildHref(filters, { categoryId: category.id })}
                active={filters.categoryId === category.id}
                tone={category.color ?? "#8f2b2b"}
              >
                {category.name}
              </FilterLink>
            ))}
          </div>
        </section>

        <section className="border-b border-[#ead8d3] py-6">
          <p className="font-mono text-[11px] tracking-[0.18em] text-[#8b7a76] uppercase">
            Showing {periodLabels[filters.period]}
            {activeAccount ? ` / ${activeAccount}` : ""}
            {activeCategory ? ` / ${activeCategory}` : ""}
          </p>
        </section>

        <section className="py-6">
          {groupedTransactions.length ? (
            <div className="space-y-10">
              {groupedTransactions.map((group) => (
                <div key={group.label}>
                  <div className="mb-5 border-b border-[#ead8d3] pb-3">
                    <p className="font-mono text-[11px] tracking-[0.18em] text-[#8b7a76] uppercase">
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
                          <span className="mt-1 size-5 border border-[#ead8d3]" />
                          <div className="min-w-0">
                            <h2 className="truncate text-base leading-6">
                              {getTransactionTitle(transaction, accountNames)}
                            </h2>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.14em] text-[#8b7a76] uppercase">
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="size-2 rounded-full"
                                  style={{
                                    backgroundColor:
                                      category?.color ?? "#1f7786",
                                  }}
                                />
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
                                ? "text-[#9f321e]"
                                : "text-[#1f7786]"
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
            <div className="border-b border-[#ead8d3] py-14">
              <p className="text-lg">No transactions found.</p>
              <p className="mt-2 font-mono text-[11px] tracking-[0.16em] text-[#8b7a76] uppercase">
                Adjust the account, category, or period filters.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
