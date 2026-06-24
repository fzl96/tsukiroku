import Link from "next/link"
import { addDays } from "date-fns"

import type {
  Category,
  FinancialAccount,
  Transaction,
  UserFinanceSettings,
} from "@/db/schema"
import {
  AccountCardMenu,
  NewAccountButton,
} from "@/features/finances/components/account-management"
import { NewCategoryButton } from "@/features/finances/components/category-management"
import { NewTransactionDrawerButton } from "@/features/finances/components/new-transaction-drawer"
import { TransactionList } from "@/features/finances/components/transaction-list"
import {
  type FinanceTab,
  type FinancePeriod,
  type FinanceTransactionTypeFilter,
  groupCategoriesByKind,
  periodOptions,
  toggleFilterId,
  transactionTypeFilterOptions,
} from "@/features/finances/filters"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
  financeSettings: Pick<
    UserFinanceSettings,
    "baseCurrency" | "monthStartDay" | "timezone" | "weekStartsOn"
  >
  tab: FinanceTab
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

const tabLabels: Record<FinanceTab, string> = {
  overview: "Overview",
  transactions: "Transactions",
  recurring: "Recurring Payments",
  setup: "Setup",
}

const weekStartLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

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
    tab?: FinanceTab | null
    type?: FinanceTransactionTypeFilter | null
  }
) {
  const params = new URLSearchParams()

  const accountIds = updates.accountIds ?? filters.accountIds
  const categoryIds = updates.categoryIds ?? filters.categoryIds
  const period = updates.period ?? filters.period
  const tab = updates.tab ?? "transactions"
  const type = updates.type ?? filters.type

  params.set("tab", tab)

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

function buildTabHref(tab: FinanceTab) {
  return `/finances?tab=${tab}`
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

function FinanceTabs({ activeTab }: { activeTab: FinanceTab }) {
  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-border py-5"
      aria-label="Finance sections"
    >
      {Object.entries(tabLabels).map(([tab, label]) => (
        <Link
          key={tab}
          href={buildTabHref(tab as FinanceTab)}
          className={cn(
            "inline-flex h-8 items-center border border-border px-3 font-mono text-[11px] tracking-[0.14em] text-foreground uppercase transition-colors hover:bg-accent hover:text-accent-foreground",
            activeTab === tab &&
              "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

function FilterPanel({
  accounts,
  categories,
  filters,
}: {
  accounts: FinancialAccount[]
  categories: Category[]
  filters: FinancesPageProps["filters"]
}) {
  const groupedCategories = groupCategoriesByKind(categories)

  return (
    <div className="space-y-5">
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
  )
}

function TransactionFilterButton({
  accounts,
  categories,
  filters,
}: {
  accounts: FinancialAccount[]
  categories: Category[]
  filters: FinancesPageProps["filters"]
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center border border-border px-3 font-mono text-[11px] tracking-[0.14em] text-foreground uppercase transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          FILTER
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border pb-5">
          <SheetTitle className="font-heading text-3xl leading-none tracking-tight">
            Filter transactions
          </SheetTitle>
          <SheetDescription>
            Narrow the ledger by period, account, type, or category.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 py-5">
          <FilterPanel
            accounts={accounts}
            categories={categories}
            filters={filters}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PlaceholderPanel({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <section className="border-b border-border py-14">
      <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        Planned
      </p>
      <h2 className="mt-3 text-2xl leading-8">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </section>
  )
}

function TransactionTab({
  accountBalances,
  accounts,
  activeAccounts,
  activeCategories,
  categories,
  filters,
  groupedTransactions,
  timezone,
}: {
  accountBalances: FinancesPageProps["accountBalances"]
  accounts: FinancialAccount[]
  activeAccounts: string[]
  activeCategories: string[]
  categories: Category[]
  filters: FinancesPageProps["filters"]
  groupedTransactions: Array<{ label: string; transactions: Transaction[] }>
  timezone: string
}) {
  return (
    <>
      <section className="space-y-6 border-b border-border py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Showing {periodLabels[filters.period]}
            {filters.type !== "all" ? ` / ${typeLabels[filters.type]}` : ""}
            {activeAccounts.length ? ` / ${activeAccounts.join(", ")}` : ""}
            {activeCategories.length ? ` / ${activeCategories.join(", ")}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <TransactionFilterButton
              accounts={accounts}
              categories={categories}
              filters={filters}
            />
            <NewTransactionDrawerButton
              accountBalances={accountBalances}
              accounts={accounts}
              categories={categories}
              timezone={timezone}
            />
          </div>
        </div>
        {filters.accountIds.length ? (
          <AccountCards
            accounts={accounts}
            balances={accountBalances}
            selectedAccountIds={filters.accountIds}
          />
        ) : null}
      </section>

      <section className="py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Recent transactions
          </p>
        </div>
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
    </>
  )
}

function SetupTab({
  accountBalances,
  accounts,
  categories,
  financeSettings,
}: {
  accountBalances: FinancesPageProps["accountBalances"]
  accounts: FinancialAccount[]
  categories: Category[]
  financeSettings: FinancesPageProps["financeSettings"]
}) {
  const balanceByAccountId = new Map(
    accountBalances.map((balance) => [balance.accountId, balance])
  )
  const groupedCategories = groupCategoriesByKind(categories)

  return (
    <section className="space-y-8 py-6">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                Accounts
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Accounts used by transaction forms and filters.
              </p>
            </div>
            <NewAccountButton />
          </div>

          <div className="border-y border-border">
            {accounts.length ? (
              accounts.map((account) => {
                const balance = balanceByAccountId.get(account.id)

                return (
                  <article
                    key={account.id}
                    className="group relative grid gap-3 border-b border-border py-4 pe-12 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <AccountCardMenu account={account} />
                    <div className="min-w-0">
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
                          {account.type.replaceAll("_", " ")} /{" "}
                          {account.isArchived ? "Archived" : "Active"}
                        </span>
                      </p>
                      <h2 className="mt-2 truncate text-lg leading-6">
                        {account.name}
                      </h2>
                    </div>
                    <p className="font-heading text-2xl leading-none tracking-tight">
                      {formatCurrency(
                        balance?.amount ?? account.initialBalance,
                        balance?.currency ?? account.currency,
                        "INCOME"
                      )}
                    </p>
                  </article>
                )
              })
            ) : (
              <div className="py-8">
                <p className="text-sm text-muted-foreground">
                  No accounts yet.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                  Categories
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Labels for income and expenses.
                </p>
              </div>
              <NewCategoryButton />
            </div>

            <CategorySetupGroup
              categories={groupedCategories.income}
              label="Income"
            />
            <CategorySetupGroup
              categories={groupedCategories.expense}
              label="Expense"
            />
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                Finance settings
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Defaults used for date ranges and money display.
              </p>
            </div>
            <dl className="grid gap-3 border-y border-border py-4">
              <SettingRow
                label="Base currency"
                value={financeSettings.baseCurrency}
              />
              <SettingRow label="Timezone" value={financeSettings.timezone} />
              <SettingRow
                label="Week starts"
                value={
                  weekStartLabels[financeSettings.weekStartsOn] ??
                  String(financeSettings.weekStartsOn)
                }
              />
              <SettingRow
                label="Month starts"
                value={`Day ${financeSettings.monthStartDay}`}
              />
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}

function CategorySetupGroup({
  categories,
  label,
}: {
  categories: Category[]
  label: string
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {categories.length ? (
          categories.map((category) => (
            <span
              key={category.id}
              className="inline-flex h-8 items-center gap-2 border border-border px-3 font-mono text-[11px] tracking-[0.14em] text-foreground uppercase"
            >
              {category.color ? (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
              ) : (
                <span
                  className="size-2 rounded-full bg-muted-foreground"
                  aria-hidden="true"
                />
              )}
              {category.name}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">None yet.</span>
        )}
      </div>
    </div>
  )
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

export function FinancesPage({
  accountBalances,
  accounts,
  categories,
  financeSettings,
  tab,
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
              {tab === "setup"
                ? "Setup"
                : `${transactions.length} transactions`}
            </p>
          </div>
        </header>

        <FinanceTabs activeTab={tab} />

        {tab === "overview" ? (
          <PlaceholderPanel
            title="Overview is coming next."
            description="This tab will summarize balances, cashflow, and spending without exposing every transaction at once."
          />
        ) : null}

        {tab === "transactions" ? (
          <TransactionTab
            accountBalances={accountBalances}
            accounts={accounts}
            activeAccounts={activeAccounts}
            activeCategories={activeCategories}
            categories={categories}
            filters={filters}
            groupedTransactions={groupedTransactions}
            timezone={timezone}
          />
        ) : null}

        {tab === "recurring" ? (
          <PlaceholderPanel
            title="Recurring payments are coming next."
            description="This tab will manage scheduled transaction templates separately from setup data."
          />
        ) : null}

        {tab === "setup" ? (
          <SetupTab
            accountBalances={accountBalances}
            accounts={accounts}
            categories={categories}
            financeSettings={financeSettings}
          />
        ) : null}
      </div>
    </main>
  )
}
