import { describe, expect, test } from "bun:test"

import {
  getPeriodRange,
  groupCategoriesByKind,
  parseFilterIds,
  parsePeriod,
  parseTransactionTypeFilter,
  toggleFilterId,
} from "./filters"

describe("finance filters", () => {
  test("parses unknown periods as all", () => {
    expect(parsePeriod(undefined)).toBe("all")
    expect(parsePeriod("decade")).toBe("all")
    expect(parsePeriod(["week", "month"])).toBe("all")
  })

  test("parses transaction type filters", () => {
    expect(parseTransactionTypeFilter(undefined)).toBe("all")
    expect(parseTransactionTypeFilter("INCOME")).toBe("INCOME")
    expect(parseTransactionTypeFilter("EXPENSE")).toBe("EXPENSE")
    expect(parseTransactionTypeFilter("TRANSFER")).toBe("TRANSFER")
    expect(parseTransactionTypeFilter("UNKNOWN")).toBe("all")
    expect(parseTransactionTypeFilter(["INCOME", "EXPENSE"])).toBe("all")
  })

  test("returns no date range for all time", () => {
    expect(getPeriodRange("all", new Date(2026, 5, 17, 12))).toBeNull()
  })

  test("builds a Monday-start week range", () => {
    expect(getPeriodRange("week", new Date(2026, 5, 17, 12))).toEqual({
      from: new Date(2026, 5, 15, 0, 0, 0, 0),
      toExclusive: new Date(2026, 5, 22, 0, 0, 0, 0),
    })
  })

  test("builds a calendar month range", () => {
    expect(getPeriodRange("month", new Date(2026, 5, 17, 12))).toEqual({
      from: new Date(2026, 5, 1, 0, 0, 0, 0),
      toExclusive: new Date(2026, 6, 1, 0, 0, 0, 0),
    })
  })

  test("builds a calendar year range", () => {
    expect(getPeriodRange("year", new Date(2026, 5, 17, 12))).toEqual({
      from: new Date(2026, 0, 1, 0, 0, 0, 0),
      toExclusive: new Date(2027, 0, 1, 0, 0, 0, 0),
    })
  })

  test("builds a timezone-aware month range", () => {
    expect(
      getPeriodRange("month", new Date("2026-06-24T03:00:00.000Z"), {
        monthStartDay: 1,
        timezone: "Asia/Jakarta",
        weekStartsOn: 1,
      })
    ).toEqual({
      from: new Date("2026-05-31T17:00:00.000Z"),
      toExclusive: new Date("2026-06-30T17:00:00.000Z"),
    })
  })

  test("groups categories by income and expense", () => {
    const categories = [
      { id: "salary", name: "Salary", kind: "INCOME" },
      { id: "groceries", name: "Groceries", kind: "EXPENSE" },
      { id: "gift", name: "Gift", kind: "INCOME" },
    ] as const

    expect(groupCategoriesByKind(categories)).toEqual({
      income: [categories[0], categories[2]],
      expense: [categories[1]],
    })
  })

  test("parses repeated filter ids", () => {
    expect(parseFilterIds(undefined)).toEqual([])
    expect(parseFilterIds("bank")).toEqual(["bank"])
    expect(parseFilterIds(["bank", "cash", "bank", ""])).toEqual([
      "bank",
      "cash",
    ])
  })

  test("toggles filter ids without mutating the original list", () => {
    const selected = ["bank", "cash"]

    expect(toggleFilterId(selected, "credit")).toEqual([
      "bank",
      "cash",
      "credit",
    ])
    expect(toggleFilterId(selected, "bank")).toEqual(["cash"])
    expect(selected).toEqual(["bank", "cash"])
  })
})
