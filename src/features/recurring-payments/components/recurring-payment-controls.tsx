"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"

import type { Category, FinancialAccount, RecurringPayment } from "@/db/schema"
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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  cancelRecurringPaymentAction,
  createRecurringPaymentAction,
  pauseRecurringPaymentAction,
  recordRecurringPaymentAction,
  updateRecurringPaymentAction,
} from "@/features/recurring-payments/actions"
import { getDateInputValueInTimeZone, parseUserDateAsUtc } from "@/lib/timezone"

type NewRecurringPaymentButtonProps = {
  accounts: FinancialAccount[]
  categories: Category[]
  timezone: string
}

type NewRecurringPaymentFormValues = {
  accountId: string
  amount: string
  categoryId: string
  currency: string
  endDate: string
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
  intervalCount: number
  merchant: string
  name: string
  nextDueDate: string
  note: string
  startDate: string
  type: "EXPENSE" | "INCOME"
}

const formLabelClassName =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase"

function selectClassName() {
  return "w-full [&_select]:h-12 [&_select]:text-base"
}

function buildDefaultValues(
  accounts: FinancialAccount[],
  timezone: string
): NewRecurringPaymentFormValues {
  const today = getDateInputValueInTimeZone(new Date(), timezone)

  return {
    accountId: accounts[0]?.id ?? "",
    amount: "",
    categoryId: "",
    currency: accounts[0]?.currency ?? "IDR",
    endDate: "",
    frequency: "MONTHLY",
    intervalCount: 1,
    merchant: "",
    name: "",
    nextDueDate: today,
    note: "",
    startDate: today,
    type: "EXPENSE",
  }
}

function NewRecurringPaymentForm({
  accounts,
  categories,
  onCancel,
  onCreated,
  timezone,
}: NewRecurringPaymentButtonProps & {
  onCancel: () => void
  onCreated: () => void
}) {
  const form = useForm<NewRecurringPaymentFormValues>({
    defaultValues: buildDefaultValues(accounts, timezone),
  })
  const router = useRouter()
  const selectedAccountId = useWatch({
    control: form.control,
    name: "accountId",
  })
  const type = useWatch({ control: form.control, name: "type" }) ?? "EXPENSE"
  const compatibleCategories = categories.filter(
    (category) => category.kind === type
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    form.setValue("categoryId", "")
  }, [form, type])

  React.useEffect(() => {
    const account = accounts.find((item) => item.id === selectedAccountId)

    if (account) {
      form.setValue("currency", account.currency)
    }
  }, [accounts, form, selectedAccountId])

  function handleSubmit(values: NewRecurringPaymentFormValues) {
    startTransition(async () => {
      const result = await createRecurringPaymentAction({
        accountId: values.accountId,
        amount: values.amount.trim(),
        categoryId: values.categoryId || null,
        currency: values.currency.trim().toUpperCase(),
        endDate: values.endDate
          ? parseUserDateAsUtc(values.endDate, timezone)
          : null,
        frequency: values.frequency,
        intervalCount: Number(values.intervalCount),
        merchant: values.merchant.trim() || null,
        name: values.name.trim(),
        nextDueDate: parseUserDateAsUtc(values.nextDueDate, timezone),
        note: values.note.trim() || null,
        startDate: values.startDate
          ? parseUserDateAsUtc(values.startDate, timezone)
          : null,
        type: values.type,
      })

      if (result.error) {
        setError(result.error.message)
        return
      }

      setError(null)
      form.reset(buildDefaultValues(accounts, timezone))
      router.refresh()
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
            name="name"
            rules={{ required: "Name is required." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>
                  Name (required)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Rent, Netflix, Salary"
                    className="h-12 text-base"
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
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountId"
              rules={{ required: "Account is required." }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>
                    Account (required)
                  </FormLabel>
                  <FormControl>
                    <NativeSelect className={selectClassName()} {...field}>
                      <NativeSelectOption value="">
                        Select account
                      </NativeSelectOption>
                      {accounts.map((account) => (
                        <NativeSelectOption key={account.id} value={account.id}>
                          {account.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-[1fr_0.45fr]">
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
                      inputMode="decimal"
                      placeholder="0.00"
                      className="h-12 text-base"
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
              rules={{ required: "Currency is required." }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>Currency</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={3}
                      className="h-12 text-base uppercase"
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
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>
                    Frequency
                  </FormLabel>
                  <FormControl>
                    <NativeSelect className={selectClassName()} {...field}>
                      <NativeSelectOption value="DAILY">
                        Daily
                      </NativeSelectOption>
                      <NativeSelectOption value="WEEKLY">
                        Weekly
                      </NativeSelectOption>
                      <NativeSelectOption value="MONTHLY">
                        Monthly
                      </NativeSelectOption>
                      <NativeSelectOption value="YEARLY">
                        Yearly
                      </NativeSelectOption>
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="intervalCount"
              rules={{
                min: { value: 1, message: "Interval must be at least 1." },
                required: "Interval is required.",
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>Every</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      className="h-12 text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>
                    Start date
                  </FormLabel>
                  <FormControl>
                    <Input type="date" className="h-12 text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextDueDate"
              rules={{ required: "Next due date is required." }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>
                    Next due (required)
                  </FormLabel>
                  <FormControl>
                    <Input type="date" className="h-12 text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>End date</FormLabel>
                  <FormControl>
                    <Input type="date" className="h-12 text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>Category</FormLabel>
                  <FormControl>
                    <NativeSelect className={selectClassName()} {...field}>
                      <NativeSelectOption value="">None</NativeSelectOption>
                      {compatibleCategories.map((category) => (
                        <NativeSelectOption
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="merchant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>Merchant</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional"
                      className="h-12 text-base"
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
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>Note</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Optional details"
                    className="min-h-24 text-base"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error ? (
            <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <SheetFooter className="sticky bottom-0 border-t border-border bg-background p-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !accounts.length}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  )
}

export function NewRecurringPaymentButton({
  accounts,
  categories,
  timezone,
}: NewRecurringPaymentButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" disabled={!accounts.length}>
          + New Recurring Payment
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col overflow-hidden data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl"
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background px-4 py-5">
          <SheetTitle className="font-heading text-3xl leading-none tracking-tight">
            New recurring payment
          </SheetTitle>
          <SheetDescription>
            Create a scheduled template that can be recorded into the ledger.
          </SheetDescription>
        </SheetHeader>
        <NewRecurringPaymentForm
          accounts={accounts}
          categories={categories}
          onCancel={() => setOpen(false)}
          onCreated={() => setOpen(false)}
          timezone={timezone}
        />
      </SheetContent>
    </Sheet>
  )
}

export function RecurringPaymentActionButtons({
  recurringPayment,
}: {
  recurringPayment: RecurringPayment
}) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function run(action: () => Promise<{ error?: { message: string } }>) {
    startTransition(async () => {
      const result = await action()

      if (result.error) {
        setError(result.error.message)
        return
      }

      setError(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {recurringPayment.status === "ACTIVE" ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(() => recordRecurringPaymentAction(recurringPayment.id))
              }
            >
              Record now
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(() => pauseRecurringPaymentAction(recurringPayment.id))
              }
            >
              Pause
            </Button>
          </>
        ) : null}

        {recurringPayment.status === "PAUSED" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              run(() =>
                updateRecurringPaymentAction(recurringPayment.id, {
                  status: "ACTIVE",
                })
              )
            }
          >
            Resume
          </Button>
        ) : null}

        {recurringPayment.status === "ACTIVE" ||
        recurringPayment.status === "PAUSED" ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() =>
              run(() => cancelRecurringPaymentAction(recurringPayment.id))
            }
          >
            Cancel
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
