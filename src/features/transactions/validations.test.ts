import { describe, expect, test } from "bun:test"

import {
  createTransactionSchema,
  listTransactionsFiltersSchema,
} from "./validations"

const baseInput = {
  accountId: "account_1",
  amount: "12.5",
  currency: "IDR",
  occurredAt: new Date("2026-07-01T00:00:00.000Z"),
}

describe("transaction validation", () => {
  test("accepts income transactions without transfer account", () => {
    expect(
      createTransactionSchema.parse({
        ...baseInput,
        type: "INCOME",
        categoryId: "category_1",
      })
    ).toMatchObject({
      type: "INCOME",
      status: "POSTED",
      amount: "12.50",
      transferAccountId: null,
    })
  })

  test("rejects income transactions with transfer account", () => {
    expect(() =>
      createTransactionSchema.parse({
        ...baseInput,
        type: "INCOME",
        transferAccountId: "account_2",
      })
    ).toThrow()
  })

  test("accepts transfer transactions with destination account", () => {
    expect(
      createTransactionSchema.parse({
        ...baseInput,
        type: "TRANSFER",
        transferAccountId: "account_2",
      })
    ).toMatchObject({
      type: "TRANSFER",
      categoryId: null,
      recurringPaymentId: null,
    })
  })

  test("rejects transfer transactions without destination account", () => {
    expect(() =>
      createTransactionSchema.parse({
        ...baseInput,
        type: "TRANSFER",
      })
    ).toThrow()
  })

  test("rejects transfer transactions with category or recurring payment", () => {
    expect(() =>
      createTransactionSchema.parse({
        ...baseInput,
        type: "TRANSFER",
        transferAccountId: "account_2",
        categoryId: "category_1",
      })
    ).toThrow()

    expect(() =>
      createTransactionSchema.parse({
        ...baseInput,
        type: "TRANSFER",
        transferAccountId: "account_2",
        recurringPaymentId: "recurring_1",
      })
    ).toThrow()
  })

  test("accepts multiple account and category filters", () => {
    expect(
      listTransactionsFiltersSchema.parse({
        accountIds: ["bank", "cash"],
        categoryIds: ["salary", "groceries"],
      })
    ).toEqual({
      accountIds: ["bank", "cash"],
      categoryIds: ["salary", "groceries"],
    })
  })
})
