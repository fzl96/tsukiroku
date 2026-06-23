import { describe, expect, test } from "bun:test"

import { createFinancialAccountSchema } from "./validations"

describe("account validation", () => {
  test("accepts a valid financial account", () => {
    expect(
      createFinancialAccountSchema.parse({
        name: "Cash",
        type: "CASH",
        currency: "IDR",
        initialBalance: "1000.5",
      }),
    ).toEqual({
      name: "Cash",
      type: "CASH",
      currency: "IDR",
      initialBalance: "1000.50",
    })
  })

  test("rejects negative initial balances", () => {
    expect(() =>
      createFinancialAccountSchema.parse({
        name: "Cash",
        type: "CASH",
        currency: "IDR",
        initialBalance: "-1",
      }),
    ).toThrow()
  })
})
