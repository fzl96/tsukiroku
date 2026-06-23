import { describe, expect, test } from "bun:test"

import { createCategorySchema } from "./validations"

describe("category validation", () => {
  test("accepts a valid category", () => {
    expect(
      createCategorySchema.parse({
        name: "Food",
        kind: "EXPENSE",
        color: "#f97316",
        icon: "utensils",
      }),
    ).toEqual({
      name: "Food",
      kind: "EXPENSE",
      color: "#f97316",
      icon: "utensils",
    })
  })

  test("rejects blank category names", () => {
    expect(() =>
      createCategorySchema.parse({
        name: "",
        kind: "EXPENSE",
      }),
    ).toThrow()
  })
})
