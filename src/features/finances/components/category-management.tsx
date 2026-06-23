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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { createCategoryAction } from "@/features/categories/actions"

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
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (input: CategoryInput) => Promise<string | null>
}) {
  const form = useForm<CategoryInput>({
    defaultValues: {
      name: "",
      kind: "EXPENSE",
      color: "",
      icon: "",
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
            {isPending ? "Saving..." : "Create"}
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
        <CategoryForm onCancel={() => setOpen(false)} onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  )
}
