"use client"

import * as React from "react"

import type { FinancialAccount } from "@/db/schema"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

type AccountBalance = {
  accountId: string
  amount: string
  currency: string
}

type AccountSelectWithBalanceProps = {
  accounts: FinancialAccount[]
  disabled?: boolean
  id?: string
  name?: string
  balances: AccountBalance[]
  onBlur?: React.FocusEventHandler<HTMLSelectElement>
  onValueChange?: (value: string) => void
  value?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

function formatBalance(amount: string, currency: string) {
  const value = Number(amount)

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

export function AccountSelectWithBalance({
  accounts,
  disabled,
  id,
  name,
  balances,
  onBlur,
  onValueChange,
  value,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: AccountSelectWithBalanceProps) {
  const [selectedAccountId, setSelectedAccountId] = React.useState(
    accounts[0]?.id ?? ""
  )
  const currentAccountId = value ?? selectedAccountId
  const selectedAccount =
    accounts.find((account) => account.id === currentAccountId) ?? null
  const selectedBalance =
    balances.find((balance) => balance.accountId === currentAccountId) ?? null

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextValue = event.target.value
    setSelectedAccountId(nextValue)
    onValueChange?.(nextValue)
  }

  return (
    <div>
      <NativeSelect
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className="w-full [&_select]:h-12 [&_select]:text-base"
        disabled={disabled}
        id={id}
        name={name}
        onBlur={onBlur}
        onChange={handleChange}
        value={currentAccountId}
      >
        {accounts.length ? null : (
          <NativeSelectOption value="">No accounts yet</NativeSelectOption>
        )}
        {accounts.map((account) => (
          <NativeSelectOption key={account.id} value={account.id}>
            {account.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <div className="mt-3 border border-border p-4">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          Current balance
        </p>
        <p className="mt-3 font-heading text-3xl leading-none tracking-tight">
          {selectedAccount && selectedBalance
            ? formatBalance(selectedBalance.amount, selectedBalance.currency)
            : "No account selected"}
        </p>
        {selectedAccount ? (
          <div className="mt-4 flex items-center justify-between gap-4 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            <span className="inline-flex items-center gap-2">
              {selectedAccount.color ? (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: selectedAccount.color }}
                  aria-hidden="true"
                />
              ) : (
                <span
                  className="size-2 rounded-full bg-chart-2"
                  aria-hidden="true"
                />
              )}
              {selectedAccount.type.replaceAll("_", " ")}
            </span>
            <span>{selectedAccount.currency}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
