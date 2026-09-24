// Isolated browser harness: no database, credentials, or production auth bypass.
// Run: bun tests/finance-browser/server.ts (after next build for compiled CSS).
import { initTRPC, TRPCError } from "@trpc/server"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import superjson from "superjson"
import { financeMutationSchema } from "@/features/finances/validations"
import { applyFinanceMutation } from "@/features/finances/optimistic"
import { financeFixture } from "@/features/finances/test-fixtures"
import type { FinancePatch } from "@/features/finances/types"

let snapshot = financeFixture()
let delay = 1500
let failNext = false
const t = initTRPC.create({ transformer: superjson })
const router = t.router({
  finance: t.router({
    snapshot: t.procedure.query(() => snapshot),
    mutate: t.procedure
      .input(financeMutationSchema)
      .mutation(async ({ input }) => {
        await Bun.sleep(delay)
        if (failNext) {
          failNext = false
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Simulated save failure",
          })
        }
        snapshot = applyFinanceMutation(snapshot, input)
        for (const rows of [
          snapshot.accounts,
          snapshot.categories,
          snapshot.transactions,
          snapshot.recurringPayments,
        ]) {
          for (const row of rows)
            if (row.id.startsWith("optimistic:"))
              row.id = row.id.replace("optimistic:", "saved:")
        }
        const id =
          "id" in input.command ? input.command.id : `saved:${input.clientId}`
        const patch: FinancePatch = {}
        if (input.command.type.startsWith("account."))
          patch.account = snapshot.accounts.find((row) => row.id === id)
        if (input.command.type.startsWith("category."))
          patch.category = snapshot.categories.find((row) => row.id === id)
        if (input.command.type.startsWith("transaction."))
          patch.transaction = snapshot.transactions.find((row) => row.id === id)
        if (input.command.type.startsWith("recurring."))
          patch.recurringPayment = snapshot.recurringPayments.find(
            (row) => row.id === id
          )
        if (input.command.type === "recurring.record")
          patch.transaction = snapshot.transactions.find(
            (row) => row.id === `saved:${input.clientId}`
          )
        return { clientId: input.clientId, patch }
      }),
  }),
})
const bundle = await Bun.build({
  entrypoints: ["tests/finance-browser/client.tsx"],
  target: "browser",
  define: { "process.env.NODE_ENV": '"development"' },
})
if (!bundle.success) throw new Error(bundle.logs.join("\n"))
const css = (
  await Array.fromAsync(new Bun.Glob("*.css").scan(".next/static/chunks"))
).map((path) => `.next/static/chunks/${path}`)
Bun.serve({
  hostname: "127.0.0.1",
  port: 3101,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname.startsWith("/api/trpc/"))
      return fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router,
        createContext: () => ({}),
      })
    if (url.pathname === "/test-control") {
      failNext = url.searchParams.get("fail") === "true"
      delay = Number(url.searchParams.get("delay") ?? 1500)
      return Response.json({ ok: true })
    }
    if (url.pathname === "/client.js")
      return new Response(bundle.outputs[0], {
        headers: { "content-type": "text/javascript" },
      })
    if (url.pathname === "/styles.css")
      return new Response(
        await Promise.all(css.map((path) => Bun.file(path).text())).then(
          (parts) => parts.join("\n")
        ),
        { headers: { "content-type": "text/css" } }
      )
    return new Response(
      '<!doctype html><html><head><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script type="module" src="/client.js"></script></body></html>',
      { headers: { "content-type": "text/html" } }
    )
  },
})
console.log("Finance fixture running at http://127.0.0.1:3101/finance")
