import { describe, expect, test } from "bun:test"

import {
  DEFAULT_VISIBLE_TRANSACTION_DAYS,
  DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
  getVisibleTransactionGroups,
  mergeTransactionGroups,
  type TransactionGroup,
} from "@/features/finances/transaction-list"

function makeGroups(dayCount: number, transactionCount: number) {
  return Array.from({ length: dayCount }, (_, dayIndex) => ({
    label: `Day ${dayIndex + 1}`,
    transactions: Array.from({ length: transactionCount }, (_, index) => ({
      id: `${dayIndex + 1}-${index + 1}`,
    })),
  })) as TransactionGroup[]
}

describe("transaction list visibility", () => {
  test("shows seven days and five transactions per day by default", () => {
    const groups = getVisibleTransactionGroups(makeGroups(9, 12))

    expect(groups).toHaveLength(DEFAULT_VISIBLE_TRANSACTION_DAYS)
    expect(groups.every((group) => group.transactions.length === 5)).toBe(true)
    expect(groups.every((group) => group.totalTransactions === 12)).toBe(true)
  })

  test("respects expanded day and transaction counts", () => {
    const groups = getVisibleTransactionGroups(makeGroups(9, 20), 8, {
      "Day 2": 15,
    })

    expect(groups).toHaveLength(8)
    expect(groups[0]?.transactions).toHaveLength(
      DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY
    )
    expect(groups[1]?.transactions).toHaveLength(15)
  })

  test("preserves server-provided daily totals", () => {
    const groups = getVisibleTransactionGroups([
      {
        label: "Day 1",
        dayKey: "2026-06-30",
        totalTransactions: 12,
        transactions: Array.from({ length: 5 }, (_, index) => ({
          id: `1-${index + 1}`,
        })),
      } as TransactionGroup,
    ])

    expect(groups[0]?.transactions).toHaveLength(5)
    expect(groups[0]?.totalTransactions).toBe(12)
  })

  test("merges fetched groups without duplicating transactions", () => {
    const current = [
      {
        label: "Day 1",
        dayKey: "2026-06-30",
        totalTransactions: 3,
        transactions: [{ id: "1" }, { id: "2" }],
      },
    ] as TransactionGroup[]
    const next = [
      {
        label: "Day 1",
        dayKey: "2026-06-30",
        totalTransactions: 3,
        transactions: [{ id: "2" }, { id: "3" }],
      },
      {
        label: "Day 2",
        dayKey: "2026-06-29",
        totalTransactions: 1,
        transactions: [{ id: "4" }],
      },
    ] as TransactionGroup[]

    const groups = mergeTransactionGroups(current, next)

    expect(groups).toHaveLength(2)
    expect(
      groups[0]?.transactions.map((transaction) => transaction.id)
    ).toEqual(["1", "2", "3"])
    expect(groups[0]?.totalTransactions).toBe(3)
    expect(groups[1]?.label).toBe("Day 2")
  })
})
