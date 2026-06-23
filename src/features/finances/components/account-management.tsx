"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconDotsVertical } from "@tabler/icons-react"
import { useForm } from "react-hook-form"

import type { FinancialAccount } from "@/db/schema"
import {
  archiveFinancialAccountAction,
  createFinancialAccountAction,
  deleteFinancialAccountAction,
  updateFinancialAccountAction,
} from "@/features/accounts/actions"
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type AccountInput = {
  name: string
  type: FinancialAccount["type"]
  currency: string
  color?: string
  initialBalance: string
}

const accountTypeOptions: Array<{
  label: string
  value: FinancialAccount["type"]
}> = [
  { label: "Cash", value: "CASH" },
  { label: "Bank", value: "BANK" },
  { label: "E-wallet", value: "EWALLET" },
  { label: "Credit Card", value: "CREDIT_CARD" },
  { label: "Investment", value: "INVESTMENT" },
  { label: "Other", value: "OTHER" },
]

const formLabelClassName =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase"

function AccountForm({
  account,
  mode,
  onCancel,
  onSubmit,
}: {
  account?: FinancialAccount
  mode: "create" | "edit"
  onCancel: () => void
  onSubmit: (input: AccountInput) => Promise<string | null>
}) {
  const form = useForm<AccountInput>({
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "CASH",
      currency: account?.currency ?? "IDR",
      color: account?.color ?? "",
      initialBalance: account?.initialBalance ?? "0.00",
    },
  })
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleSubmit(values: AccountInput) {
    startTransition(async () => {
      const color = values.color?.trim()
      const message = await onSubmit({
        ...values,
        name: values.name.trim(),
        currency: values.currency.trim().toUpperCase(),
        color: color || undefined,
        initialBalance: values.initialBalance.trim() || "0",
      })
      setError(message)
    })
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="name"
          rules={{ required: "Name is required." }}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={formLabelClassName}>Name</FormLabel>
              <FormControl>
                <Input className="h-11 text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>Type</FormLabel>
                <FormControl>
                  <NativeSelect
                    className="w-full [&_select]:h-11 [&_select]:text-base"
                    {...field}
                  >
                    {accountTypeOptions.map((option) => (
                      <NativeSelectOption
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
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
                    className="h-11 text-base uppercase"
                    maxLength={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="initialBalance"
            rules={{ required: "Initial balance is required." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>
                  Initial balance
                </FormLabel>
                <FormControl>
                  <Input
                    className="h-11 text-base"
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
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>Color</FormLabel>
                <FormControl>
                  <Input
                    className="h-11 text-base"
                    placeholder="#2563eb"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export function NewAccountButton() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  async function handleSubmit(input: AccountInput) {
    const result = await createFinancialAccountAction(input)

    if (result.error) {
      return result.error.message
    }

    setOpen(false)
    router.refresh()
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center border border-transparent px-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground"
        >
          + New Account
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            New account
          </DialogTitle>
          <DialogDescription>
            Add a finance account and choose an optional color for its dot.
          </DialogDescription>
        </DialogHeader>
        <AccountForm
          mode="create"
          onCancel={() => setOpen(false)}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

function AccountConfirmDialog({
  actionLabel,
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
  variant = "default",
}: {
  actionLabel: string
  description: string
  onConfirm: () => Promise<string | null>
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
  variant?: "default" | "destructive"
}) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const message = await onConfirm()

      if (message) {
        setError(message)
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setError(null)
        onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant={variant}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? "Working..." : actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function AccountCardMenu({ account }: { account: FinancialAccount }) {
  const router = useRouter()
  const [archiveOpen, setArchiveOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)

  async function handleEdit(input: AccountInput) {
    const result = await updateFinancialAccountAction(account.id, {
      ...input,
      color: input.color ?? null,
    })

    if (result.error) {
      return result.error.message
    }

    setEditOpen(false)
    router.refresh()
    return null
  }

  async function handleArchive() {
    const result = await archiveFinancialAccountAction(account.id)
    return result.error?.message ?? null
  }

  async function handleDelete() {
    const result = await deleteFinancialAccountAction(account.id)
    return result.error?.message ?? null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute end-3 top-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label={`Open ${account.name} actions`}
          >
            <IconDotsVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setArchiveOpen(true)
            }}
          >
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setDeleteOpen(true)
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountConfirmDialog
        actionLabel="Archive"
        description={`Archive ${account.name}. It will be hidden from new transactions but historical data remains.`}
        onConfirm={handleArchive}
        onOpenChange={setArchiveOpen}
        open={archiveOpen}
        title="Archive account?"
      />

      <AccountConfirmDialog
        actionLabel="Delete"
        description={`Delete ${account.name}. This only succeeds if the account has no linked transactions or recurring payments.`}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Delete account?"
        variant="destructive"
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              Edit account
            </DialogTitle>
            <DialogDescription>
              Update account details and its optional display color.
            </DialogDescription>
          </DialogHeader>
          <AccountForm
            account={account}
            mode="edit"
            onCancel={() => setEditOpen(false)}
            onSubmit={handleEdit}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
