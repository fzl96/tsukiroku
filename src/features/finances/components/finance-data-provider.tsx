"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { useTRPC } from "@/lib/trpc/client"
import {
  financeCommandSchema,
  financeMutationSchema,
  type FinanceMutation,
} from "@/features/finances/validations"
import {
  applyFinanceMutation,
  reconcileFinanceMutation,
} from "@/features/finances/optimistic"
import type { FinanceSnapshot } from "@/features/finances/queries"
import type { ActionResult } from "@/lib/action-result"

type FinanceData = {
  data: FinanceSnapshot | undefined
  pending: number
  refreshing: boolean
  error: string | null
  refresh: () => void
  submit: (command: unknown) => Promise<ActionResult<{ success: true }>>
}
const FinanceDataContext = createContext<FinanceData | null>(null)

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const trpc = useTRPC()
  const client = useQueryClient()
  const options = trpc.finance.snapshot.queryOptions()
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set())
  const pending = useMutationState({
    filters: {
      mutationKey: trpc.finance.mutate.mutationKey(),
      status: "pending",
    },
    select: (item) => item.state.variables as FinanceMutation,
  })
  // Do not fetch a partly committed server snapshot underneath pending edits.
  const query = useQuery({ ...options, enabled: pending.length === 0 })
  const mutation = useMutation(
    trpc.finance.mutate.mutationOptions({
      scope: { id: "finance-writes" },
      onMutate: async () => {
        await client.cancelQueries({ queryKey: options.queryKey })
      },
      onSuccess: async (result, variables) => {
        await client.cancelQueries({ queryKey: options.queryKey })
        setConfirmed((current) => new Set([...current, result.clientId]))
        client.setQueryData(options.queryKey, (current) =>
          current
            ? reconcileFinanceMutation(
                current,
                financeMutationSchema.parse(variables),
                result.patch
              )
            : current
        )
      },
      onError: (error) => {
        toast.error("Change could not be saved", {
          description: `${error.message} Your previous data has been restored.`,
          duration: 10000,
        })
      },
      onSettled: () => {
        // Refresh after the last queued write. A background response cannot erase
        // pending edits because they are projected separately from confirmed data.
        if (
          client.isMutating({
            mutationKey: trpc.finance.mutate.mutationKey(),
          }) === 1
        ) {
          void client.invalidateQueries({ queryKey: options.queryKey })
        }
      },
    })
  )
  const data = useMemo(
    () =>
      query.data
        ? pending.reduce(
            (state, item) =>
              confirmed.has(item.clientId)
                ? state
                : applyFinanceMutation(state, item),
            query.data
          )
        : undefined,
    [query.data, pending, confirmed]
  )

  async function submit(
    command: unknown
  ): Promise<ActionResult<{ success: true }>> {
    try {
      const parsed = financeCommandSchema.safeParse(command)
      if (!parsed.success)
        return {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input.",
          },
        }
      if (
        "id" in parsed.data &&
        pending.some(
          (item) =>
            "id" in item.command &&
            item.command.id === (parsed.data as { id: string }).id
        )
      ) {
        return {
          error: {
            code: "VALIDATION_ERROR",
            message: "This item is still saving. Please wait a moment.",
          },
        }
      }
      if (
        "data" in parsed.data &&
        parsed.data.data &&
        Object.values(parsed.data.data).some(
          (value) =>
            typeof value === "string" && value.startsWith("optimistic:")
        )
      ) {
        return {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please wait for the selected item to finish saving.",
          },
        }
      }
      mutation.mutate({
        command: parsed.data,
        clientId: crypto.randomUUID(),
        submittedAt: new Date(),
      })
      return { data: { success: true } }
    } catch {
      return {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the entered values and try again.",
        },
      }
    }
  }

  return (
    <FinanceDataContext.Provider
      value={{
        data,
        pending: pending.length,
        refreshing: query.isFetching,
        error: query.error?.message ?? null,
        refresh: () => {
          if (!pending.length) void query.refetch()
        },
        submit,
      }}
    >
      {children}
    </FinanceDataContext.Provider>
  )
}

export function useFinanceData() {
  const context = useContext(FinanceDataContext)
  if (!context) throw new Error("FinanceDataProvider is required")
  return context
}

// Keep form result handling consistent while the transport and optimistic state
// belong to the page's tRPC mutation cache.
export function useFinanceActions() {
  const { submit } = useFinanceData()
  return {
    createTransactionAction: (data: unknown) =>
      submit({ type: "transaction.create", data }),
    updateTransactionAction: (id: string, data: unknown) =>
      submit({ type: "transaction.update", id, data }),
    deleteTransactionAction: (id: string) =>
      submit({ type: "transaction.delete", id }),
    createFinancialAccountAction: (data: unknown) =>
      submit({ type: "account.create", data }),
    updateFinancialAccountAction: (id: string, data: unknown) =>
      submit({ type: "account.update", id, data }),
    archiveFinancialAccountAction: (id: string) =>
      submit({ type: "account.archive", id }),
    deleteFinancialAccountAction: (id: string) =>
      submit({ type: "account.delete", id }),
    createCategoryAction: (data: unknown) =>
      submit({ type: "category.create", data }),
    updateCategoryAction: (id: string, data: unknown) =>
      submit({ type: "category.update", id, data }),
    archiveCategoryAction: (id: string) =>
      submit({ type: "category.archive", id }),
    deleteCategoryAction: (id: string) =>
      submit({ type: "category.delete", id }),
    createRecurringPaymentAction: (data: unknown) =>
      submit({ type: "recurring.create", data }),
    updateRecurringPaymentAction: (id: string, data: unknown) =>
      submit({ type: "recurring.update", id, data }),
    pauseRecurringPaymentAction: (id: string) =>
      submit({ type: "recurring.pause", id }),
    cancelRecurringPaymentAction: (id: string) =>
      submit({ type: "recurring.cancel", id }),
    recordRecurringPaymentAction: (id: string) =>
      submit({ type: "recurring.record", id }),
    updateUserFinanceSettingsAction: (data: unknown) =>
      submit({ type: "settings.update", data }),
  }
}
