import Decimal from "decimal.js"

import { formatMoney } from "@/lib/money"

export type AccountBalance = {
  accountId: string
  amount: string
  currency: string
}

export type AccountBalanceInput = {
  accountId: string
  income: string
  expense: string
  transferIn: string
  transferOut: string
}

type BalanceAccount = {
  id: string
  initialBalance: string
  currency: string
}

type BalanceTransaction = {
  accountId: string
  transferAccountId: string | null
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  amount: string
}

/**
 * Computes each account's balance from pre-aggregated per-account sums:
 * initialBalance + income - expense + transferIn - transferOut. Accounts with
 * no matching aggregate keep their initial balance. Aggregates for accounts not
 * in `accounts` are ignored.
 */
export function computeAccountBalances(
  accounts: BalanceAccount[],
  inputs: AccountBalanceInput[]
): AccountBalance[] {
  const byId = new Map(inputs.map((input) => [input.accountId, input]))

  return accounts.map((account) => {
    const input = byId.get(account.id)
    let total = new Decimal(account.initialBalance)

    if (input) {
      total = total
        .plus(input.income)
        .minus(input.expense)
        .plus(input.transferIn)
        .minus(input.transferOut)
    }

    return {
      accountId: account.id,
      amount: formatMoney(total),
      currency: account.currency,
    }
  })
}

type MutableAggregate = {
  income: Decimal
  expense: Decimal
  transferIn: Decimal
  transferOut: Decimal
}

/**
 * Reduces raw POSTED transactions into per-account aggregates, mirroring the two
 * SQL `GROUP BY` queries in {@link import("@/features/accounts/queries").getAccountBalances}.
 * Used as the testable reference for the SQL aggregation.
 */
export function aggregateBalanceRows(
  rows: BalanceTransaction[]
): AccountBalanceInput[] {
  const totals = new Map<string, MutableAggregate>()

  const ensure = (accountId: string) => {
    let entry = totals.get(accountId)
    if (!entry) {
      entry = {
        income: new Decimal(0),
        expense: new Decimal(0),
        transferIn: new Decimal(0),
        transferOut: new Decimal(0),
      }
      totals.set(accountId, entry)
    }
    return entry
  }

  for (const row of rows) {
    const amount = new Decimal(row.amount)

    if (row.type === "INCOME") {
      ensure(row.accountId).income = ensure(row.accountId).income.plus(amount)
      continue
    }

    if (row.type === "EXPENSE") {
      ensure(row.accountId).expense = ensure(row.accountId).expense.plus(amount)
      continue
    }

    // TRANSFER: debit the source, credit the target.
    const source = ensure(row.accountId)
    source.transferOut = source.transferOut.plus(amount)

    if (row.transferAccountId) {
      const target = ensure(row.transferAccountId)
      target.transferIn = target.transferIn.plus(amount)
    }
  }

  return [...totals.entries()].map(([accountId, entry]) => ({
    accountId,
    income: entry.income.toString(),
    expense: entry.expense.toString(),
    transferIn: entry.transferIn.toString(),
    transferOut: entry.transferOut.toString(),
  }))
}
