"use client"

import { Activity, useMemo, useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import {
  aggregateBalanceRows,
  computeAccountBalances,
} from "@/features/accounts/balances"
import { getPeriodRange, financeTabOptions } from "@/features/finances/filters"
import {
  FinanceDataProvider,
  useFinanceData,
} from "@/features/finances/components/finance-data-provider"
import {
  FinanceNavigationContext,
  initialFinanceNavigation,
} from "@/features/finances/components/finance-navigation"
import {
  FinancesHeaderAside,
  FinancesShell,
  FinancesTabBody,
  FinancesTabSkeleton,
} from "@/features/finances/components/finances-page"
import { FinanceTimezoneInitializer } from "@/features/finances/components/finance-timezone-initializer"

function FinanceWorkspace() {
  const { data, pending, refreshing, error, refresh } = useFinanceData()
  const [navigation, setNavigation] = useState(initialFinanceNavigation)
  const { tab, chartPeriod, filters } = navigation
  const sortedTransactions = useMemo(
    () =>
      data
        ? [...data.transactions].sort(
            (a, b) =>
              b.occurredAt.getTime() - a.occurredAt.getTime() ||
              b.createdAt.getTime() - a.createdAt.getTime()
          )
        : [],
    [data]
  )
  const accountBalances = useMemo(
    () =>
      data
        ? computeAccountBalances(
            data.accounts,
            aggregateBalanceRows(
              data.transactions.filter((row) => row.status === "POSTED")
            )
          )
        : [],
    [data]
  )
  const filteredTransactions = useMemo(() => {
    if (!data) return []
    const range = getPeriodRange(filters.period, new Date(), data.settings)
    return sortedTransactions.filter(
      (row) =>
        (!range ||
          (row.occurredAt >= range.from &&
            row.occurredAt < range.toExclusive)) &&
        (!filters.accountIds.length ||
          filters.accountIds.includes(row.accountId) ||
          (!!row.transferAccountId &&
            filters.accountIds.includes(row.transferAccountId))) &&
        (!filters.categoryIds.length ||
          (!!row.categoryId && filters.categoryIds.includes(row.categoryId))) &&
        (filters.type === "all" || filters.type === row.type)
    )
  }, [data, filters, sortedTransactions])
  const recurringPayments = useMemo(
    () =>
      data
        ? [...data.recurringPayments].sort(
            (a, b) =>
              a.nextDueDate.getTime() - b.nextDueDate.getTime() ||
              a.name.localeCompare(b.name)
          )
        : [],
    [data]
  )

  return (
    <FinanceNavigationContext.Provider
      value={{
        navigate: (update) =>
          setNavigation((current) => ({ ...current, ...update })),
      }}
    >
      <FinancesShell
        tab={tab}
        aside={
          <FinancesHeaderAside
            tab={tab}
            transactionCount={
              tab === "transactions"
                ? filteredTransactions.length
                : sortedTransactions.length
            }
            recurringCount={recurringPayments.length}
          />
        }
      >
        <div
          className="flex min-h-7 items-center justify-end gap-3 font-mono text-[10px] tracking-widest text-muted-foreground uppercase"
          role="status"
          aria-live="polite"
        >
          {pending ? "Saving changes…" : refreshing ? "Updating…" : ""}
          {error && (
            <>
              <span>Unable to sync</span>
              <button type="button" className="underline" onClick={refresh}>
                Retry
              </button>
            </>
          )}
        </div>
        {data ? (
          <>
            {data.needsTimezone && (
              <FinanceTimezoneInitializer {...data.settings} />
            )}
            {financeTabOptions.map((section) => (
              <Activity
                key={section}
                mode={tab === section ? "visible" : "hidden"}
              >
                <div role="region" aria-label={`${section} content`}>
                  <FinancesTabBody
                    accounts={data.accounts}
                    accountBalances={accountBalances}
                    categories={data.categories}
                    chartPeriod={chartPeriod}
                    financeSettings={data.settings}
                    recurringPayments={recurringPayments}
                    tab={section}
                    timezone={data.settings.timezone}
                    transactions={
                      section === "transactions"
                        ? filteredTransactions
                        : sortedTransactions
                    }
                    filters={filters}
                  />
                </div>
              </Activity>
            ))}
          </>
        ) : error ? (
          <p className="py-10">
            Your finances couldn’t be loaded. Please retry.
          </p>
        ) : (
          <FinancesTabSkeleton tab={tab} />
        )}
      </FinancesShell>
      <Toaster />
    </FinanceNavigationContext.Provider>
  )
}

export function FinanceClient() {
  return (
    <FinanceDataProvider>
      <FinanceWorkspace />
    </FinanceDataProvider>
  )
}
