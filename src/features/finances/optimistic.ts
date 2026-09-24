import type { FinanceSnapshot } from "@/features/finances/queries"
import type { FinanceMutation } from "@/features/finances/validations"
import { addRecurringInterval } from "@/features/recurring-payments/schedule"
import type { FinancePatch } from "@/features/finances/types"

export function reconcileFinanceMutation(
  state: FinanceSnapshot,
  mutation: FinanceMutation,
  patch: FinancePatch
): FinanceSnapshot {
  const projected = applyFinanceMutation(state, mutation)
  const temporaryId = `optimistic:${mutation.clientId}`
  function reconcile<T extends { id: string }>(rows: T[], record?: T): T[] {
    if (!record) return rows
    const index = rows.findIndex(
      (row) => row.id === record.id || row.id === temporaryId
    )
    return index < 0
      ? [...rows, record]
      : rows.map((row, i) => (i === index ? record : row))
  }
  return {
    ...projected,
    accounts: reconcile(projected.accounts, patch.account).filter(
      (row) => !row.isArchived
    ),
    categories: reconcile(projected.categories, patch.category).filter(
      (row) => !row.isArchived
    ),
    transactions: reconcile(projected.transactions, patch.transaction),
    recurringPayments: reconcile(
      projected.recurringPayments,
      patch.recurringPayment
    ),
    settings: patch.settings ?? projected.settings,
  }
}

// Pending commands are projected over the last confirmed snapshot. Removing a
// failed command rolls back only that operation, preserving other pending edits.
export function applyFinanceMutation(
  state: FinanceSnapshot,
  mutation: FinanceMutation
): FinanceSnapshot {
  const { command, clientId, submittedAt } = mutation
  const base = {
    id: `optimistic:${clientId}`,
    userId: state.userId,
    createdAt: submittedAt,
    updatedAt: submittedAt,
  }
  switch (command.type) {
    case "transaction.create":
      return {
        ...state,
        transactions: [{ ...base, ...command.data }, ...state.transactions],
      }
    case "transaction.update":
      return {
        ...state,
        transactions: state.transactions.map((row) =>
          row.id === command.id ? { ...row, ...command.data } : row
        ),
      }
    case "transaction.delete":
      return {
        ...state,
        transactions: state.transactions.filter((row) => row.id !== command.id),
      }
    case "account.create":
      return {
        ...state,
        accounts: [
          ...state.accounts,
          {
            ...base,
            color: null,
            isArchived: false,
            displayOrder: 0,
            ...command.data,
          },
        ],
      }
    case "account.update":
      return {
        ...state,
        accounts: state.accounts
          .map((row) =>
            row.id === command.id ? { ...row, ...command.data } : row
          )
          .filter((row) => !row.isArchived),
      }
    case "account.archive":
    case "account.delete":
      return {
        ...state,
        accounts: state.accounts.filter((row) => row.id !== command.id),
      }
    case "category.create":
      return {
        ...state,
        categories: [
          ...state.categories,
          {
            ...base,
            color: null,
            icon: null,
            isArchived: false,
            ...command.data,
          },
        ],
      }
    case "category.update":
      return {
        ...state,
        categories: state.categories
          .map((row) =>
            row.id === command.id ? { ...row, ...command.data } : row
          )
          .filter((row) => !row.isArchived),
      }
    case "category.archive":
      return {
        ...state,
        categories: state.categories.filter((row) => row.id !== command.id),
      }
    case "category.delete":
      return {
        ...state,
        categories: state.categories.filter((row) => row.id !== command.id),
        transactions: state.transactions.map((row) =>
          row.categoryId === command.id ? { ...row, categoryId: null } : row
        ),
        recurringPayments: state.recurringPayments.map((row) =>
          row.categoryId === command.id ? { ...row, categoryId: null } : row
        ),
      }
    case "recurring.create":
      return {
        ...state,
        recurringPayments: [
          ...state.recurringPayments,
          { ...base, lastRecordedAt: null, status: "ACTIVE", ...command.data },
        ],
      }
    case "recurring.update":
      return {
        ...state,
        recurringPayments: state.recurringPayments.map((row) =>
          row.id === command.id ? { ...row, ...command.data } : row
        ),
      }
    case "recurring.pause":
    case "recurring.cancel":
      return {
        ...state,
        recurringPayments: state.recurringPayments.map((row) =>
          row.id === command.id
            ? {
                ...row,
                status:
                  command.type === "recurring.pause" ? "PAUSED" : "CANCELED",
              }
            : row
        ),
      }
    case "recurring.record": {
      const row = state.recurringPayments.find((row) => row.id === command.id)
      if (!row || row.status !== "ACTIVE") return state
      const occurredAt = command.data?.occurredAt ?? submittedAt
      const nextDueDate = addRecurringInterval(
        row.nextDueDate,
        row.frequency,
        row.intervalCount
      )
      return {
        ...state,
        transactions: [
          {
            ...base,
            accountId: row.accountId,
            transferAccountId: null,
            title: null,
            type: row.type,
            status: command.data?.status ?? "POSTED",
            amount: row.amount,
            currency: row.currency,
            occurredAt,
            merchant: row.merchant,
            note: row.note,
            reference: null,
            categoryId: row.categoryId,
            recurringPaymentId: row.id,
          },
          ...state.transactions,
        ],
        recurringPayments: state.recurringPayments.map((item) =>
          item.id === row.id
            ? {
                ...item,
                nextDueDate,
                lastRecordedAt: occurredAt,
                status:
                  row.endDate && nextDueDate > row.endDate ? "ENDED" : "ACTIVE",
              }
            : item
        ),
      }
    }
    case "settings.update":
      return {
        ...state,
        settings: { ...state.settings, ...command.data },
        needsTimezone: false,
      }
  }
}
