import { router } from "@/lib/trpc/init"
import { financeRouter } from "@/features/finances/router"

export const appRouter = router({ finance: financeRouter })
export type AppRouter = typeof appRouter
