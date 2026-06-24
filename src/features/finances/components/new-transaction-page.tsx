"use client"

import Link from "next/link"
import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"

import type { Category, FinancialAccount } from "@/db/schema"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { AccountSelectWithBalance } from "@/features/finances/components/account-select-with-balance"
import { createTransactionAction } from "@/features/transactions/actions"
import {
  getDateInputValueInTimeZone,
  getTimeInputValueInTimeZone,
  zonedDateTimeToDate,
} from "@/lib/timezone"

type NewTransactionPageProps = {
  accountBalances: Array<{
    accountId: string
    amount: string
    currency: string
  }>
  accounts: FinancialAccount[]
  categories: Category[]
  timezone: string
}

type NewTransactionFormValues = {
  type: "EXPENSE" | "INCOME" | "TRANSFER"
  accountId: string
  transferAccountId: string
  title: string
  categoryId: string
  amount: string
  currency: string
  merchant: string
  occurredDate: string
  occurredTime: string
  status: "POSTED" | "PENDING" | "VOID"
  reference: string
  note: string
}

function selectClassName() {
  return "w-full [&_select]:h-12 [&_select]:text-base"
}

const formLabelClassName =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase"

export function NewTransactionPage({
  accountBalances,
  accounts,
  categories,
  timezone,
}: NewTransactionPageProps) {
  const router = useRouter()
  const now = new Date()
  const incomeCategories = categories.filter(
    (category) => category.kind === "INCOME"
  )
  const expenseCategories = categories.filter(
    (category) => category.kind === "EXPENSE"
  )
  const defaultCurrency = accounts[0]?.currency ?? "IDR"
  const form = useForm<NewTransactionFormValues>({
    defaultValues: {
      type: "EXPENSE",
      accountId: accounts[0]?.id ?? "",
      transferAccountId: "",
      title: "",
      categoryId: "",
      amount: "",
      currency: defaultCurrency,
      merchant: "",
      occurredDate: getDateInputValueInTimeZone(now, timezone),
      occurredTime: getTimeInputValueInTimeZone(now, timezone),
      status: "POSTED",
      reference: "",
      note: "",
    },
  })
  const transactionType =
    useWatch({ control: form.control, name: "type" }) ?? "EXPENSE"
  const selectedAccountId =
    useWatch({ control: form.control, name: "accountId" }) ?? ""
  const transferAccounts = accounts.filter(
    (account) => account.id !== selectedAccountId
  )
  const compatibleCategories =
    transactionType === "INCOME" ? incomeCategories : expenseCategories
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    form.setValue("categoryId", "")

    if (transactionType === "TRANSFER") {
      return
    }

    form.setValue("transferAccountId", "")
  }, [form, transactionType])

  React.useEffect(() => {
    if (form.getValues("transferAccountId") === selectedAccountId) {
      form.setValue("transferAccountId", "")
    }
  }, [form, selectedAccountId])

  function handleSubmit(values: NewTransactionFormValues) {
    const occurredAt = zonedDateTimeToDate(
      values.occurredDate,
      values.occurredTime,
      timezone
    )

    startTransition(async () => {
      const result = await createTransactionAction({
        accountId: values.accountId,
        transferAccountId:
          values.type === "TRANSFER" ? values.transferAccountId : null,
        title: values.title.trim(),
        type: values.type,
        status: values.status,
        amount: values.amount.trim(),
        currency: values.currency.trim().toUpperCase(),
        occurredAt,
        merchant: values.merchant.trim() || null,
        note: values.note.trim() || null,
        reference: values.reference.trim() || null,
        categoryId:
          values.type === "TRANSFER" ? null : values.categoryId || null,
        recurringPaymentId: null,
      })

      if (result.error) {
        setError(result.error.message)
        return
      }

      router.push("/finances")
      router.refresh()
    })
  }

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

        <Form {...form}>
          <form
            className="max-w-[720px] space-y-7 py-7"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>
                    Type (required)
                  </FormLabel>
                  <FormControl>
                    <NativeSelect className={selectClassName()} {...field}>
                      <NativeSelectOption value="EXPENSE">
                        Expense
                      </NativeSelectOption>
                      <NativeSelectOption value="INCOME">
                        Income
                      </NativeSelectOption>
                      <NativeSelectOption value="TRANSFER">
                        Transfer
                      </NativeSelectOption>
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="accountId"
                rules={{ required: "Account is required." }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClassName}>
                      {transactionType === "TRANSFER"
                        ? "Transfer from (required)"
                        : "Account (required)"}
                    </FormLabel>
                    <FormControl>
                      <AccountSelectWithBalance
                        accounts={accounts}
                        balances={accountBalances}
                        disabled={field.disabled}
                        name={field.name}
                        onBlur={field.onBlur}
                        onValueChange={field.onChange}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {transactionType === "TRANSFER" ? (
                <FormField
                  control={form.control}
                  name="transferAccountId"
                  rules={{ required: "Transfer destination is required." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={formLabelClassName}>
                        Transfer to (required)
                      </FormLabel>
                      <FormControl>
                        <NativeSelect className={selectClassName()} {...field}>
                          <NativeSelectOption value="">
                            Select account
                          </NativeSelectOption>
                          {transferAccounts.map((account) => (
                            <NativeSelectOption
                              key={account.id}
                              value={account.id}
                            >
                              {account.name}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={formLabelClassName}>
                        Category
                      </FormLabel>
                      <FormControl>
                        <NativeSelect className={selectClassName()} {...field}>
                          <NativeSelectOption value="">
                            (none)
                          </NativeSelectOption>
                          {compatibleCategories.length ? (
                            <NativeSelectOptGroup
                              label={
                                transactionType === "INCOME"
                                  ? "Income"
                                  : "Expense"
                              }
                            >
                              {compatibleCategories.map((category) => (
                                <NativeSelectOption
                                  key={category.id}
                                  value={category.id}
                                >
                                  {category.name}
                                </NativeSelectOption>
                              ))}
                            </NativeSelectOptGroup>
                          ) : null}
                        </NativeSelect>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="title"
              rules={{ required: "Title is required." }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>
                    Title (required)
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-12 text-base"
                      placeholder="Coffee, salary, rent, transfer..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                rules={{ required: "Amount is required." }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClassName}>
                      Amount (required)
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 text-base"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClassName}>
                      Currency
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 text-base uppercase"
                        maxLength={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="merchant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>Merchant</FormLabel>
                  <FormControl>
                    <Input
                      className="h-12 text-base"
                      placeholder="Coffee shop, salary, transfer note..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="occurredDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClassName}>Date</FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 text-base"
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occurredTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClassName}>Time</FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 text-base"
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClassName}>Status</FormLabel>
                    <FormControl>
                      <NativeSelect className={selectClassName()} {...field}>
                        <NativeSelectOption value="POSTED">
                          Posted
                        </NativeSelectOption>
                        <NativeSelectOption value="PENDING">
                          Pending
                        </NativeSelectOption>
                        <NativeSelectOption value="VOID">
                          Void
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClassName}>
                      Reference
                    </FormLabel>
                    <FormControl>
                      <Input className="h-12 text-base" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>Notes</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-28 text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="submit"
              size="lg"
              className="mt-2 font-mono uppercase"
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </form>
        </Form>
      </div>
    </main>
  )
}
