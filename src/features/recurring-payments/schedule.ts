import type {
  RecurringFrequency,
  RecurringPaymentType,
} from "@/features/recurring-payments/validations"

export type RecurringPaymentForecastItem = {
  recurringPaymentId: string
  name: string
  merchant: string | null
  type: RecurringPaymentType
  accountId: string
  categoryId: string | null
  amount: string
  currency: string
  scheduledFor: Date
}

export type ForecastableRecurringPayment = {
  id: string
  name: string
  merchant: string | null
  type: RecurringPaymentType
  accountId: string
  categoryId: string | null
  amount: string
  currency: string
  frequency: RecurringFrequency
  intervalCount: number
  nextDueDate: Date
  endDate: Date | null
}

export function addRecurringInterval(
  date: Date,
  frequency: RecurringFrequency,
  intervalCount: number,
) {
  const next = new Date(date)

  if (frequency === "DAILY") {
    next.setUTCDate(next.getUTCDate() + intervalCount)
  } else if (frequency === "WEEKLY") {
    next.setUTCDate(next.getUTCDate() + intervalCount * 7)
  } else if (frequency === "MONTHLY") {
    next.setUTCMonth(next.getUTCMonth() + intervalCount)
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + intervalCount)
  }

  return next
}

export function generateRecurringForecastItems(
  recurringPayments: ForecastableRecurringPayment[],
  params: { from: Date; to: Date },
) {
  const items: RecurringPaymentForecastItem[] = []

  for (const recurringPayment of recurringPayments) {
    let scheduledFor = new Date(recurringPayment.nextDueDate)

    while (scheduledFor < params.from) {
      scheduledFor = addRecurringInterval(
        scheduledFor,
        recurringPayment.frequency,
        recurringPayment.intervalCount,
      )
    }

    while (
      scheduledFor <= params.to &&
      (!recurringPayment.endDate || scheduledFor <= recurringPayment.endDate)
    ) {
      items.push({
        recurringPaymentId: recurringPayment.id,
        name: recurringPayment.name,
        merchant: recurringPayment.merchant,
        type: recurringPayment.type,
        accountId: recurringPayment.accountId,
        categoryId: recurringPayment.categoryId,
        amount: recurringPayment.amount,
        currency: recurringPayment.currency,
        scheduledFor: new Date(scheduledFor),
      })

      scheduledFor = addRecurringInterval(
        scheduledFor,
        recurringPayment.frequency,
        recurringPayment.intervalCount,
      )
    }
  }

  return items.sort(
    (left, right) => left.scheduledFor.getTime() - right.scheduledFor.getTime(),
  )
}
