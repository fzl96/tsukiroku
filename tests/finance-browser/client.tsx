import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query"
import superjson from "superjson"
import { TRPCProvider } from "@/lib/trpc/client"
import type { AppRouter } from "@/lib/trpc/router"
import { makeQueryClient } from "@/lib/trpc/query-client"
import { FinanceClient } from "@/features/finances/components/finance-client"
import { financeFixture } from "@/features/finances/test-fixtures"

const queryClient = makeQueryClient()
const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
})
const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
})
queryClient.setQueryData(trpc.finance.snapshot.queryKey(), financeFixture())
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      <FinanceClient />
    </TRPCProvider>
  </QueryClientProvider>
)
