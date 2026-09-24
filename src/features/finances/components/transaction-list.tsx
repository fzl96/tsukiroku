"use client"

import { useState } from "react"
import type { Category, FinancialAccount } from "@/db/schema"
import { TransactionRow } from "@/features/finances/components/transaction-row"
import {
  DEFAULT_VISIBLE_TRANSACTION_DAYS,
  DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
  getVisibleTransactionGroups,
  type TransactionGroup,
} from "@/features/finances/transaction-list"

export function TransactionList({
  accounts,
  categories,
  groups,
  timezone,
}: {
  accounts: FinancialAccount[]
  categories: Category[]
  groups: TransactionGroup[]
  timezone: string
}) {
  const [visibleDays, setVisibleDays] = useState(
    DEFAULT_VISIBLE_TRANSACTION_DAYS
  )
  const [visibleByGroup, setVisibleByGroup] = useState<Record<string, number>>(
    {}
  )
  const visible = getVisibleTransactionGroups(
    groups,
    visibleDays,
    visibleByGroup
  )
  const buttonClass =
    "inline-flex h-8 items-center border border-border px-3 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors hover:bg-accent"
  return (
    <div className="space-y-10">
      {visible.map((group) => (
        <div key={group.dayKey ?? group.label}>
          <div className="mb-5 border-b border-border pb-3">
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              {group.label} · {group.totalTransactions}
            </p>
          </div>
          <div className="space-y-5">
            {group.transactions.map((transaction) => (
              <div
                key={transaction.id}
                aria-busy={transaction.id.startsWith("optimistic:")}
              >
                <TransactionRow
                  accounts={accounts}
                  categories={categories}
                  timezone={timezone}
                  transaction={transaction}
                />
              </div>
            ))}
          </div>
          {group.transactions.length < group.totalTransactions && (
            <button
              type="button"
              className={buttonClass + " mt-5"}
              onClick={() =>
                setVisibleByGroup((current) => ({
                  ...current,
                  [group.label]:
                    (current[group.label] ??
                      DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY) +
                    DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
                }))
              }
            >
              View More
            </button>
          )}
        </div>
      ))}
      {visibleDays < groups.length && (
        <button
          type="button"
          className={buttonClass}
          onClick={() =>
            setVisibleDays((count) => count + DEFAULT_VISIBLE_TRANSACTION_DAYS)
          }
        >
          Load More
        </button>
      )}
    </div>
  )
}
