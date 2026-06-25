import { describe, expect, test } from "bun:test"

import type { Category, Transaction } from "@/db/schema"

import {
  buildMonthlyCashflowBuckets,
  buildWeeklyCashflowBuckets,
  getMonthExpenseBreakdown,
  getMonthOverviewStats,
  getMonthStatement,
  getNetWorthSummary,
} from "./overview"

const salaryCategory = {
  id: "category_salary",
  name: "Salary",
  color: "#16a34a",
  kind: "INCOME",
} as Category

const housingCategory = {
  id: "category_housing",
  name: "Housing",
  color: "#dc2626",
  kind: "EXPENSE",
} as Category

const softwareCategory = {
  id: "category_software",
  name: "Software",
  color: "#9333ea",
  kind: "EXPENSE",
} as Category

function transactionFixture(
  overrides: Partial<Transaction> & Pick<Transaction, "id" | "occurredAt">
) {
  const { id, occurredAt, ...rest } = overrides

  return {
    accountId: "account_1",
    amount: "0.00",
    categoryId: null,
    createdAt: occurredAt,
    currency: "USD",
    id,
    merchant: null,
    note: null,
    occurredAt,
    recurringPaymentId: null,
    reference: null,
    status: "POSTED",
    title: null,
    transferAccountId: null,
    type: "EXPENSE",
    updatedAt: occurredAt,
    userId: "user_1",
    ...rest,
  } as Transaction
}

describe("finance overview helpers", () => {
  test("builds monthly cashflow buckets for the current year", () => {
    const buckets = buildMonthlyCashflowBuckets(
      [
        transactionFixture({
          id: "january_income",
          amount: "100.00",
          occurredAt: new Date("2026-01-12T08:00:00.000Z"),
          type: "INCOME",
        }),
        transactionFixture({
          id: "january_expense",
          amount: "25.50",
          occurredAt: new Date("2026-01-13T08:00:00.000Z"),
          type: "EXPENSE",
        }),
        transactionFixture({
          id: "june_income",
          amount: "50.00",
          occurredAt: new Date("2026-06-01T08:00:00.000Z"),
          type: "INCOME",
        }),
        transactionFixture({
          id: "previous_year_income",
          amount: "999.00",
          occurredAt: new Date("2025-12-31T08:00:00.000Z"),
          type: "INCOME",
        }),
        transactionFixture({
          id: "pending_expense",
          amount: "999.00",
          occurredAt: new Date("2026-06-03T08:00:00.000Z"),
          status: "PENDING",
          type: "EXPENSE",
        }),
      ],
      new Date("2026-06-25T00:00:00.000Z"),
      "UTC"
    )

    expect(buckets).toHaveLength(12)
    expect(buckets[0]).toMatchObject({
      key: "2026-01",
      label: "Jan",
      income: 100,
      expense: -25.5,
      incomeAmount: "100.00",
      expenseAmount: "25.50",
    })
    expect(buckets[5]).toMatchObject({
      key: "2026-06",
      label: "Jun",
      income: 50,
      expense: 0,
      incomeAmount: "50.00",
      expenseAmount: "0.00",
    })
  })

  test("builds daily cashflow buckets for the current user week", () => {
    const buckets = buildWeeklyCashflowBuckets(
      [
        transactionFixture({
          id: "monday_income",
          amount: "30.00",
          occurredAt: new Date("2026-06-22T10:00:00.000Z"),
          type: "INCOME",
        }),
        transactionFixture({
          id: "wednesday_expense",
          amount: "12.75",
          occurredAt: new Date("2026-06-24T10:00:00.000Z"),
          type: "EXPENSE",
        }),
        transactionFixture({
          id: "next_week_expense",
          amount: "90.00",
          occurredAt: new Date("2026-06-29T10:00:00.000Z"),
          type: "EXPENSE",
        }),
      ],
      new Date("2026-06-25T00:00:00.000Z"),
      "UTC",
      1
    )

    expect(buckets).toHaveLength(7)
    expect(buckets[0]).toMatchObject({
      key: "2026-06-22",
      label: "Mon",
      income: 30,
      expense: 0,
    })
    expect(buckets[2]).toMatchObject({
      key: "2026-06-24",
      label: "Wed",
      income: 0,
      expense: -12.75,
    })
    expect(buckets[6]).toMatchObject({
      key: "2026-06-28",
      label: "Sun",
      income: 0,
      expense: 0,
    })
  })

  test("summarizes month-to-date overview stats", () => {
    const stats = getMonthOverviewStats(
      [
        transactionFixture({
          id: "salary",
          amount: "1000.00",
          categoryId: salaryCategory.id,
          occurredAt: new Date("2026-06-05T10:00:00.000Z"),
          title: "June salary",
          type: "INCOME",
        }),
        transactionFixture({
          id: "rent",
          amount: "300.00",
          categoryId: housingCategory.id,
          merchant: "Landlord",
          occurredAt: new Date("2026-06-08T10:00:00.000Z"),
          title: "Rent",
          type: "EXPENSE",
        }),
        transactionFixture({
          id: "subscription",
          amount: "75.00",
          categoryId: softwareCategory.id,
          merchant: "Figma",
          occurredAt: new Date("2026-06-12T10:00:00.000Z"),
          title: "Design tools",
          type: "EXPENSE",
        }),
        transactionFixture({
          id: "transfer",
          amount: "200.00",
          occurredAt: new Date("2026-06-14T10:00:00.000Z"),
          type: "TRANSFER",
        }),
        transactionFixture({
          id: "void_expense",
          amount: "999.00",
          occurredAt: new Date("2026-06-15T10:00:00.000Z"),
          status: "VOID",
          type: "EXPENSE",
        }),
        transactionFixture({
          id: "previous_month_expense",
          amount: "500.00",
          occurredAt: new Date("2026-05-20T10:00:00.000Z"),
          type: "EXPENSE",
        }),
      ],
      [salaryCategory, housingCategory, softwareCategory],
      new Date("2026-06-25T00:00:00.000Z"),
      {
        monthStartDay: 1,
        timezone: "UTC",
      }
    )

    expect(stats).toEqual({
      totalIncome: "1000.00",
      totalExpense: "375.00",
      netCashflow: "625.00",
      transactionCount: 4,
      highestExpense: {
        amount: "300.00",
        categoryName: "Housing",
        currency: "USD",
        label: "Rent",
      },
      topExpenseCategory: {
        amount: "300.00",
        categoryName: "Housing",
        currency: "USD",
        transactionCount: 1,
      },
    })
  })

  test("sums net worth for base-currency accounts only", () => {
    const summary = getNetWorthSummary(
      [
        { amount: "1500.00", currency: "USD" },
        { amount: "2200.50", currency: "USD" },
        { amount: "9000.00", currency: "JPY" },
      ],
      "USD"
    )

    expect(summary).toEqual({
      amount: "3700.50",
      baseAccountCount: 2,
      otherCurrencyCount: 1,
    })
  })

  test("derives a savings-rate statement when income exists", () => {
    const statement = getMonthStatement({
      totalIncome: "1000.00",
      totalExpense: "375.00",
      netCashflow: "625.00",
    })

    expect(statement).toEqual({
      income: "1000.00",
      expense: "375.00",
      net: "625.00",
      savingsRate: 62.5,
      expenseRatio: 0.375,
      overspent: false,
    })
  })

  test("flags overspending and clamps the expense ratio", () => {
    const statement = getMonthStatement({
      totalIncome: "1000.00",
      totalExpense: "1400.00",
      netCashflow: "-400.00",
    })

    expect(statement.overspent).toBe(true)
    expect(statement.expenseRatio).toBe(1)
    expect(statement.savingsRate).toBe(-40)
  })

  test("returns no savings rate when there is no income", () => {
    const statement = getMonthStatement({
      totalIncome: "0.00",
      totalExpense: "120.00",
      netCashflow: "-120.00",
    })

    expect(statement.savingsRate).toBeNull()
    expect(statement.expenseRatio).toBe(0)
  })

  test("breaks down month expenses by category share", () => {
    const breakdown = getMonthExpenseBreakdown(
      [
        transactionFixture({
          id: "rent",
          amount: "300.00",
          categoryId: housingCategory.id,
          occurredAt: new Date("2026-06-08T10:00:00.000Z"),
          type: "EXPENSE",
        }),
        transactionFixture({
          id: "tools",
          amount: "75.00",
          categoryId: softwareCategory.id,
          occurredAt: new Date("2026-06-12T10:00:00.000Z"),
          type: "EXPENSE",
        }),
        transactionFixture({
          id: "uncategorized",
          amount: "25.00",
          occurredAt: new Date("2026-06-13T10:00:00.000Z"),
          type: "EXPENSE",
        }),
        transactionFixture({
          id: "income",
          amount: "1000.00",
          categoryId: salaryCategory.id,
          occurredAt: new Date("2026-06-05T10:00:00.000Z"),
          type: "INCOME",
        }),
        transactionFixture({
          id: "last_month",
          amount: "500.00",
          categoryId: housingCategory.id,
          occurredAt: new Date("2026-05-20T10:00:00.000Z"),
          type: "EXPENSE",
        }),
      ],
      [salaryCategory, housingCategory, softwareCategory],
      new Date("2026-06-25T00:00:00.000Z"),
      { monthStartDay: 1, timezone: "UTC" }
    )

    expect(breakdown.total).toBe("400.00")
    expect(breakdown.items).toHaveLength(3)
    expect(breakdown.items[0]).toMatchObject({
      categoryId: housingCategory.id,
      name: "Housing",
      color: "#dc2626",
      amount: "300.00",
      share: 0.75,
      transactionCount: 1,
    })
    expect(breakdown.items[2]).toMatchObject({
      categoryId: "uncategorized",
      name: "Uncategorized",
      color: null,
      amount: "25.00",
    })
  })
})
