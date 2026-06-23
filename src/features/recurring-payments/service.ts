import { and, eq, gte, inArray, lte } from "drizzle-orm"

import { db } from "@/db"
import { recurringPayment, transaction } from "@/db/schema"
import { getFinancialAccount } from "@/features/accounts/queries"
import { getCategory } from "@/features/categories/queries"
import {
  addRecurringInterval,
  generateRecurringForecastItems,
} from "@/features/recurring-payments/schedule"
import { getRecurringPayment } from "@/features/recurring-payments/queries"
import {
  createRecurringPaymentSchema,
  recordRecurringPaymentOptionsSchema,
  recurringForecastParamsSchema,
  updateRecurringPaymentSchema,
  type CreateRecurringPaymentInput,
} from "@/features/recurring-payments/validations"
import { appError, notFound } from "@/lib/errors"

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

async function assertRecurringResources(
  userId: string,
  data: Pick<
    CreateRecurringPaymentInput,
    "accountId" | "categoryId" | "type"
  >,
) {
  const account = await getFinancialAccount(userId, data.accountId)

  if (!account) {
    throw notFound("Account not found.")
  }

  if (account.isArchived) {
    throw appError("ACCOUNT_ARCHIVED", "Archived accounts cannot be used.")
  }

  if (!data.categoryId) {
    return
  }

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
      "Category kind must match recurring payment type.",
    )
  }
}

export async function createRecurringPayment(userId: string, input: unknown) {
  const data = createRecurringPaymentSchema.parse(input)
  await assertRecurringResources(userId, data)

  const [created] = await db
    .insert(recurringPayment)
    .values({
      userId,
      ...data,
    })
    .returning()

  return created
}

export async function updateRecurringPayment(
  userId: string,
  recurringPaymentId: string,
  input: unknown,
) {
  const existing = await getRecurringPayment(userId, recurringPaymentId)

  if (!existing) {
    throw notFound("Recurring payment not found.")
  }

  const data = updateRecurringPaymentSchema.parse(input)
  const candidate = {
    accountId: data.accountId ?? existing.accountId,
    categoryId:
      data.categoryId === undefined ? existing.categoryId : data.categoryId,
    type: data.type ?? (existing.type as "INCOME" | "EXPENSE"),
  }

  await assertRecurringResources(userId, candidate)

  const [updated] = await db
    .update(recurringPayment)
    .set(data)
    .where(
      and(
        eq(recurringPayment.id, recurringPaymentId),
        eq(recurringPayment.userId, userId),
      ),
    )
    .returning()

  return updated
}

export async function pauseRecurringPayment(
  userId: string,
  recurringPaymentId: string,
) {
  return updateRecurringPayment(userId, recurringPaymentId, { status: "PAUSED" })
}

export async function cancelRecurringPayment(
  userId: string,
  recurringPaymentId: string,
) {
  return updateRecurringPayment(userId, recurringPaymentId, {
    status: "CANCELED",
  })
}

export async function deleteRecurringPayment(
  userId: string,
  recurringPaymentId: string,
) {
  const existing = await getRecurringPayment(userId, recurringPaymentId)

  if (!existing) {
    throw notFound("Recurring payment not found.")
  }

  await db
    .delete(recurringPayment)
    .where(
      and(
        eq(recurringPayment.id, recurringPaymentId),
        eq(recurringPayment.userId, userId),
      ),
    )
}

export async function generateRecurringPaymentForecast(
  userId: string,
  params: unknown,
) {
  const data = recurringForecastParamsSchema.parse(params)
  const recurringPayments = await listActiveForecastableRecurringPayments(userId)

  return generateRecurringForecastItems(recurringPayments, data)
}

async function listActiveForecastableRecurringPayments(userId: string) {
  const rows = await db
    .select({
      id: recurringPayment.id,
      name: recurringPayment.name,
      merchant: recurringPayment.merchant,
      type: recurringPayment.type,
      accountId: recurringPayment.accountId,
      categoryId: recurringPayment.categoryId,
      amount: recurringPayment.amount,
      currency: recurringPayment.currency,
      frequency: recurringPayment.frequency,
      intervalCount: recurringPayment.intervalCount,
      nextDueDate: recurringPayment.nextDueDate,
      endDate: recurringPayment.endDate,
    })
    .from(recurringPayment)
    .where(
      and(
        eq(recurringPayment.userId, userId),
        eq(recurringPayment.status, "ACTIVE"),
        inArray(recurringPayment.type, ["INCOME", "EXPENSE"]),
      ),
    )

  return rows.map((row) => ({
    ...row,
    type: row.type as "INCOME" | "EXPENSE",
  }))
}

export async function recordRecurringPayment(
  userId: string,
  recurringPaymentId: string,
  options?: unknown,
) {
  const data = recordRecurringPaymentOptionsSchema.parse(options)
  const recurring = await getRecurringPayment(userId, recurringPaymentId)

  if (!recurring) {
    throw notFound("Recurring payment not found.")
  }

  if (recurring.status !== "ACTIVE") {
    throw appError(
      "RECURRING_PAYMENT_INACTIVE",
      "Only active recurring payments can be recorded.",
    )
  }

  const windowStart = addDays(recurring.nextDueDate, -3)
  const windowEnd = addDays(recurring.nextDueDate, 3)

  if (!data?.allowDuplicate) {
    const [duplicate] = await db
      .select({ id: transaction.id })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, userId),
          eq(transaction.recurringPaymentId, recurringPaymentId),
          gte(transaction.occurredAt, windowStart),
          lte(transaction.occurredAt, windowEnd),
        ),
      )
      .limit(1)

    if (duplicate) {
      throw appError(
        "DUPLICATE_RECURRING_RECORD",
        "Recurring payment has already been recorded near this due date.",
      )
    }
  }

  const nextDueDate = addRecurringInterval(
    recurring.nextDueDate,
    recurring.frequency,
    recurring.intervalCount,
  )
  const nextStatus =
    recurring.endDate && nextDueDate > recurring.endDate ? "ENDED" : "ACTIVE"

  return db.transaction(async (tx) => {
    const [createdTransaction] = await tx
      .insert(transaction)
      .values({
        userId,
        accountId: recurring.accountId,
        transferAccountId: null,
        type: recurring.type,
        status: data?.status ?? "POSTED",
        amount: recurring.amount,
        currency: recurring.currency,
        occurredAt: data?.occurredAt ?? new Date(),
        merchant: recurring.merchant,
        note: recurring.note,
        reference: null,
        categoryId: recurring.categoryId,
        recurringPaymentId,
      })
      .returning()

    const [updatedRecurringPayment] = await tx
      .update(recurringPayment)
      .set({
        lastRecordedAt: createdTransaction.occurredAt,
        nextDueDate,
        status: nextStatus,
      })
      .where(
        and(
          eq(recurringPayment.id, recurringPaymentId),
          eq(recurringPayment.userId, userId),
        ),
      )
      .returning()

    return {
      transaction: createdTransaction,
      recurringPayment: updatedRecurringPayment,
    }
  })
}
