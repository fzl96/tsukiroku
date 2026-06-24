"use client"

import * as React from "react"

import type { Category, FinancialAccount } from "@/db/schema"
import { TransactionRow } from "@/features/finances/components/transaction-row"
import {
  DEFAULT_VISIBLE_TRANSACTION_DAYS,
  DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
  getVisibleTransactionGroups,
  type TransactionGroup,
} from "@/features/finances/transaction-list"

type TransactionListProps = {
  accounts: FinancialAccount[]
  categories: Category[]
  groups: TransactionGroup[]
  timezone: string
}

function ShowMoreButton({
  children = "Show More",
  onClick,
}: {
  children?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center border border-border px-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:bg-accent hover:text-accent-foreground"
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
  timezone,
}: TransactionListProps) {
  const [visibleDays, setVisibleDays] = React.useState(
    DEFAULT_VISIBLE_TRANSACTION_DAYS
  )
  const [visibleTransactionsByGroup, setVisibleTransactionsByGroup] =
    React.useState<Record<string, number>>({})

  const visibleGroups = getVisibleTransactionGroups(
    groups,
    visibleDays,
    visibleTransactionsByGroup
  )

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
                onClick={() => {
                  setVisibleTransactionsByGroup((current) => ({
                    ...current,
                    [group.label]:
                      (current[group.label] ??
                        DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY) +
                      DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
                  }))
                }}
              />
            </div>
          ) : null}
        </div>
      ))}

      {visibleGroups.length < groups.length ? (
        <div className="border-t border-border pt-5">
          <ShowMoreButton
            onClick={() => {
              setVisibleDays(
                (current) => current + DEFAULT_VISIBLE_TRANSACTION_DAYS
              )
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
