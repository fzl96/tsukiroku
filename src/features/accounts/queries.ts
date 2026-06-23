import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { financialAccount } from "@/db/schema"
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
