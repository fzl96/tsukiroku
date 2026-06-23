import { describe, expect, test } from "bun:test"

import { updateUserFinanceSettingsSchema } from "./validations"

describe("settings validation", () => {
  test("accepts valid finance settings", () => {
    expect(
      updateUserFinanceSettingsSchema.parse({
        baseCurrency: "IDR",
        weekStartsOn: 1,
        monthStartDay: 1,
      }),
    ).toEqual({
      baseCurrency: "IDR",
      weekStartsOn: 1,
      monthStartDay: 1,
    })
  })

  test("rejects invalid currency and period values", () => {
    expect(() =>
      updateUserFinanceSettingsSchema.parse({
        baseCurrency: "idr",
        weekStartsOn: 7,
        monthStartDay: 32,
      }),
    ).toThrow()
  })
})
