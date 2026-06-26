import { describe, expect, test } from "bun:test"
import Decimal from "decimal.js"

import { computeAccountBalances } from "@/features/accounts/balances"
import { formatMoney } from "@/lib/money"

type Account = { id: string; initialBalance: string; currency: string }
type Row = {
  accountId: string
  transferAccountId: string | null
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  amount: string
}

// Reference implementation: the original per-account reduction.
function referenceBalance(account: Account, rows: Row[]) {
  const balance = rows.reduce((total, row) => {
    const amount = new Decimal(row.amount)

    if (row.type === "INCOME" && row.accountId === account.id) {
      return total.plus(amount)
    }
    if (row.type === "EXPENSE" && row.accountId === account.id) {
      return total.minus(amount)
    }
    if (row.type === "TRANSFER" && row.accountId === account.id) {
      return total.minus(amount)
    }
    if (row.type === "TRANSFER" && row.transferAccountId === account.id) {
      return total.plus(amount)
    }
    return total
  }, new Decimal(account.initialBalance))

  return formatMoney(balance)
}

const accounts: Account[] = [
  { id: "a", initialBalance: "100.00", currency: "USD" },
  { id: "b", initialBalance: "0.00", currency: "USD" },
  { id: "c", initialBalance: "50.00", currency: "EUR" },
]

const rows: Row[] = [
  { accountId: "a", transferAccountId: null, type: "INCOME", amount: "200.00" },
  { accountId: "a", transferAccountId: null, type: "EXPENSE", amount: "30.50" },
  { accountId: "a", transferAccountId: "b", type: "TRANSFER", amount: "40.00" },
  { accountId: "b", transferAccountId: "c", type: "TRANSFER", amount: "10.00" },
  { accountId: "c", transferAccountId: null, type: "INCOME", amount: "5.25" },
  // Transaction referencing an account not in the list should be ignored.
  { accountId: "z", transferAccountId: "a", type: "TRANSFER", amount: "999.00" },
]

describe("computeAccountBalances", () => {
  test("matches the per-account reference implementation", () => {
    const result = computeAccountBalances(accounts, rows)
    const byId = new Map(result.map((item) => [item.accountId, item]))

    for (const account of accounts) {
      expect(byId.get(account.id)?.amount).toBe(referenceBalance(account, rows))
    }
  })

  test("credits an in-set transfer target even when the source is out of set", () => {
    // The z->a transfer (z not in the set) still adds to a, matching the
    // per-account reference which credits whichever side it is computing.
    const result = computeAccountBalances(accounts, rows)
    expect(result.find((item) => item.accountId === "a")?.amount).toBe(
      referenceBalance(accounts[0], rows)
    )
  })

  test("returns initial balance when no transactions touch an account", () => {
    const result = computeAccountBalances(
      [{ id: "x", initialBalance: "12.34", currency: "USD" }],
      []
    )
    expect(result).toEqual([
      { accountId: "x", amount: "12.34", currency: "USD" },
    ])
  })

  test("preserves account order and currency", () => {
    const result = computeAccountBalances(accounts, rows)
    expect(result.map((item) => item.accountId)).toEqual(["a", "b", "c"])
    expect(result.map((item) => item.currency)).toEqual(["USD", "USD", "EUR"])
  })
})
