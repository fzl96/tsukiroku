import { describe, expect, test } from "bun:test"

import { getNetCashflowByCurrency } from "./summary"

describe("dashboard summary helpers", () => {
  test("groups net cashflow by currency without number arithmetic", () => {
    expect(
      getNetCashflowByCurrency(
        [
          { amount: "0.10", currency: "IDR" },
          { amount: "10.00", currency: "USD" },
        ],
        [
          { amount: "0.20", currency: "IDR" },
          { amount: "3.50", currency: "USD" },
        ],
      ),
    ).toEqual([
      { amount: "-0.10", currency: "IDR" },
      { amount: "6.50", currency: "USD" },
    ])
  })
})
