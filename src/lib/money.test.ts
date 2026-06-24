import { describe, expect, test } from "bun:test"

import {
  addMoney,
  assertPositiveMoney,
  formatCurrencyAmount,
  subtractMoney,
  sumMoney,
} from "./money"

describe("money helpers", () => {
  test("accepts positive decimal strings and normalizes to two decimals", () => {
    expect(assertPositiveMoney("1000")).toBe("1000.00")
    expect(assertPositiveMoney("1000.5")).toBe("1000.50")
    expect(assertPositiveMoney("1000.55")).toBe("1000.55")
  })

  test("rejects zero, negative, and invalid money values", () => {
    expect(() => assertPositiveMoney("0")).toThrow(
      "Amount must be greater than 0"
    )
    expect(() => assertPositiveMoney("-1")).toThrow(
      "Amount must be greater than 0"
    )
    expect(() => assertPositiveMoney("abc")).toThrow("Amount must be valid")
  })

  test("adds and subtracts decimal strings safely", () => {
    expect(addMoney("0.10", "0.20")).toBe("0.30")
    expect(subtractMoney("1.00", "0.10")).toBe("0.90")
  })

  test("sums decimal strings without floating point drift", () => {
    expect(sumMoney(["0.10", "0.20", "0.30"])).toBe("0.60")
  })

  test("formats currency display with deterministic fraction digits", () => {
    expect(formatCurrencyAmount("89000", "IDR", { negative: true })).toBe(
      "-IDR 89,000.00"
    )
    expect(formatCurrencyAmount("500000", "idr")).toBe("IDR 500,000.00")
  })
})
