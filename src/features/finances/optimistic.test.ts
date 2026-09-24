import { describe, expect, test } from "bun:test"
import {
  applyFinanceMutation,
  reconcileFinanceMutation,
} from "@/features/finances/optimistic"
import {
  financeCommandSchema,
  type FinanceCommand,
  type FinanceMutation,
} from "@/features/finances/validations"
import {
  aggregateBalanceRows,
  computeAccountBalances,
} from "@/features/accounts/balances"
import { financeFixture } from "@/features/finances/test-fixtures"

function mutation(command: FinanceCommand): FinanceMutation {
  return { command, clientId: crypto.randomUUID(), submittedAt: new Date() }
}

describe("optimistic finance state", () => {
  test("projects transfers into both balances without changing confirmed data", () => {
    const base = financeFixture()
    const command = financeCommandSchema.parse({
      type: "transaction.create",
      data: {
        accountId: "checking",
        transferAccountId: "savings",
        title: "Move savings",
        type: "TRANSFER",
        amount: "50",
        currency: "USD",
        occurredAt: new Date(),
      },
    })
    const projected = applyFinanceMutation(base, mutation(command))
    const balances = computeAccountBalances(
      projected.accounts,
      aggregateBalanceRows(
        projected.transactions.filter((row) => row.status === "POSTED")
      )
    )
    expect(balances.map((row) => row.amount)).toEqual(["930.00", "550.00"])
    expect(base.transactions).toHaveLength(1)
  })
  test("rolling back one queued command preserves another pending edit", () => {
    const base = financeFixture()
    const failed = mutation({ type: "transaction.delete", id: "lunch" })
    const retained = mutation({
      type: "account.update",
      id: "savings",
      data: { name: "Travel" },
    })
    const both = [failed, retained].reduce(applyFinanceMutation, base)
    expect(both.transactions).toHaveLength(0)
    const rollback = [retained].reduce(applyFinanceMutation, base)
    expect(rollback.transactions).toHaveLength(1)
    expect(rollback.accounts[1].name).toBe("Travel")
  })
  test("recording recurring payment updates ledger and next due date together", () => {
    const base = financeFixture()
    const next = applyFinanceMutation(
      base,
      mutation({ type: "recurring.record", id: "rent", data: undefined })
    )
    expect(next.transactions).toHaveLength(2)
    expect(next.transactions[0].recurringPaymentId).toBe("rent")
    expect(
      next.recurringPayments[0].nextDueDate >
        base.recurringPayments[0].nextDueDate
    ).toBe(true)
    expect(next.recurringPayments[0].lastRecordedAt).not.toBeNull()
  })
  test("pausing a recurring payment preserves its category merchant and note", () => {
    const command = financeCommandSchema.parse({
      type: "recurring.update",
      id: "rent",
      data: { status: "PAUSED" },
    })
    const next = applyFinanceMutation(financeFixture(), mutation(command))
    expect(next.recurringPayments[0]).toMatchObject({
      status: "PAUSED",
      categoryId: "food",
      merchant: "Landlord",
      note: "Monthly rent",
    })
  })
  test("pending records cannot be edited using their temporary IDs", () => {
    expect(
      financeCommandSchema.safeParse({
        type: "transaction.delete",
        id: "optimistic:abc",
      }).success
    ).toBe(false)
  })
  test("a confirmed create replaces the temporary row with the server ID", () => {
    const base = financeFixture()
    const command = financeCommandSchema.parse({
      type: "category.create",
      data: { name: "Travel", kind: "EXPENSE" },
    })
    const input = mutation(command)
    const optimistic = applyFinanceMutation(base, input)
    const record = { ...optimistic.categories[1], id: "server-id" }
    const confirmed = reconcileFinanceMutation(base, input, {
      category: record,
    })
    expect(confirmed.categories).toHaveLength(2)
    expect(confirmed.categories[1].id).toBe("server-id")
    expect(
      confirmed.categories.some((row) => row.id.startsWith("optimistic:"))
    ).toBe(false)
  })
})
