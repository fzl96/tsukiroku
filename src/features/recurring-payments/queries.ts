import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { recurringPayment } from "@/db/schema"
import { listRecurringPaymentsFiltersSchema } from "@/features/recurring-payments/validations"

export async function getRecurringPayment(
  userId: string,
  recurringPaymentId: string,
) {
  const [row] = await db
    .select()
    .from(recurringPayment)
    .where(
      and(
        eq(recurringPayment.id, recurringPaymentId),
        eq(recurringPayment.userId, userId),
      ),
    )
    .limit(1)

  return row ?? null
}

export async function listRecurringPayments(userId: string, filters?: unknown) {
  const parsedFilters = listRecurringPaymentsFiltersSchema.parse(filters)
  const conditions = [eq(recurringPayment.userId, userId)]

  if (parsedFilters?.accountId) {
    conditions.push(eq(recurringPayment.accountId, parsedFilters.accountId))
  }

  if (parsedFilters?.status) {
    conditions.push(eq(recurringPayment.status, parsedFilters.status))
  } else if (!parsedFilters?.includeInactive) {
    conditions.push(eq(recurringPayment.status, "ACTIVE"))
  }

  return db
    .select()
    .from(recurringPayment)
    .where(and(...conditions))
    .orderBy(asc(recurringPayment.nextDueDate), asc(recurringPayment.name))
}
