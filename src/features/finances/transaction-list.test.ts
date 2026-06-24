import { describe, expect, test } from "bun:test"

import {
  DEFAULT_VISIBLE_TRANSACTION_DAYS,
  DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY,
  getVisibleTransactionGroups,
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
  test("shows seven days and ten transactions per day by default", () => {
    const groups = getVisibleTransactionGroups(makeGroups(9, 12))

    expect(groups).toHaveLength(DEFAULT_VISIBLE_TRANSACTION_DAYS)
    expect(groups.every((group) => group.transactions.length === 10)).toBe(true)
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
})
