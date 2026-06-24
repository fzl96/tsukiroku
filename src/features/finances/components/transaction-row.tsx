"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"

import type { Category, FinancialAccount, Transaction } from "@/db/schema"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import {
  deleteTransactionAction,
  updateTransactionAction,
} from "@/features/transactions/actions"
import {
  formatDateForUser,
  formatDateTimeForUser,
  getDateInputValueInTimeZone,
  getTimeInputValueInTimeZone,
  zonedDateTimeToDate,
} from "@/lib/timezone"
import { formatCurrencyAmount } from "@/lib/money"
import { cn } from "@/lib/utils"

type TransactionRowProps = {
  accounts: FinancialAccount[]
  categories: Category[]
  timezone: string
  transaction: Transaction
}

type TransactionFormValues = {
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

const formLabelClassName =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase"

function selectClassName() {
  return "w-full [&_select]:h-10 [&_select]:text-sm"
}

function formatCurrency(
  amount: string,
  currency: string,
  type: Transaction["type"]
) {
  return formatCurrencyAmount(amount, currency, {
    negative: type === "EXPENSE",
  })
}

function getTransactionTitle(
  transaction: Transaction,
  accounts: Map<string, string>
) {
  if (transaction.title) {
    return transaction.title
  }

  if (transaction.merchant) {
    return transaction.merchant
  }

  if (transaction.type === "TRANSFER") {
    const destination = transaction.transferAccountId
      ? accounts.get(transaction.transferAccountId)
      : null

    return destination ? `Transfer to ${destination}` : "Transfer"
  }

  return transaction.note ?? "Untitled transaction"
}

function TransactionDetailItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  if (!value) {
    return null
  }

  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 text-foreground">{value}</dd>
    </div>
  )
}

function TransactionEditForm({
  accounts,
  categories,
  onCancel,
  onSaved,
  timezone,
  transaction,
}: TransactionRowProps & {
  onCancel: () => void
  onSaved: () => void
}) {
  const form = useForm<TransactionFormValues>({
    defaultValues: {
      type: transaction.type,
      accountId: transaction.accountId,
      transferAccountId: transaction.transferAccountId ?? "",
      title:
        transaction.title ??
        transaction.merchant ??
        transaction.note ??
        "Untitled transaction",
      categoryId: transaction.categoryId ?? "",
      amount: transaction.amount,
      currency: transaction.currency,
      merchant: transaction.merchant ?? "",
      occurredDate: getDateInputValueInTimeZone(
        transaction.occurredAt,
        timezone
      ),
      occurredTime: getTimeInputValueInTimeZone(
        transaction.occurredAt,
        timezone
      ),
      status: transaction.status,
      reference: transaction.reference ?? "",
      note: transaction.note ?? "",
    },
  })
  const transactionType =
    useWatch({ control: form.control, name: "type" }) ?? transaction.type
  const selectedAccountId =
    useWatch({ control: form.control, name: "accountId" }) ??
    transaction.accountId
  const transferAccounts = accounts.filter(
    (account) => account.id !== selectedAccountId
  )
  const compatibleCategories = categories.filter(
    (category) => category.kind === transactionType
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const previousTransactionType = React.useRef(transaction.type)

  React.useEffect(() => {
    if (previousTransactionType.current !== transactionType) {
      form.setValue("categoryId", "")
    }

    previousTransactionType.current = transactionType

    if (transactionType === "TRANSFER") {
      form.setValue("categoryId", "")
      return
    }

    form.setValue("transferAccountId", "")
  }, [form, transactionType])

  React.useEffect(() => {
    if (form.getValues("transferAccountId") === selectedAccountId) {
      form.setValue("transferAccountId", "")
    }
  }, [form, selectedAccountId])

  function handleSubmit(values: TransactionFormValues) {
    const occurredAt = zonedDateTimeToDate(
      values.occurredDate,
      values.occurredTime,
      timezone
    )

    startTransition(async () => {
      const result = await updateTransactionAction(transaction.id, {
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
        recurringPaymentId:
          values.type === "TRANSFER" ? null : transaction.recurringPaymentId,
      })

      if (result.error) {
        setError(result.error.message)
        return
      }

      onSaved()
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-5 border-l border-border ps-4"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>Type</FormLabel>
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
            name="currency"
            rules={{
              pattern: {
                value: /^[A-Za-z]{3}$/,
                message: "Use a three-letter currency code.",
              },
              required: "Currency is required.",
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>Currency</FormLabel>
                <FormControl>
                  <Input
                    className="h-10 text-sm uppercase"
                    maxLength={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="accountId"
            rules={{ required: "Account is required." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>
                  {transactionType === "TRANSFER" ? "Transfer from" : "Account"}
                </FormLabel>
                <FormControl>
                  <NativeSelect className={selectClassName()} {...field}>
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

          {transactionType === "TRANSFER" ? (
            <FormField
              control={form.control}
              name="transferAccountId"
              rules={{ required: "Transfer destination is required." }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>
                    Transfer to
                  </FormLabel>
                  <FormControl>
                    <NativeSelect className={selectClassName()} {...field}>
                      <NativeSelectOption value="">
                        Select account
                      </NativeSelectOption>
                      {transferAccounts.map((account) => (
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
          ) : (
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClassName}>Category</FormLabel>
                  <FormControl>
                    <NativeSelect className={selectClassName()} {...field}>
                      <NativeSelectOption value="">(none)</NativeSelectOption>
                      {compatibleCategories.length ? (
                        <NativeSelectOptGroup
                          label={
                            transactionType === "INCOME" ? "Income" : "Expense"
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
              <FormLabel className={formLabelClassName}>Title</FormLabel>
              <FormControl>
                <Input className="h-10 text-sm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="amount"
            rules={{ required: "Amount is required." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>Amount</FormLabel>
                <FormControl>
                  <Input
                    className="h-10 text-sm"
                    inputMode="decimal"
                    {...field}
                  />
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
                  <Input className="h-10 text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="occurredDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>Date</FormLabel>
                <FormControl>
                  <Input className="h-10 text-sm" type="date" {...field} />
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
                  <Input className="h-10 text-sm" type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={formLabelClassName}>Reference</FormLabel>
              <FormControl>
                <Input className="h-10 text-sm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={formLabelClassName}>Notes</FormLabel>
              <FormControl>
                <Textarea className="min-h-24 text-sm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}

export function TransactionRow({
  accounts,
  categories,
  timezone,
  transaction,
}: TransactionRowProps) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = React.useTransition()
  const [isEditing, setIsEditing] = React.useState(false)
  const accountNames = React.useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts]
  )
  const category = transaction.categoryId
    ? categories.find((item) => item.id === transaction.categoryId)
    : null
  const accountName =
    accountNames.get(transaction.accountId) ?? "Unknown account"
  const transferAccountName = transaction.transferAccountId
    ? accountNames.get(transaction.transferAccountId)
    : null

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteTransactionAction(transaction.id)

      if (result.error) {
        setError(result.error.message)
        return
      }

      setDeleteOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <details className="group border-border transition-colors open:border-b">
        <summary className="grid cursor-pointer list-none grid-cols-[24px_1fr_auto] items-start gap-4 transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <span className="mt-1 size-5 border border-border transition-colors group-open:border-foreground group-open:bg-foreground group-hover:border-foreground" />
          <div className="min-w-0">
            <h2 className="truncate text-base leading-6">
              {getTransactionTitle(transaction, accountNames)}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              <span className="inline-flex items-center gap-2">
                {category?.color ? (
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="size-2 rounded-full bg-chart-2"
                    aria-hidden="true"
                  />
                )}
                {category?.name ?? accountName}
              </span>
              <span>{transaction.type}</span>
              <span>{transaction.status}</span>
              <span>{formatDateForUser(transaction.occurredAt, timezone)}</span>
            </div>
          </div>
          <p
            className={cn(
              "pt-0.5 text-right font-mono text-sm",
              transaction.type === "EXPENSE"
                ? "text-destructive"
                : "text-chart-2"
            )}
          >
            {formatCurrency(
              transaction.amount,
              transaction.currency,
              transaction.type
            )}
          </p>
        </summary>

        <div className="ms-9 mt-4 pb-5">
          {isEditing ? (
            <TransactionEditForm
              accounts={accounts}
              categories={categories}
              timezone={timezone}
              transaction={transaction}
              onCancel={() => setIsEditing(false)}
              onSaved={() => {
                setIsEditing(false)
                router.refresh()
              }}
            />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setError(null)
                    setDeleteOpen(true)
                  }}
                >
                  Delete
                </Button>
              </div>

              <dl className="grid gap-x-10 gap-y-4 border-l border-border ps-4 sm:grid-cols-2 lg:grid-cols-3">
                <TransactionDetailItem
                  label="Transaction ID"
                  value={transaction.id}
                />
                <TransactionDetailItem
                  label="Title"
                  value={getTransactionTitle(transaction, accountNames)}
                />
                <TransactionDetailItem
                  label="Amount"
                  value={formatCurrency(
                    transaction.amount,
                    transaction.currency,
                    transaction.type
                  )}
                />
                <TransactionDetailItem
                  label="Currency"
                  value={transaction.currency}
                />
                <TransactionDetailItem label="Type" value={transaction.type} />
                <TransactionDetailItem
                  label="Status"
                  value={transaction.status}
                />
                <TransactionDetailItem label="Account" value={accountName} />
                <TransactionDetailItem
                  label="Transfer to"
                  value={transferAccountName}
                />
                <TransactionDetailItem
                  label="Category"
                  value={category?.name}
                />
                <TransactionDetailItem
                  label="Merchant"
                  value={transaction.merchant}
                />
                <TransactionDetailItem
                  label="Reference"
                  value={transaction.reference}
                />
                <TransactionDetailItem
                  label="Recurring payment"
                  value={transaction.recurringPaymentId}
                />
                <TransactionDetailItem
                  label="Occurred at"
                  value={formatDateTimeForUser(
                    transaction.occurredAt,
                    timezone
                  )}
                />
                <TransactionDetailItem
                  label="Created"
                  value={formatDateTimeForUser(transaction.createdAt, timezone)}
                />
                <TransactionDetailItem
                  label="Updated"
                  value={formatDateTimeForUser(transaction.updatedAt, timezone)}
                />
                <TransactionDetailItem label="Note" value={transaction.note} />
              </dl>
            </div>
          )}
        </div>
      </details>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setError(null)
          setDeleteOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              {getTransactionTitle(transaction, accountNames)}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
