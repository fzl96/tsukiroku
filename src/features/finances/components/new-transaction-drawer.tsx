"use client"

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { AccountSelectWithBalance } from "@/features/finances/components/account-select-with-balance"
import { createTransactionAction } from "@/features/transactions/actions"
import {
  getDateInputValueInTimeZone,
  getTimeInputValueInTimeZone,
  zonedDateTimeToDate,
} from "@/lib/timezone"

type NewTransactionDrawerButtonProps = {
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

function NewTransactionForm({
  accountBalances,
  accounts,
  categories,
  onCancel,
  onCreated,
  timezone,
}: NewTransactionDrawerButtonProps & {
  onCancel: () => void
  onCreated: () => void
}) {
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

      onCreated()
    })
  }

  return (
    <Form {...form}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-4 py-6 pb-8">
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
                        <NativeSelectOption value="">(none)</NativeSelectOption>
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
                  <FormLabel className={formLabelClassName}>Currency</FormLabel>
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
                    <Input className="h-12 text-base" type="date" {...field} />
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
                    <Input className="h-12 text-base" type="time" {...field} />
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
                      <NativeSelectOption value="VOID">Void</NativeSelectOption>
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
        </div>

        <div className="sticky bottom-0 z-10 mt-auto flex justify-end gap-3 border-t border-border bg-popover px-4 py-4">
          {error ? (
            <p className="mr-auto self-center text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export function NewTransactionDrawerButton({
  accountBalances,
  accounts,
  categories,
  timezone,
}: NewTransactionDrawerButtonProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  function handleCreated() {
    setOpen(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center border border-transparent px-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground"
        >
          + New Transaction
        </button>
      </SheetTrigger>
      <SheetContent
        className="overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl"
        side="right"
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-popover pb-5">
          <SheetDescription className="font-mono text-[11px] tracking-[0.18em] uppercase">
            Draft / Manual entry
          </SheetDescription>
          <SheetTitle className="font-heading text-4xl leading-none tracking-tight">
            New transaction
          </SheetTitle>
        </SheetHeader>
        <NewTransactionForm
          accountBalances={accountBalances}
          accounts={accounts}
          categories={categories}
          onCancel={() => setOpen(false)}
          onCreated={handleCreated}
          timezone={timezone}
        />
      </SheetContent>
    </Sheet>
  )
}
