import type { FinanceSnapshot } from "@/features/finances/queries"

export function financeFixture(): FinanceSnapshot {
  const now = new Date()
  const base = { userId: "fixture-user", createdAt: now, updatedAt: now }
  return {
    userId: base.userId,
    asOf: now,
    needsTimezone: false,
    settings: {
      baseCurrency: "USD",
      timezone: "UTC",
      monthStartDay: 1,
      weekStartsOn: 1,
    },
    accounts: [
      {
        ...base,
        id: "checking",
        name: "Checking",
        type: "BANK",
        currency: "USD",
        initialBalance: "1000.00",
        displayOrder: 0,
        color: null,
        isArchived: false,
      },
      {
        ...base,
        id: "savings",
        name: "Savings",
        type: "BANK",
        currency: "USD",
        initialBalance: "500.00",
        displayOrder: 1,
        color: null,
        isArchived: false,
      },
    ],
    categories: [
      {
        ...base,
        id: "food",
        name: "Food",
        kind: "EXPENSE",
        color: null,
        icon: null,
        isArchived: false,
      },
    ],
    transactions: [
      {
        ...base,
        id: "lunch",
        accountId: "checking",
        transferAccountId: null,
        title: "Lunch",
        type: "EXPENSE",
        status: "POSTED",
        amount: "20.00",
        currency: "USD",
        occurredAt: now,
        merchant: null,
        note: null,
        reference: null,
        categoryId: "food",
        recurringPaymentId: null,
      },
    ],
    recurringPayments: [
      {
        ...base,
        id: "rent",
        accountId: "checking",
        categoryId: "food",
        merchant: "Landlord",
        name: "Rent",
        type: "EXPENSE",
        amount: "100.00",
        currency: "USD",
        frequency: "MONTHLY",
        intervalCount: 1,
        lastRecordedAt: null,
        startDate: null,
        nextDueDate: now,
        endDate: null,
        status: "ACTIVE",
        note: "Monthly rent",
      },
    ],
  }
}
