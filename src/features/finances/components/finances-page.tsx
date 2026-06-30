import Link from "next/link"
import { Suspense } from "react"
import { addDays } from "date-fns"

import type {
  Category,
  FinancialAccount,
  RecurringPayment,
  Transaction,
  UserFinanceSettings,
} from "@/db/schema"
import {
  AccountCardMenu,
  NewAccountButton,
} from "@/features/finances/components/account-management"
import {
  CategoryActionMenu,
  NewCategoryButton,
} from "@/features/finances/components/category-management"
import { NewTransactionDrawerButton } from "@/features/finances/components/new-transaction-drawer"
import { OverviewCashflowChart } from "@/features/finances/components/overview-cashflow-chart"
import { TransactionList } from "@/features/finances/components/transaction-list"
import {
  type FinanceTab,
  type FinancePeriod,
  type OverviewChartPeriod,
  type FinanceTransactionTypeFilter,
  groupCategoriesByKind,
  periodOptions,
  toggleFilterId,
  transactionTypeFilterOptions,
} from "@/features/finances/filters"
import {
  buildMonthlyCashflowBuckets,
  buildWeeklyCashflowBuckets,
  getMonthExpenseBreakdown,
  getMonthOverviewStats,
  getMonthStatement,
  getNetWorthSummary,
  type ExpenseBreakdownItem,
} from "@/features/finances/overview"
import {
  NewRecurringPaymentButton,
  RecurringPaymentActionButtons,
} from "@/features/recurring-payments/components/recurring-payment-controls"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
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
  recurringPayments?: RecurringPayment[]
  tab: FinanceTab
  chartPeriod?: OverviewChartPeriod
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
  manage: "Manage",
}

const chartPeriodLabels: Record<OverviewChartPeriod, string> = {
  monthly: "Monthly",
  daily: "Daily",
}

const frequencyLabels: Record<RecurringPayment["frequency"], string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
}

const statusLabels: Record<RecurringPayment["status"], string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  CANCELED: "Canceled",
  ENDED: "Ended",
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

function formatExpenseCurrency(amount: string, currency: string) {
  return formatCurrencyAmount(amount, currency, {
    negative: amount !== "0.00",
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

function getBaseCurrencyTransactions(
  transactions: Transaction[],
  baseCurrency: string
) {
  return transactions.filter(
    (transaction) => transaction.currency === baseCurrency
  )
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

function buildOverviewChartHref(period: OverviewChartPeriod) {
  return `/finances?tab=overview&chartPeriod=${period}`
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

function formatShare(share: number) {
  if (share <= 0) {
    return "0%"
  }

  const percent = share * 100

  if (percent < 1) {
    return "<1%"
  }

  return `${Math.round(percent)}%`
}

function NetWorthMasthead({
  amount,
  baseAccountCount,
  baseCurrency,
  otherCurrencyCount,
}: {
  amount: string
  baseAccountCount: number
  baseCurrency: string
  otherCurrencyCount: number
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-border pb-7">
      <div>
        <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
          Net worth
        </p>
        <p className="mt-3 font-heading text-5xl leading-none tracking-tight sm:text-6xl">
          {formatCurrencyAmount(amount, baseCurrency)}
        </p>
      </div>
      <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
        {baseAccountCount} account{baseAccountCount === 1 ? "" : "s"} in{" "}
        {baseCurrency}
        {otherCurrencyCount
          ? ` · ${otherCurrencyCount} held in other currencies`
          : ""}
      </p>
    </div>
  )
}

function MonthStatementFigure({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex-1 px-5 py-4 first:pl-0 sm:border-l sm:border-border sm:first:border-l-0">
      <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl leading-none tracking-tight">
        {value}
      </p>
    </div>
  )
}

function MonthStatement({
  baseCurrency,
  statement,
}: {
  baseCurrency: string
  statement: ReturnType<typeof getMonthStatement>
}) {
  const hasIncome = statement.savingsRate !== null
  const positive = (statement.savingsRate ?? 0) >= 0
  const caption = !hasIncome
    ? "No income recorded this month yet."
    : statement.overspent
      ? `You spent ${Math.abs(
          Math.round(statement.savingsRate ?? 0)
        )}% more than you earned this month.`
      : `You kept ${formatShare(
          (statement.savingsRate ?? 0) / 100
        )} of what you earned this month.`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            This month / statement
          </p>
          <h2 className="mt-2 text-2xl leading-8">In, out, and kept</h2>
        </div>
        {hasIncome ? (
          <span className="inline-flex h-7 items-center border border-border px-3 font-mono text-[11px] tracking-[0.14em] text-foreground uppercase">
            {positive ? "Saved" : "Overspent"}{" "}
            {Math.abs(statement.savingsRate ?? 0)}%
          </span>
        ) : null}
      </div>

      <div className="border-y border-border">
        <div className="flex flex-col sm:flex-row">
          <MonthStatementFigure
            label="Money in"
            value={formatCurrencyAmount(statement.income, baseCurrency)}
          />
          <MonthStatementFigure
            label="Money out"
            value={formatExpenseCurrency(statement.expense, baseCurrency)}
          />
          <MonthStatementFigure
            label="Kept"
            value={formatCurrencyAmount(statement.net, baseCurrency)}
          />
        </div>
      </div>

      <div>
        <div
          className="flex h-3 w-full overflow-hidden border border-border"
          role="img"
          aria-label={caption}
        >
          {hasIncome ? (
            <>
              <div
                className="h-full bg-foreground"
                style={{ width: `${statement.expenseRatio * 100}%` }}
              />
              {!statement.overspent ? (
                <div className="h-full flex-1 bg-foreground opacity-20" />
              ) : null}
            </>
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {caption}
        </p>
      </div>
    </div>
  )
}

function ExpenseBreakdownRow({
  baseCurrency,
  item,
}: {
  baseCurrency: string
  item: ExpenseBreakdownItem
}) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color ?? "var(--muted-foreground)" }}
            aria-hidden="true"
          />
          <span className="truncate text-sm">{item.name}</span>
        </span>
        <span className="flex shrink-0 items-baseline gap-3">
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground tabular-nums">
            {formatShare(item.share)}
          </span>
          <span className="font-heading text-base leading-none tracking-tight">
            {formatExpenseCurrency(item.amount, baseCurrency)}
          </span>
        </span>
      </div>
      <div className="mt-2 h-1 w-full bg-muted">
        <div
          className="h-full bg-foreground"
          style={{ width: `${Math.max(item.share * 100, 1.5)}%` }}
        />
      </div>
    </div>
  )
}

function ExpenseBreakdownPanel({
  baseCurrency,
  breakdown,
}: {
  baseCurrency: string
  breakdown: ReturnType<typeof getMonthExpenseBreakdown>
}) {
  const visible = breakdown.items.slice(0, 6)
  const remaining = breakdown.items.length - visible.length

  return (
    <div className="flex h-full flex-col border border-border p-4">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          Where it went
        </p>
        <p className="font-heading text-lg leading-none tracking-tight">
          {formatExpenseCurrency(breakdown.total, baseCurrency)}
        </p>
      </div>
      {visible.length ? (
        <div className="mt-1">
          {visible.map((item) => (
            <ExpenseBreakdownRow
              key={item.categoryId}
              baseCurrency={baseCurrency}
              item={item}
            />
          ))}
          {remaining > 0 ? (
            <p className="pt-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              + {remaining} more categor{remaining === 1 ? "y" : "ies"}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          No expenses recorded this month.
        </p>
      )}
    </div>
  )
}

function NotableSignals({
  baseCurrency,
  monthStats,
}: {
  baseCurrency: string
  monthStats: ReturnType<typeof getMonthOverviewStats>
}) {
  const rows = [
    {
      label: "Largest single expense",
      value: monthStats.highestExpense
        ? formatExpenseCurrency(
            monthStats.highestExpense.amount,
            monthStats.highestExpense.currency
          )
        : "None",
      detail: monthStats.highestExpense
        ? `${monthStats.highestExpense.label} · ${monthStats.highestExpense.categoryName}`
        : "No expenses this month.",
    },
    {
      label: "Top expense category",
      value: monthStats.topExpenseCategory?.categoryName ?? "None",
      detail: monthStats.topExpenseCategory
        ? `${formatExpenseCurrency(
            monthStats.topExpenseCategory.amount,
            monthStats.topExpenseCategory.currency
          )} · ${monthStats.topExpenseCategory.transactionCount} entr${
            monthStats.topExpenseCategory.transactionCount === 1 ? "y" : "ies"
          }`
        : "Nothing categorized yet.",
    },
    {
      label: "Posted entries",
      value: String(monthStats.transactionCount),
      detail: `Recorded in ${baseCurrency} this month.`,
    },
  ]

  return (
    <div className="grid border-y border-border sm:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="border-b border-border px-5 py-4 first:pl-0 last:border-b-0 sm:border-b-0 sm:border-l sm:border-border sm:first:border-l-0"
        >
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            {row.label}
          </p>
          <p className="mt-2 truncate font-heading text-xl leading-none tracking-tight">
            {row.value}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {row.detail}
          </p>
        </div>
      ))}
    </div>
  )
}

function OverviewNetWorthSkeleton({ baseCurrency }: { baseCurrency: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-border pb-7">
      <div>
        <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
          Net worth
        </p>
        <Skeleton className="mt-3 h-14 w-64 max-w-full sm:h-16" />
      </div>
      <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
        <Skeleton
          className="h-4 w-44"
          aria-label={`Loading ${baseCurrency} accounts`}
        />
      </p>
    </div>
  )
}

function OverviewStatementSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            This month / statement
          </p>
          <h2 className="mt-2 text-2xl leading-8">In, out, and kept</h2>
        </div>
        <Skeleton className="h-7 w-28" />
      </div>

      <div className="border-y border-border">
        <div className="flex flex-col sm:flex-row">
          {["Money in", "Money out", "Kept"].map((label) => (
            <div
              key={label}
              className="flex-1 px-5 py-4 first:pl-0 sm:border-l sm:border-border sm:first:border-l-0"
            >
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                {label}
              </p>
              <Skeleton className="mt-2 h-7 w-28" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-2 h-5 w-72 max-w-full" />
      </div>
    </div>
  )
}

function OverviewCashflowChartSkeleton({
  chartPeriod,
}: {
  chartPeriod: OverviewChartPeriod
}) {
  return (
    <div className="space-y-4 border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Cashflow
          </p>
          <h2 className="mt-2 text-2xl leading-8">Income and expenses</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["monthly", "daily"] as const).map((period) => (
            <FilterLink
              key={period}
              active={chartPeriod === period}
              fallbackToneClassName=""
              href={buildOverviewChartHref(period)}
            >
              {chartPeriodLabels[period]}
            </FilterLink>
          ))}
        </div>
      </div>
      <Skeleton className="min-h-72 w-full" />
    </div>
  )
}

function OverviewExpenseBreakdownSkeleton() {
  return (
    <div className="flex h-full flex-col border border-border p-4">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          Where it went
        </p>
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="mt-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="border-b border-border py-3 last:border-b-0"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2">
                <Skeleton className="size-2 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </span>
              <span className="flex shrink-0 items-baseline gap-3">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-4 w-20" />
              </span>
            </div>
            <Skeleton className="mt-2 h-1 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function OverviewAccountsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Accounts
          </p>
          <h2 className="mt-2 text-2xl leading-8">Where it sits</h2>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article
            key={index}
            className="relative border border-border p-4 pe-12"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-6 w-32" />
            <Skeleton className="mt-5 h-8 w-36" />
            <div className="mt-4 flex items-center justify-between gap-4">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-14" />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function OverviewNotableSignalsSkeleton() {
  const labels = [
    "Largest single expense",
    "Top expense category",
    "Posted entries",
  ]

  return (
    <div className="grid border-y border-border sm:grid-cols-3">
      {labels.map((label) => (
        <div
          key={label}
          className="border-b border-border px-5 py-4 first:pl-0 last:border-b-0 sm:border-b-0 sm:border-l sm:border-border sm:first:border-l-0"
        >
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            {label}
          </p>
          <Skeleton className="mt-2 h-6 w-24" />
          <Skeleton className="mt-2 h-5 w-40 max-w-full" />
        </div>
      ))}
    </div>
  )
}

async function OverviewTransactionCount({
  transactionsPromise,
}: {
  transactionsPromise: Promise<Transaction[]>
}) {
  const transactions = await transactionsPromise

  return (
    <p className="pt-10 font-mono text-[12px] tracking-[0.16em] text-muted-foreground uppercase">
      {transactions.length} transactions
    </p>
  )
}

function OverviewTransactionCountSkeleton() {
  return (
    <p className="pt-10 font-mono text-[12px] tracking-[0.16em] text-muted-foreground uppercase">
      Loading transactions
    </p>
  )
}

async function OverviewNetWorthSection({
  accountBalancesPromise,
  financeSettings,
}: {
  accountBalancesPromise: Promise<FinancesPageProps["accountBalances"]>
  financeSettings: FinancesPageProps["financeSettings"]
}) {
  const accountBalances = await accountBalancesPromise
  const netWorth = getNetWorthSummary(
    accountBalances,
    financeSettings.baseCurrency
  )

  return (
    <NetWorthMasthead
      amount={netWorth.amount}
      baseAccountCount={netWorth.baseAccountCount}
      baseCurrency={financeSettings.baseCurrency}
      otherCurrencyCount={netWorth.otherCurrencyCount}
    />
  )
}

async function OverviewStatementSection({
  financeSettings,
  transactionsPromise,
}: {
  financeSettings: FinancesPageProps["financeSettings"]
  transactionsPromise: Promise<Transaction[]>
}) {
  const transactions = await transactionsPromise
  const monthStats = getMonthOverviewStats(
    getBaseCurrencyTransactions(transactions, financeSettings.baseCurrency),
    [],
    new Date(),
    {
      monthStartDay: financeSettings.monthStartDay,
      timezone: financeSettings.timezone,
    }
  )

  return (
    <MonthStatement
      baseCurrency={financeSettings.baseCurrency}
      statement={getMonthStatement(monthStats)}
    />
  )
}

async function OverviewCashflowChartSection({
  chartPeriod,
  financeSettings,
  transactionsPromise,
}: {
  chartPeriod: OverviewChartPeriod
  financeSettings: FinancesPageProps["financeSettings"]
  transactionsPromise: Promise<Transaction[]>
}) {
  const transactions = await transactionsPromise
  const now = new Date()
  const baseCurrencyTransactions = getBaseCurrencyTransactions(
    transactions,
    financeSettings.baseCurrency
  )
  const chartData =
    chartPeriod === "daily"
      ? buildWeeklyCashflowBuckets(
          baseCurrencyTransactions,
          now,
          financeSettings.timezone,
          financeSettings.weekStartsOn
        )
      : buildMonthlyCashflowBuckets(
          baseCurrencyTransactions,
          now,
          financeSettings.timezone
        )

  return (
    <div className="space-y-4 border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Cashflow
          </p>
          <h2 className="mt-2 text-2xl leading-8">Income and expenses</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["monthly", "daily"] as const).map((period) => (
            <FilterLink
              key={period}
              active={chartPeriod === period}
              fallbackToneClassName=""
              href={buildOverviewChartHref(period)}
            >
              {chartPeriodLabels[period]}
            </FilterLink>
          ))}
        </div>
      </div>
      <OverviewCashflowChart
        currency={financeSettings.baseCurrency}
        data={chartData}
      />
    </div>
  )
}

async function OverviewExpenseBreakdownSection({
  categoriesPromise,
  financeSettings,
  transactionsPromise,
}: {
  categoriesPromise: Promise<Category[]>
  financeSettings: FinancesPageProps["financeSettings"]
  transactionsPromise: Promise<Transaction[]>
}) {
  const [categories, transactions] = await Promise.all([
    categoriesPromise,
    transactionsPromise,
  ])
  const expenseBreakdown = getMonthExpenseBreakdown(
    getBaseCurrencyTransactions(transactions, financeSettings.baseCurrency),
    categories,
    new Date(),
    {
      monthStartDay: financeSettings.monthStartDay,
      timezone: financeSettings.timezone,
    }
  )

  return (
    <>
      <ExpenseBreakdownPanel
        baseCurrency={financeSettings.baseCurrency}
        breakdown={expenseBreakdown}
      />
    </>
  )
}

async function OverviewAccountsSection({
  accountBalancesPromise,
  accountsPromise,
}: {
  accountBalancesPromise: Promise<FinancesPageProps["accountBalances"]>
  accountsPromise: Promise<FinancialAccount[]>
}) {
  const [accounts, accountBalances] = await Promise.all([
    accountsPromise,
    accountBalancesPromise,
  ])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Accounts
          </p>
          <h2 className="mt-2 text-2xl leading-8">Where it sits</h2>
        </div>
      </div>
      <AccountCards
        accounts={accounts}
        balances={accountBalances}
        selectedAccountIds={[]}
      />
    </div>
  )
}

async function OverviewNotableSignalsSection({
  categoriesPromise,
  financeSettings,
  transactionsPromise,
}: {
  categoriesPromise: Promise<Category[]>
  financeSettings: FinancesPageProps["financeSettings"]
  transactionsPromise: Promise<Transaction[]>
}) {
  const [categories, transactions] = await Promise.all([
    categoriesPromise,
    transactionsPromise,
  ])
  const monthStats = getMonthOverviewStats(
    getBaseCurrencyTransactions(transactions, financeSettings.baseCurrency),
    categories,
    new Date(),
    {
      monthStartDay: financeSettings.monthStartDay,
      timezone: financeSettings.timezone,
    }
  )

  return (
    <NotableSignals
      baseCurrency={financeSettings.baseCurrency}
      monthStats={monthStats}
    />
  )
}

function OverviewTab({
  accountBalances,
  accounts,
  categories,
  chartPeriod,
  financeSettings,
  transactions,
}: {
  accountBalances: FinancesPageProps["accountBalances"]
  accounts: FinancialAccount[]
  categories: Category[]
  chartPeriod: OverviewChartPeriod
  financeSettings: FinancesPageProps["financeSettings"]
  transactions: Transaction[]
}) {
  const now = new Date()
  const baseCurrencyTransactions = getBaseCurrencyTransactions(
    transactions,
    financeSettings.baseCurrency
  )
  const chartData =
    chartPeriod === "daily"
      ? buildWeeklyCashflowBuckets(
          baseCurrencyTransactions,
          now,
          financeSettings.timezone,
          financeSettings.weekStartsOn
        )
      : buildMonthlyCashflowBuckets(
          baseCurrencyTransactions,
          now,
          financeSettings.timezone
        )
  const monthStats = getMonthOverviewStats(
    baseCurrencyTransactions,
    categories,
    now,
    {
      monthStartDay: financeSettings.monthStartDay,
      timezone: financeSettings.timezone,
    }
  )
  const statement = getMonthStatement(monthStats)
  const netWorth = getNetWorthSummary(
    accountBalances,
    financeSettings.baseCurrency
  )
  const expenseBreakdown = getMonthExpenseBreakdown(
    baseCurrencyTransactions,
    categories,
    now,
    {
      monthStartDay: financeSettings.monthStartDay,
      timezone: financeSettings.timezone,
    }
  )

  return (
    <section className="space-y-10 py-6">
      <NetWorthMasthead
        amount={netWorth.amount}
        baseAccountCount={netWorth.baseAccountCount}
        baseCurrency={financeSettings.baseCurrency}
        otherCurrencyCount={netWorth.otherCurrencyCount}
      />

      <MonthStatement
        baseCurrency={financeSettings.baseCurrency}
        statement={statement}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4 border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                Cashflow
              </p>
              <h2 className="mt-2 text-2xl leading-8">Income and expenses</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["monthly", "daily"] as const).map((period) => (
                <FilterLink
                  key={period}
                  active={chartPeriod === period}
                  fallbackToneClassName=""
                  href={buildOverviewChartHref(period)}
                >
                  {chartPeriodLabels[period]}
                </FilterLink>
              ))}
            </div>
          </div>
          <OverviewCashflowChart
            currency={financeSettings.baseCurrency}
            data={chartData}
          />
        </div>

        <ExpenseBreakdownPanel
          baseCurrency={financeSettings.baseCurrency}
          breakdown={expenseBreakdown}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              Accounts
            </p>
            <h2 className="mt-2 text-2xl leading-8">Where it sits</h2>
          </div>
        </div>
        <AccountCards
          accounts={accounts}
          balances={accountBalances}
          selectedAccountIds={[]}
        />
      </div>

      <NotableSignals
        baseCurrency={financeSettings.baseCurrency}
        monthStats={monthStats}
      />
    </section>
  )
}

function FinancesShell({
  aside,
  children,
  tab,
}: React.PropsWithChildren<{
  aside?: React.ReactNode
  tab: FinanceTab
}>) {
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
            {aside}
          </div>
        </header>

        <FinanceTabs activeTab={tab} />

        {children}
      </div>
    </main>
  )
}

export function FinancesOverviewStreamingPage({
  accountBalancesPromise,
  accountsPromise,
  categoriesPromise,
  chartPeriod,
  financeSettings,
  transactionsPromise,
}: {
  accountBalancesPromise: Promise<FinancesPageProps["accountBalances"]>
  accountsPromise: Promise<FinancialAccount[]>
  categoriesPromise: Promise<Category[]>
  chartPeriod: OverviewChartPeriod
  financeSettings: FinancesPageProps["financeSettings"]
  transactionsPromise: Promise<Transaction[]>
}) {
  return (
    <FinancesShell
      tab="overview"
      aside={
        <Suspense fallback={<OverviewTransactionCountSkeleton />}>
          <OverviewTransactionCount transactionsPromise={transactionsPromise} />
        </Suspense>
      }
    >
      <section className="space-y-10 py-6">
        <Suspense
          fallback={
            <OverviewNetWorthSkeleton
              baseCurrency={financeSettings.baseCurrency}
            />
          }
        >
          <OverviewNetWorthSection
            accountBalancesPromise={accountBalancesPromise}
            financeSettings={financeSettings}
          />
        </Suspense>

        <Suspense fallback={<OverviewStatementSkeleton />}>
          <OverviewStatementSection
            financeSettings={financeSettings}
            transactionsPromise={transactionsPromise}
          />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Suspense
            fallback={
              <OverviewCashflowChartSkeleton chartPeriod={chartPeriod} />
            }
          >
            <OverviewCashflowChartSection
              chartPeriod={chartPeriod}
              financeSettings={financeSettings}
              transactionsPromise={transactionsPromise}
            />
          </Suspense>

          <Suspense fallback={<OverviewExpenseBreakdownSkeleton />}>
            <OverviewExpenseBreakdownSection
              categoriesPromise={categoriesPromise}
              financeSettings={financeSettings}
              transactionsPromise={transactionsPromise}
            />
          </Suspense>
        </div>

        <Suspense fallback={<OverviewAccountsSkeleton />}>
          <OverviewAccountsSection
            accountBalancesPromise={accountBalancesPromise}
            accountsPromise={accountsPromise}
          />
        </Suspense>

        <Suspense fallback={<OverviewNotableSignalsSkeleton />}>
          <OverviewNotableSignalsSection
            categoriesPromise={categoriesPromise}
            financeSettings={financeSettings}
            transactionsPromise={transactionsPromise}
          />
        </Suspense>
      </section>
    </FinancesShell>
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
      <section className="sticky top-0 z-20 bg-background py-6">
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
      </section>

      {filters.accountIds.length ? (
        <section className="pb-6">
          <AccountCards
            accounts={accounts}
            balances={accountBalances}
            selectedAccountIds={filters.accountIds}
          />
        </section>
      ) : null}

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
    </>
  )
}

function ManageTab({
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

            <CategoryManageGroup
              categories={groupedCategories.income}
              label="Income"
            />
            <CategoryManageGroup
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

function formatRecurringCadence(recurringPayment: RecurringPayment) {
  const label = frequencyLabels[recurringPayment.frequency]

  if (recurringPayment.intervalCount === 1) {
    return label
  }

  return `Every ${recurringPayment.intervalCount} ${label.toLowerCase()} periods`
}

function RecurringPaymentsTab({
  accounts,
  categories,
  recurringPayments,
  timezone,
}: {
  accounts: FinancialAccount[]
  categories: Category[]
  recurringPayments: RecurringPayment[]
  timezone: string
}) {
  const accountById = new Map(accounts.map((account) => [account.id, account]))
  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  )
  const activeCount = recurringPayments.filter(
    (payment) => payment.status === "ACTIVE"
  ).length
  const nextPayment = recurringPayments.find(
    (payment) => payment.status === "ACTIVE"
  )

  return (
    <section className="space-y-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Scheduled templates
          </p>
          <h2 className="mt-2 text-2xl leading-8">Recurring payments</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track subscriptions, bills, and repeating income before they become
            ledger entries.
          </p>
        </div>
        <NewRecurringPaymentButton
          accounts={accounts}
          categories={categories}
          timezone={timezone}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-border p-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            Active
          </p>
          <p className="mt-3 font-heading text-3xl leading-none tracking-tight">
            {activeCount}
          </p>
        </div>
        <div className="border border-border p-4 md:col-span-2">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            Next due
          </p>
          <p className="mt-3 text-lg">
            {nextPayment
              ? `${nextPayment.name} / ${formatDateForUser(
                  nextPayment.nextDueDate,
                  timezone
                )}`
              : "No active recurring payments"}
          </p>
        </div>
      </div>

      <div className="border-y border-border">
        {recurringPayments.length ? (
          recurringPayments.map((payment) => {
            const account = accountById.get(payment.accountId)
            const category = payment.categoryId
              ? categoryById.get(payment.categoryId)
              : null

            return (
              <article
                key={payment.id}
                className="grid gap-4 border-b border-border py-5 last:border-b-0 lg:grid-cols-[1fr_auto] lg:items-start"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                    <span>{statusLabels[payment.status]}</span>
                    <span aria-hidden="true">/</span>
                    <span>{formatRecurringCadence(payment)}</span>
                    <span aria-hidden="true">/</span>
                    <span>{payment.type.toLowerCase()}</span>
                  </div>
                  <h3 className="mt-2 text-xl leading-7">{payment.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{payment.merchant ?? "No merchant"}</span>
                    <span>{account?.name ?? "Unknown account"}</span>
                    <span>{category?.name ?? "Uncategorized"}</span>
                  </div>
                  {payment.note ? (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {payment.note}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 lg:min-w-52 lg:text-right">
                  <p className="font-heading text-2xl leading-none tracking-tight">
                    {formatCurrency(
                      payment.amount,
                      payment.currency,
                      payment.type
                    )}
                  </p>
                  <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                    Next due {formatDateForUser(payment.nextDueDate, timezone)}
                  </p>
                  <div className="lg:flex lg:justify-end">
                    <RecurringPaymentActionButtons recurringPayment={payment} />
                  </div>
                </div>
              </article>
            )
          })
        ) : (
          <div className="py-12">
            <p className="text-lg">No recurring payments yet.</p>
            <p className="mt-2 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              Add a repeating bill, subscription, or income source.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function CategoryManageGroup({
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
            <CategoryActionMenu key={category.id} category={category} />
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
  chartPeriod = "monthly",
  financeSettings,
  recurringPayments = [],
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
    <FinancesShell
      tab={tab}
      aside={
        <p className="pt-10 font-mono text-[12px] tracking-[0.16em] text-muted-foreground uppercase">
          {tab === "manage"
            ? "Manage"
            : tab === "recurring"
              ? `${recurringPayments.length} recurring`
              : `${transactions.length} transactions`}
        </p>
      }
    >
      {tab === "overview" ? (
        <OverviewTab
          accountBalances={accountBalances}
          accounts={accounts}
          categories={categories}
          chartPeriod={chartPeriod}
          financeSettings={financeSettings}
          transactions={transactions}
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
        <RecurringPaymentsTab
          accounts={accounts}
          categories={categories}
          recurringPayments={recurringPayments}
          timezone={timezone}
        />
      ) : null}

      {tab === "manage" ? (
        <ManageTab
          accountBalances={accountBalances}
          accounts={accounts}
          categories={categories}
          financeSettings={financeSettings}
        />
      ) : null}
    </FinancesShell>
  )
}
