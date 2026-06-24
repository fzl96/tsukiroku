"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import type { Category } from "@/db/schema"
import { Button } from "@/components/ui/button"
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
  archiveCategoryAction,
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/features/categories/actions"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type CategoryInput = {
  name: string
  kind: Category["kind"]
  color?: string
  icon?: string
}

const categoryKindOptions: Array<{
  label: string
  value: Category["kind"]
}> = [
  { label: "Expense", value: "EXPENSE" },
  { label: "Income", value: "INCOME" },
]

const formLabelClassName =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase"

function CategoryForm({
  category,
  mode,
  onCancel,
  onSubmit,
}: {
  category?: Category
  mode: "create" | "edit"
  onCancel: () => void
  onSubmit: (input: CategoryInput) => Promise<string | null>
}) {
  const form = useForm<CategoryInput>({
    defaultValues: {
      name: category?.name ?? "",
      kind: category?.kind ?? "EXPENSE",
      color: category?.color ?? "",
      icon: category?.icon ?? "",
    },
  })
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleSubmit(values: CategoryInput) {
    startTransition(async () => {
      const color = values.color?.trim()
      const icon = values.icon?.trim()
      const message = await onSubmit({
        ...values,
        name: values.name.trim(),
        color: color || undefined,
        icon: icon || undefined,
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

        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={formLabelClassName}>Type</FormLabel>
              <FormControl>
                <NativeSelect
                  className="w-full [&_select]:h-11 [&_select]:text-base"
                  {...field}
                >
                  {categoryKindOptions.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>Color</FormLabel>
                <FormControl>
                  <Input
                    className="h-11 text-base"
                    placeholder="#525252"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={formLabelClassName}>Icon</FormLabel>
                <FormControl>
                  <Input
                    className="h-11 text-base"
                    placeholder="Optional"
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

export function NewCategoryButton() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  async function handleSubmit(input: CategoryInput) {
    const result = await createCategoryAction(input)

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
          + New Category
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            New category
          </DialogTitle>
          <DialogDescription>
            Add an income or expense category and choose an optional color for
            its dot.
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          mode="create"
          onCancel={() => setOpen(false)}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

function CategoryConfirmSheet({
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
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setError(null)
        onOpenChange(nextOpen)
      }}
    >
      <SheetContent
        side="right"
        className="w-full data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border pb-5">
          <SheetTitle className="font-heading text-3xl leading-none tracking-tight">
            {title}
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-4 py-5">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <SheetFooter className="border-t border-border">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={variant}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? "Working..." : actionLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function CategoryActionMenu({
  category,
  children,
}: React.PropsWithChildren<{ category: Category }>) {
  const router = useRouter()
  const [archiveOpen, setArchiveOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)

  async function handleEdit(input: CategoryInput) {
    const result = await updateCategoryAction(category.id, {
      ...input,
      color: input.color ?? null,
      icon: input.icon ?? null,
    })

    if (result.error) {
      return result.error.message
    }

    setEditOpen(false)
    router.refresh()
    return null
  }

  async function handleArchive() {
    const result = await archiveCategoryAction(category.id)
    return result.error?.message ?? null
  }

  async function handleDelete() {
    const result = await deleteCategoryAction(category.id)
    return result.error?.message ?? null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {React.isValidElement(children) ? (
            React.cloneElement(
              children as React.ReactElement<Record<string, unknown>>,
              {
                "aria-label": `Open ${category.name} actions`,
              }
            )
          ) : (
            <button type="button" aria-label={`Open ${category.name} actions`}>
              {children}
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CategoryConfirmSheet
        actionLabel="Archive"
        description={`Archive ${category.name}. It will be hidden from new transactions but historical data remains.`}
        onConfirm={handleArchive}
        onOpenChange={setArchiveOpen}
        open={archiveOpen}
        title="Archive category?"
      />

      <CategoryConfirmSheet
        actionLabel="Delete"
        description={`Delete ${category.name}. This only succeeds if the category has no linked transactions or recurring payments.`}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Delete category?"
        variant="destructive"
      />

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto data-[side=right]:sm:max-w-lg"
        >
          <SheetHeader className="border-b border-border pb-5">
            <SheetTitle className="font-heading text-3xl leading-none tracking-tight">
              Edit category
            </SheetTitle>
            <SheetDescription>
              Update category details and its optional display color.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 py-5">
            <CategoryForm
              category={category}
              mode="edit"
              onCancel={() => setEditOpen(false)}
              onSubmit={handleEdit}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
