import { revalidateTag } from "next/cache"
import { protectedProcedure, router } from "@/lib/trpc/init"
import { getFinanceSnapshot } from "@/features/finances/queries"
import { executeFinanceCommand } from "@/features/finances/mutations"
import { financeMutationSchema } from "@/features/finances/validations"

export const financeRouter = router({
  snapshot: protectedProcedure.query(({ ctx }) =>
    getFinanceSnapshot(ctx.user.id)
  ),
  mutate: protectedProcedure
    .input(financeMutationSchema)
    .mutation(async ({ ctx, input }) => {
      const patch = await executeFinanceCommand(ctx.user.id, input.command)
      // A cache maintenance failure must not report a committed write as failed.
      try {
        for (const tag of ["accounts", "categories", "settings"]) {
          revalidateTag(`${tag}:${ctx.user.id}`, { expire: 0 })
        }
      } catch (error) {
        console.error("Finance cache invalidation failed", error)
      }
      return { clientId: input.clientId, patch }
    }),
})
