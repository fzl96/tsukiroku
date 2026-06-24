import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import {
  category as categoryTable,
  recurringPayment,
  transaction,
} from "@/db/schema"
import { getFinancialAccount } from "@/features/accounts/queries"
import { getCategory } from "@/features/categories/queries"
import { getTransaction } from "@/features/transactions/queries"
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
} from "@/features/transactions/validations"
import { appError, notFound } from "@/lib/errors"

async function getRecurringPaymentForUser(
  userId: string,
  recurringPaymentId: string
) {
  const [row] = await db
    .select()
    .from(recurringPayment)
    .where(
      and(
        eq(recurringPayment.id, recurringPaymentId),
        eq(recurringPayment.userId, userId)
      )
    )
    .limit(1)

  return row ?? null
}

async function assertTransactionResources(
  userId: string,
  data: CreateTransactionInput
) {
  const account = await getFinancialAccount(userId, data.accountId)

  if (!account) {
    throw notFound("Account not found.")
  }

  if (account.isArchived) {
    throw appError("ACCOUNT_ARCHIVED", "Archived accounts cannot be used.")
  }

  if (data.transferAccountId) {
    const transferAccount = await getFinancialAccount(
      userId,
      data.transferAccountId
    )

    if (!transferAccount) {
      throw notFound("Transfer account not found.")
    }

    if (transferAccount.isArchived) {
      throw appError("ACCOUNT_ARCHIVED", "Archived accounts cannot be used.")
    }
  }

  if (data.categoryId) {
    const category = await getCategory(userId, data.categoryId)

    if (!category) {
      throw notFound("Category not found.")
    }

    if (category.isArchived) {
      throw appError("CATEGORY_ARCHIVED", "Archived categories cannot be used.")
    }

    if (category.kind !== data.type) {
      throw appError(
        "INVALID_CATEGORY_KIND",
        "Category kind must match transaction type."
      )
    }
  }

  if (data.recurringPaymentId) {
    const recurring = await getRecurringPaymentForUser(
      userId,
      data.recurringPaymentId
    )

    if (!recurring) {
      throw notFound("Recurring payment not found.")
    }
  }
}

export async function createTransaction(userId: string, input: unknown) {
  const data = createTransactionSchema.parse(input)
  await assertTransactionResources(userId, data)

  const [created] = await db
    .insert(transaction)
    .values({
      userId,
      ...data,
    })
    .returning()

  return created
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: unknown
) {
  const existing = await getTransaction(userId, transactionId)

  if (!existing) {
    throw notFound("Transaction not found.")
  }

  const partial = updateTransactionSchema.parse(input)
  const valueOrExisting = <Key extends keyof typeof partial>(
    key: Key,
    existingValue: CreateTransactionInput[Key]
  ) =>
    Object.prototype.hasOwnProperty.call(partial, key)
      ? (partial[key] as CreateTransactionInput[Key])
      : existingValue
  const candidate = createTransactionSchema.parse({
    accountId: valueOrExisting("accountId", existing.accountId),
    transferAccountId: valueOrExisting(
      "transferAccountId",
      existing.transferAccountId ?? null
    ),
    title:
      valueOrExisting(
        "title",
        existing.title ??
          existing.merchant ??
          existing.note ??
          "Untitled transaction"
      ) ??
      existing.title ??
      existing.merchant ??
      existing.note ??
      "Untitled transaction",
    type: valueOrExisting("type", existing.type),
    status: valueOrExisting("status", existing.status),
    amount: valueOrExisting("amount", existing.amount),
    currency: valueOrExisting("currency", existing.currency),
    occurredAt: valueOrExisting("occurredAt", existing.occurredAt),
    merchant: valueOrExisting("merchant", existing.merchant),
    note: valueOrExisting("note", existing.note),
    reference: valueOrExisting("reference", existing.reference),
    categoryId: valueOrExisting("categoryId", existing.categoryId),
    recurringPaymentId: valueOrExisting(
      "recurringPaymentId",
      existing.recurringPaymentId
    ),
  })

  await assertTransactionResources(userId, candidate)

  const [updated] = await db
    .update(transaction)
    .set(candidate)
    .where(
      and(eq(transaction.id, transactionId), eq(transaction.userId, userId))
    )
    .returning()

  return updated
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const existing = await getTransaction(userId, transactionId)

  if (!existing) {
    throw notFound("Transaction not found.")
  }

  await db
    .delete(transaction)
    .where(
      and(eq(transaction.id, transactionId), eq(transaction.userId, userId))
    )
}

export async function voidTransaction(userId: string, transactionId: string) {
  const existing = await getTransaction(userId, transactionId)

  if (!existing) {
    throw notFound("Transaction not found.")
  }

  const [updated] = await db
    .update(transaction)
    .set({ status: "VOID" })
    .where(
      and(eq(transaction.id, transactionId), eq(transaction.userId, userId))
    )
    .returning()

  return updated
}

export async function getCategoryForTransactionValidation(
  userId: string,
  categoryId: string
) {
  const [row] = await db
    .select()
    .from(categoryTable)
    .where(
      and(eq(categoryTable.id, categoryId), eq(categoryTable.userId, userId))
    )
    .limit(1)

  return row ?? null
}
