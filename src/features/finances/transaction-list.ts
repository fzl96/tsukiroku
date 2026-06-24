import type { Transaction } from "@/db/schema"

export type TransactionGroup = {
  label: string
  transactions: Transaction[]
}

export const DEFAULT_VISIBLE_TRANSACTION_DAYS = 7
export const DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY = 10

export function getVisibleTransactionGroups(
  groups: TransactionGroup[],
  visibleDays = DEFAULT_VISIBLE_TRANSACTION_DAYS,
  visibleTransactionsByGroup: Record<string, number> = {}
) {
  return groups.slice(0, visibleDays).map((group) => ({
    ...group,
    transactions: group.transactions.slice(
      0,
      visibleTransactionsByGroup[group.label] ??
        DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY
    ),
    totalTransactions: group.transactions.length,
  }))
}
