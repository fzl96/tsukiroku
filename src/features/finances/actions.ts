"use server"

import { groupTransactions } from "@/features/finances/transaction-groups"
import {
  listTransactionPage,
  listTransactionsForLocalDay,
} from "@/features/transactions/queries"
import { actionData, actionError } from "@/lib/action-result"
import { requireUser } from "@/lib/auth"

export async function loadTransactionDaysAction(
  filters: unknown,
  options: unknown
) {
  try {
    const user = await requireUser()
    const page = await listTransactionPage(user.id, filters, options)

    return actionData({
      ...page,
      groups: groupTransactions(page.transactions, optionsTimezone(options)),
    })
  } catch (error) {
    return actionError(error)
  }
}

export async function loadTransactionDayAction(
  filters: unknown,
  options: unknown
) {
  try {
    const user = await requireUser()
    const transactions = await listTransactionsForLocalDay(
      user.id,
      filters,
      options
    )

    return actionData({
      groups: groupTransactions(transactions, optionsTimezone(options)),
    })
  } catch (error) {
    return actionError(error)
  }
}

function optionsTimezone(options: unknown) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    return "UTC"
  }

  const timezone = "timezone" in options ? options.timezone : null

  return typeof timezone === "string" && timezone.trim() ? timezone : "UTC"
}
