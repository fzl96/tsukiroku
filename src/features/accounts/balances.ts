import Decimal from "decimal.js"

import { formatMoney } from "@/lib/money"

export type AccountBalance = {
  accountId: string
  amount: string
  currency: string
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
 * Computes balances for every account in a single pass over the POSTED
 * transactions. Mirrors the per-account logic in
 * {@link import("@/features/accounts/service").getAccountBalance} but avoids the
 * N+1 query pattern by reducing all accounts at once.
 */
export function computeAccountBalances(
  accounts: BalanceAccount[],
  rows: BalanceTransaction[]
): AccountBalance[] {
  const totals = new Map<string, Decimal>()

  for (const account of accounts) {
    totals.set(account.id, new Decimal(account.initialBalance))
  }

  for (const row of rows) {
    const amount = new Decimal(row.amount)

    if (row.type === "INCOME" && totals.has(row.accountId)) {
      totals.set(row.accountId, totals.get(row.accountId)!.plus(amount))
      continue
    }

    if (row.type === "EXPENSE" && totals.has(row.accountId)) {
      totals.set(row.accountId, totals.get(row.accountId)!.minus(amount))
      continue
    }

    if (row.type === "TRANSFER") {
      if (totals.has(row.accountId)) {
        totals.set(row.accountId, totals.get(row.accountId)!.minus(amount))
      }

      if (row.transferAccountId && totals.has(row.transferAccountId)) {
        totals.set(
          row.transferAccountId,
          totals.get(row.transferAccountId)!.plus(amount)
        )
      }
    }
  }

  return accounts.map((account) => ({
    accountId: account.id,
    amount: formatMoney(totals.get(account.id) ?? new Decimal(account.initialBalance)),
    currency: account.currency,
  }))
}
