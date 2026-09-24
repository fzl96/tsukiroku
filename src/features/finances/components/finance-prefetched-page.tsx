import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query"
import { appRouter } from "@/lib/trpc/router"
import { createTRPCContext } from "@/lib/trpc/init"
import { makeQueryClient } from "@/lib/trpc/query-client"
import { FinanceRPCProvider } from "@/lib/trpc/client"
import { FinanceClient } from "@/features/finances/components/finance-client"

export async function FinancePrefetchedPage() {
  const queryClient = makeQueryClient()
  const ctx = await createTRPCContext()
  const trpc = createTRPCOptionsProxy({ router: appRouter, ctx, queryClient })
  await queryClient.fetchQuery(trpc.finance.snapshot.queryOptions())
  return (
    <FinanceRPCProvider key={ctx.user?.id}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <FinanceClient />
      </HydrationBoundary>
    </FinanceRPCProvider>
  )
}
