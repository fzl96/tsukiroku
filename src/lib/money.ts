import Decimal from "decimal.js"

export function toDecimal(value: string | number | Decimal) {
  try {
    return new Decimal(value)
  } catch {
    throw new Error("Amount must be valid")
  }
}

export function formatMoney(value: Decimal.Value) {
  return new Decimal(value).toFixed(2)
}

export function formatCurrencyAmount(
  value: Decimal.Value,
  currency: string,
  options: { negative?: boolean } = {}
) {
  const decimal = new Decimal(value)
  const signed = options.negative ? decimal.negated() : decimal
  const sign = signed.isNegative() ? "-" : ""
  const [whole, fraction] = signed.abs().toFixed(2).split(".")
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")

  return `${sign}${currency.toUpperCase()} ${groupedWhole}.${fraction}`
}

export function assertPositiveMoney(value: string) {
  const decimal = toDecimal(value)

  if (!decimal.isFinite()) {
    throw new Error("Amount must be valid")
  }

  if (decimal.lte(0)) {
    throw new Error("Amount must be greater than 0")
  }

  return formatMoney(decimal)
}

export function assertNonNegativeMoney(value: string) {
  const decimal = toDecimal(value)

  if (!decimal.isFinite()) {
    throw new Error("Amount must be valid")
  }

  if (decimal.lt(0)) {
    throw new Error("Amount must be greater than or equal to 0")
  }

  return formatMoney(decimal)
}

export function addMoney(left: string, right: string) {
  return formatMoney(toDecimal(left).plus(toDecimal(right)))
}

export function subtractMoney(left: string, right: string) {
  return formatMoney(toDecimal(left).minus(toDecimal(right)))
}

export function sumMoney(values: string[]) {
  return formatMoney(
    values.reduce((total, value) => total.plus(value), new Decimal(0))
  )
}
