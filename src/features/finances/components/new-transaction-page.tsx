import Link from "next/link"

import type { Category, FinancialAccount } from "@/db/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"

type NewTransactionPageProps = {
  accounts: FinancialAccount[]
  categories: Category[]
}

function getDateValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getTimeValue(date: Date) {
  return date.toTimeString().slice(0, 5)
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode
  className?: string
  label: string
}) {
  return (
    <div className={className}>
      <Label className="mb-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
    </div>
  )
}

function selectClassName() {
  return "w-full [&_select]:h-12 [&_select]:text-base"
}

export function NewTransactionPage({
  accounts,
  categories,
}: NewTransactionPageProps) {
  const now = new Date()
  const incomeCategories = categories.filter(
    (category) => category.kind === "INCOME"
  )
  const expenseCategories = categories.filter(
    (category) => category.kind === "EXPENSE"
  )
  const defaultCurrency = accounts[0]?.currency ?? "IDR"

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1180px]">
        <Link
          href="/finances"
          className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {"<- Finances"}
        </Link>

        <header className="mt-14 border-b border-border pb-9">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                Draft / Manual entry
              </p>
              <h1 className="mt-3 font-heading text-5xl leading-none tracking-tight sm:text-6xl">
                New transaction
              </h1>
            </div>
            <p className="hidden pb-1 font-mono text-[12px] tracking-[0.16em] text-muted-foreground uppercase sm:block">
              Created today
            </p>
          </div>
        </header>

        <form className="max-w-[720px] space-y-7 py-7">
          <Field label="Type (required)">
            <NativeSelect
              name="type"
              className={selectClassName()}
              defaultValue="EXPENSE"
            >
              <NativeSelectOption value="EXPENSE">Expense</NativeSelectOption>
              <NativeSelectOption value="INCOME">Income</NativeSelectOption>
              <NativeSelectOption value="TRANSFER">Transfer</NativeSelectOption>
            </NativeSelect>
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Account (required)">
              <NativeSelect
                name="accountId"
                className={selectClassName()}
                defaultValue={accounts[0]?.id}
              >
                {accounts.length ? null : (
                  <NativeSelectOption value="">
                    No accounts yet
                  </NativeSelectOption>
                )}
                {accounts.map((account) => (
                  <NativeSelectOption key={account.id} value={account.id}>
                    {account.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Category">
              <NativeSelect
                name="categoryId"
                className={selectClassName()}
                defaultValue=""
              >
                <NativeSelectOption value="">(none)</NativeSelectOption>
                {expenseCategories.length ? (
                  <NativeSelectOptGroup label="Expense">
                    {expenseCategories.map((category) => (
                      <NativeSelectOption key={category.id} value={category.id}>
                        {category.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelectOptGroup>
                ) : null}
                {incomeCategories.length ? (
                  <NativeSelectOptGroup label="Income">
                    {incomeCategories.map((category) => (
                      <NativeSelectOption key={category.id} value={category.id}>
                        {category.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelectOptGroup>
                ) : null}
              </NativeSelect>
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Amount (required)">
              <Input
                name="amount"
                inputMode="decimal"
                placeholder="0.00"
                className="h-12 text-base"
              />
            </Field>

            <Field label="Currency">
              <Input
                name="currency"
                defaultValue={defaultCurrency}
                maxLength={3}
                className="h-12 text-base uppercase"
              />
            </Field>
          </div>

          <Field label="Merchant">
            <Input
              name="merchant"
              placeholder="Coffee shop, salary, transfer note..."
              className="h-12 text-base"
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Date">
              <Input
                type="date"
                name="occurredDate"
                defaultValue={getDateValue(now)}
                className="h-12 text-base"
              />
            </Field>

            <Field label="Time">
              <Input
                type="time"
                name="occurredTime"
                defaultValue={getTimeValue(now)}
                className="h-12 text-base"
              />
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Status">
              <NativeSelect
                name="status"
                className={selectClassName()}
                defaultValue="POSTED"
              >
                <NativeSelectOption value="POSTED">Posted</NativeSelectOption>
                <NativeSelectOption value="PENDING">Pending</NativeSelectOption>
                <NativeSelectOption value="VOID">Void</NativeSelectOption>
              </NativeSelect>
            </Field>

            <Field label="Reference">
              <Input name="reference" className="h-12 text-base" />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea name="note" className="min-h-28 text-base" />
          </Field>

          <Button type="button" size="lg" className="mt-2 font-mono uppercase">
            Save
          </Button>
        </form>
      </div>
    </main>
  )
}
