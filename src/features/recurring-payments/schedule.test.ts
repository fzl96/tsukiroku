import { describe, expect, test } from "bun:test"

import {
  addRecurringInterval,
  generateRecurringForecastItems,
} from "./schedule"

const recurringPayment = {
  id: "recurring_1",
  name: "Rent",
  merchant: null,
  type: "EXPENSE" as const,
  accountId: "account_1",
  categoryId: "category_1",
  amount: "100.00",
  currency: "IDR",
  frequency: "MONTHLY" as const,
  intervalCount: 1,
  nextDueDate: new Date("2026-07-01T00:00:00.000Z"),
  endDate: null,
}

describe("recurring payment schedule", () => {
  test("adds recurring intervals by frequency", () => {
    const date = new Date("2026-07-01T00:00:00.000Z")

    expect(addRecurringInterval(date, "DAILY", 2).toISOString()).toBe(
      "2026-07-03T00:00:00.000Z",
    )
    expect(addRecurringInterval(date, "WEEKLY", 2).toISOString()).toBe(
      "2026-07-15T00:00:00.000Z",
    )
    expect(addRecurringInterval(date, "MONTHLY", 2).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    )
    expect(addRecurringInterval(date, "YEARLY", 2).toISOString()).toBe(
      "2028-07-01T00:00:00.000Z",
    )
  })

  test("generates active forecast items through date range", () => {
    const items = generateRecurringForecastItems([recurringPayment], {
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-09-15T00:00:00.000Z"),
    })

    expect(items.map((item) => item.scheduledFor.toISOString())).toEqual([
      "2026-07-01T00:00:00.000Z",
      "2026-08-01T00:00:00.000Z",
      "2026-09-01T00:00:00.000Z",
    ])
  })

  test("does not generate forecast items after end date", () => {
    const items = generateRecurringForecastItems(
      [
        {
          ...recurringPayment,
          endDate: new Date("2026-08-01T00:00:00.000Z"),
        },
      ],
      {
        from: new Date("2026-07-01T00:00:00.000Z"),
        to: new Date("2026-09-15T00:00:00.000Z"),
      },
    )

    expect(items.map((item) => item.scheduledFor.toISOString())).toEqual([
      "2026-07-01T00:00:00.000Z",
      "2026-08-01T00:00:00.000Z",
    ])
  })
})
