import Decimal from "decimal.js"

import type { Money } from "@/features/dashboard/types"
import { formatMoney } from "@/lib/money"

function addToMap(map: Map<string, Decimal>, money: Money, multiplier: 1 | -1) {
  const current = map.get(money.currency) ?? new Decimal(0)
  map.set(money.currency, current.plus(new Decimal(money.amount).times(multiplier)))
}

export function getNetCashflowByCurrency(income: Money[], expense: Money[]) {
  const totals = new Map<string, Decimal>()

  for (const item of income) {
    addToMap(totals, item, 1)
  }

  for (const item of expense) {
    addToMap(totals, item, -1)
  }

  return [...totals.entries()]
    .sort(([leftCurrency], [rightCurrency]) =>
      leftCurrency.localeCompare(rightCurrency),
    )
    .map(([currency, amount]) => ({
      amount: formatMoney(amount),
      currency,
    }))
}
