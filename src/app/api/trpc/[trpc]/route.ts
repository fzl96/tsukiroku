import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/lib/trpc/router"
import { createTRPCContext } from "@/lib/trpc/init"

function handler(req: Request) {
  // Cookie-authenticated writes must come from this origin.
  if (
    req.method === "POST" &&
    req.headers.get("origin") !== new URL(req.url).origin
  ) {
    return new Response("Forbidden", { status: 403 })
  }
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") console.error(error)
    },
  })
}
export { handler as GET, handler as POST }
