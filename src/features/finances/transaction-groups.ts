import { addDays } from "date-fns"

import type { Transaction } from "@/db/schema"
import type { TransactionGroup } from "@/features/finances/transaction-list"
import {
  formatDateForUser,
  getDateInputValueInTimeZone,
  parseUserDateAsUtc,
} from "@/lib/timezone"

function getGroupLabel(date: Date, timezone: string) {
  const today = new Date()
  const todayValue = getDateInputValueInTimeZone(today, timezone)
  const yesterdayValue = getDateInputValueInTimeZone(
    addDays(parseUserDateAsUtc(todayValue, timezone), -1),
    timezone
  )
  const targetValue = getDateInputValueInTimeZone(date, timezone)

  if (targetValue === todayValue) {
    return "Today"
  }

  if (targetValue === yesterdayValue) {
    return "Yesterday"
  }

  return formatDateForUser(date, timezone)
}

type TransactionListRow = Transaction & {
  dayKey?: string | null
  totalTransactions?: number | null
}

export function groupTransactions(
  transactions: TransactionListRow[],
  timezone: string
) {
  return transactions.reduce<TransactionGroup[]>((groups, transaction) => {
    const dayKey =
      transaction.dayKey ??
      getDateInputValueInTimeZone(transaction.occurredAt, timezone)
    const label = getGroupLabel(transaction.occurredAt, timezone)
    const group = groups.find((item) => item.dayKey === dayKey)

    if (group) {
      group.transactions.push(transaction)
      group.totalTransactions =
        transaction.totalTransactions ?? group.totalTransactions
      return groups
    }

    groups.push({
      dayKey,
      label,
      totalTransactions: transaction.totalTransactions ?? undefined,
      transactions: [transaction],
    })
    return groups
  }, [])
}
