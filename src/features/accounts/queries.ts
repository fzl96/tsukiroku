import { and, asc, eq, isNotNull, sql } from "drizzle-orm"

import { db } from "@/db"
import { financialAccount, transaction, type FinancialAccount } from "@/db/schema"
import {
  computeAccountBalances,
  type AccountBalance,
  type AccountBalanceInput,
} from "@/features/accounts/balances"
import { listFinancialAccountsFiltersSchema } from "@/features/accounts/validations"

export async function getFinancialAccount(userId: string, accountId: string) {
  const [account] = await db
    .select()
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.id, accountId),
        eq(financialAccount.userId, userId),
      ),
    )
    .limit(1)

  return account ?? null
}

export async function listFinancialAccounts(userId: string, filters?: unknown) {
  const parsedFilters = listFinancialAccountsFiltersSchema.parse(filters)
  const conditions = [eq(financialAccount.userId, userId)]

  if (!parsedFilters?.includeArchived) {
    conditions.push(eq(financialAccount.isArchived, false))
  }

  return db
    .select()
    .from(financialAccount)
    .where(and(...conditions))
    .orderBy(asc(financialAccount.displayOrder), asc(financialAccount.name))
}

/**
 * Computes balances for all given accounts using two grouped aggregate queries
 * over the user's POSTED transactions, transferring O(accounts x types) rows
 * instead of the full history.
 */
export async function getAccountBalances(
  userId: string,
  accounts: FinancialAccount[]
): Promise<AccountBalance[]> {
  if (!accounts.length) {
    return []
  }

  const postedByUser = and(
    eq(transaction.userId, userId),
    eq(transaction.status, "POSTED")
  )

  const [outgoing, incoming] = await Promise.all([
    db
      .select({
        accountId: transaction.accountId,
        type: transaction.type,
        total: sql<string>`coalesce(sum(${transaction.amount}), 0)`,
      })
      .from(transaction)
      .where(postedByUser)
      .groupBy(transaction.accountId, transaction.type),
    db
      .select({
        accountId: transaction.transferAccountId,
        total: sql<string>`coalesce(sum(${transaction.amount}), 0)`,
      })
      .from(transaction)
      .where(
        and(
          postedByUser,
          eq(transaction.type, "TRANSFER"),
          isNotNull(transaction.transferAccountId)
        )
      )
      .groupBy(transaction.transferAccountId),
  ])

  const inputs = new Map<string, AccountBalanceInput>()
  const ensure = (accountId: string) => {
    let input = inputs.get(accountId)
    if (!input) {
      input = {
        accountId,
        income: "0",
        expense: "0",
        transferIn: "0",
        transferOut: "0",
      }
      inputs.set(accountId, input)
    }
    return input
  }

  for (const row of outgoing) {
    const input = ensure(row.accountId)
    if (row.type === "INCOME") {
      input.income = row.total
    } else if (row.type === "EXPENSE") {
      input.expense = row.total
    } else if (row.type === "TRANSFER") {
      input.transferOut = row.total
    }
  }

  for (const row of incoming) {
    if (!row.accountId) {
      continue
    }
    ensure(row.accountId).transferIn = row.total
  }

  return computeAccountBalances(accounts, [...inputs.values()])
}
