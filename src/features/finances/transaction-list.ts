import type { Transaction } from "@/db/schema"

export type TransactionGroup = {
  dayKey?: string
  label: string
  transactions: Transaction[]
  totalTransactions?: number
}

export const DEFAULT_VISIBLE_TRANSACTION_DAYS = 7
export const DEFAULT_VISIBLE_TRANSACTIONS_PER_DAY = 5

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
    totalTransactions: group.totalTransactions ?? group.transactions.length,
  }))
}

export function mergeTransactionGroups(
  currentGroups: TransactionGroup[],
  nextGroups: TransactionGroup[]
) {
  const groups = currentGroups.map((group) => ({
    ...group,
    transactions: [...group.transactions],
  }))

  for (const nextGroup of nextGroups) {
    const group = groups.find((item) =>
      nextGroup.dayKey && item.dayKey
        ? item.dayKey === nextGroup.dayKey
        : item.label === nextGroup.label
    )

    if (!group) {
      groups.push({
        ...nextGroup,
        transactions: [...nextGroup.transactions],
      })
      continue
    }

    const transactionIds = new Set(
      group.transactions.map((transaction) => transaction.id)
    )

    for (const transaction of nextGroup.transactions) {
      if (!transactionIds.has(transaction.id)) {
        group.transactions.push(transaction)
        transactionIds.add(transaction.id)
      }
    }

    group.totalTransactions =
      nextGroup.totalTransactions ?? group.totalTransactions
  }

  return groups
}
