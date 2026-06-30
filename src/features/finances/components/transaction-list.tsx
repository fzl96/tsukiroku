"use client"

import * as React from "react"

import type { Category, FinancialAccount } from "@/db/schema"
import {
  loadTransactionDayAction,
  loadTransactionDaysAction,
} from "@/features/finances/actions"
import { TransactionRow } from "@/features/finances/components/transaction-row"
import {
  DEFAULT_VISIBLE_TRANSACTION_DAYS,
  DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
  getVisibleTransactionGroups,
  mergeTransactionGroups,
  type TransactionGroup,
} from "@/features/finances/transaction-list"

type TransactionListProps = {
  accounts: FinancialAccount[]
  categories: Category[]
  groups: TransactionGroup[]
  hasMoreDays: boolean
  nextDayOffset: number | null
  transactionFilters: unknown
  timezone: string
}

function ShowMoreButton({
  children = "Show More",
  disabled,
  onClick,
}: {
  children?: React.ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center border border-border px-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function TransactionList({
  accounts,
  categories,
  groups,
  hasMoreDays: initialHasMoreDays,
  nextDayOffset: initialNextDayOffset,
  transactionFilters,
  timezone,
}: TransactionListProps) {
  const [transactionGroups, setTransactionGroups] = React.useState(groups)
  const [hasMoreDays, setHasMoreDays] = React.useState(initialHasMoreDays)
  const [nextDayOffset, setNextDayOffset] = React.useState(initialNextDayOffset)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const isLoadingDaysRef = React.useRef(false)

  const visibleGroups = getVisibleTransactionGroups(
    transactionGroups,
    transactionGroups.length || DEFAULT_VISIBLE_TRANSACTION_DAYS
  )
  const loadMoreDays = React.useCallback(() => {
    if (!hasMoreDays || nextDayOffset === null || isLoadingDaysRef.current) {
      return
    }

    isLoadingDaysRef.current = true
    setError(null)

    startTransition(async () => {
      const result = await loadTransactionDaysAction(transactionFilters, {
        dayOffset: nextDayOffset,
        timezone,
        transactionsPerDay: DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
        visibleDays: DEFAULT_VISIBLE_TRANSACTION_DAYS,
      })

      if (result.error) {
        setError(result.error.message)
      } else {
        setTransactionGroups((current) =>
          mergeTransactionGroups(current, result.data.groups)
        )
        setHasMoreDays(result.data.hasMoreDays)
        setNextDayOffset(result.data.nextDayOffset)
      }

      isLoadingDaysRef.current = false
    })
  }, [hasMoreDays, nextDayOffset, timezone, transactionFilters])

  React.useEffect(() => {
    if (!hasMoreDays) {
      return
    }

    const sentinel = sentinelRef.current

    if (!sentinel) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreDays()
        }
      },
      { rootMargin: "360px 0px" }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasMoreDays, loadMoreDays])

  function loadMoreTransactionsForGroup(group: TransactionGroup) {
    if (!group.dayKey) {
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await loadTransactionDayAction(transactionFilters, {
        dayKey: group.dayKey,
        timezone,
        transactionOffset: group.transactions.length,
        transactionsPerPage: DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
      })

      if (result.error) {
        setError(result.error.message)
        return
      }

      setTransactionGroups((current) =>
        mergeTransactionGroups(current, result.data.groups)
      )
    })
  }

  return (
    <div className="space-y-10">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <div className="mb-5 border-b border-border pb-3">
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              {group.label} · {group.totalTransactions}
            </p>
          </div>
          <div className="space-y-5">
            {group.transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                accounts={accounts}
                categories={categories}
                timezone={timezone}
                transaction={transaction}
              />
            ))}
          </div>
          {group.transactions.length < group.totalTransactions ? (
            <div className="mt-5">
              <ShowMoreButton
                disabled={isPending}
                onClick={() => loadMoreTransactionsForGroup(group)}
              >
                {isPending ? "Loading" : "View More"}
              </ShowMoreButton>
            </div>
          ) : null}
        </div>
      ))}

      {hasMoreDays ? (
        <div className="border-t border-border pt-5">
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
          <ShowMoreButton disabled={isPending} onClick={loadMoreDays}>
            {isPending ? "Loading" : "Load More"}
          </ShowMoreButton>
        </div>
      ) : null}

      {error ? (
        <p className="font-mono text-[11px] tracking-[0.14em] text-destructive uppercase">
          {error}
        </p>
      ) : null}
    </div>
  )
}
