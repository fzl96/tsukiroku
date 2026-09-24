"use client"

import { useState, type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { createTRPCContext } from "@trpc/tanstack-react-query"
import superjson from "superjson"
import type { AppRouter } from "@/lib/trpc/router"
import { makeQueryClient } from "@/lib/trpc/query-client"

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

export function FinanceRPCProvider({ children }: { children: ReactNode }) {
  // The provider is scoped to the authenticated page, never shared between users.
  const [queryClient] = useState(makeQueryClient)
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
    })
  )
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
