import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { getCurrentUser } from "@/lib/auth"
import { AppError } from "@/lib/errors"

export async function createTRPCContext() {
  return { user: await getCurrentUser() }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause
    return {
      ...shape,
      message:
        cause instanceof AppError
          ? cause.message
          : shape.data.code === "INTERNAL_SERVER_ERROR"
            ? "Unable to save your changes. Please try again."
            : shape.message,
      data: { ...shape.data, stack: undefined },
    }
  },
})

export const router = t.router
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" })
  return next({ ctx: { user: ctx.user } })
})
