import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { financialAccount, transaction, type FinancialAccount } from "@/db/schema"
import {
  computeAccountBalances,
  type AccountBalance,
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
 * Computes balances for all given accounts using a single query over the user's
 * POSTED transactions, replacing the per-account N+1 pattern.
 */
export async function getAccountBalances(
  userId: string,
  accounts: FinancialAccount[]
): Promise<AccountBalance[]> {
  if (!accounts.length) {
    return []
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
        eq(transaction.status, "POSTED")
      )
    )

  return computeAccountBalances(accounts, rows)
}
