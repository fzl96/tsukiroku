import Decimal from "decimal.js"
import { and, eq, or } from "drizzle-orm"

import { db } from "@/db"
import {
  financialAccount,
  recurringPayment,
  transaction,
} from "@/db/schema"
import { getFinancialAccount } from "@/features/accounts/queries"
import {
  createFinancialAccountSchema,
  reorderFinancialAccountsSchema,
  updateFinancialAccountSchema,
} from "@/features/accounts/validations"
import { notFound, validationError } from "@/lib/errors"
import { formatMoney } from "@/lib/money"

export async function createFinancialAccount(userId: string, input: unknown) {
  const data = createFinancialAccountSchema.parse(input)
  const [created] = await db
    .insert(financialAccount)
    .values({
      userId,
      ...data,
    })
    .returning()

  return created
}

export async function updateFinancialAccount(
  userId: string,
  accountId: string,
  input: unknown,
) {
  const existing = await getFinancialAccount(userId, accountId)

  if (!existing) {
    throw notFound("Account not found.")
  }

  const data = updateFinancialAccountSchema.parse(input)
  const [updated] = await db
    .update(financialAccount)
    .set(data)
    .where(
      and(
        eq(financialAccount.id, accountId),
        eq(financialAccount.userId, userId),
      ),
    )
    .returning()

  return updated
}

export async function archiveFinancialAccount(userId: string, accountId: string) {
  return updateFinancialAccount(userId, accountId, { isArchived: true })
}

export async function deleteFinancialAccount(userId: string, accountId: string) {
  const existing = await getFinancialAccount(userId, accountId)

  if (!existing) {
    throw notFound("Account not found.")
  }

  const [linkedTransaction] = await db
    .select({ id: transaction.id })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        or(
          eq(transaction.accountId, accountId),
          eq(transaction.transferAccountId, accountId),
        ),
      ),
    )
    .limit(1)

  if (linkedTransaction) {
    throw validationError("Archive accounts that have transactions.")
  }

  const [linkedRecurringPayment] = await db
    .select({ id: recurringPayment.id })
    .from(recurringPayment)
    .where(
      and(
        eq(recurringPayment.userId, userId),
        eq(recurringPayment.accountId, accountId),
      ),
    )
    .limit(1)

  if (linkedRecurringPayment) {
    throw validationError("Archive accounts that have recurring payments.")
  }

  await db
    .delete(financialAccount)
    .where(
      and(
        eq(financialAccount.id, accountId),
        eq(financialAccount.userId, userId),
      ),
    )
}

export async function getAccountBalance(userId: string, accountId: string) {
  const account = await getFinancialAccount(userId, accountId)

  if (!account) {
    throw notFound("Account not found.")
  }

  const rows = await db
    .select({
      accountId: transaction.accountId,
      transferAccountId: transaction.transferAccountId,
      type: transaction.type,
      amount: transaction.amount,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.status, "POSTED"),
        or(
          eq(transaction.accountId, accountId),
          eq(transaction.transferAccountId, accountId),
        ),
      ),
    )

  const balance = rows.reduce((total, row) => {
    const amount = new Decimal(row.amount)

    if (row.type === "INCOME" && row.accountId === accountId) {
      return total.plus(amount)
    }

    if (row.type === "EXPENSE" && row.accountId === accountId) {
      return total.minus(amount)
    }

    if (row.type === "TRANSFER" && row.accountId === accountId) {
      return total.minus(amount)
    }

    if (row.type === "TRANSFER" && row.transferAccountId === accountId) {
      return total.plus(amount)
    }

    return total
  }, new Decimal(account.initialBalance))

  return {
    accountId,
    amount: formatMoney(balance),
    currency: account.currency,
  }
}

export async function reorderFinancialAccounts(
  userId: string,
  orderedAccountIds: unknown,
) {
  const accountIds = reorderFinancialAccountsSchema.parse(orderedAccountIds)
  const accounts = await Promise.all(
    accountIds.map((accountId) => getFinancialAccount(userId, accountId)),
  )

  if (accounts.some((account) => !account)) {
    throw notFound("Account not found.")
  }

  await db.transaction(async (tx) => {
    await Promise.all(
      accountIds.map((accountId, displayOrder) =>
        tx
          .update(financialAccount)
          .set({ displayOrder })
          .where(
            and(
              eq(financialAccount.id, accountId),
              eq(financialAccount.userId, userId),
            ),
          ),
      ),
    )
  })
}
