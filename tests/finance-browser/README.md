# Finance interaction checks

Run `bun --bun next build`, then `bun tests/finance-browser/server.ts` and open
`http://127.0.0.1:3101/finance`.

This harness renders the production finance components and uses the real tRPC
transport and TanStack Query cache against an in-memory fixture. It never opens
a database connection or bypasses authentication in the app. Restart it to reset
the fixture. The server binds only to localhost.

The default mutation delay is 1.5 seconds. To change it or fail the next save,
request `/test-control?delay=2500&fail=true` on the fixture server.

Verify:

- Switching all four tabs leaves the URL at `/finance` and sends no requests.
- Filters and chart period controls change local state without navigation.
- Create a category: the dialog closes and the category appears before the
  delayed mutation response; its server ID replaces the temporary ID afterward.
- Record a recurring payment: the next due date, ledger, and account balance
  update together, including when switching tabs while the request is pending.
- Fail a recurring payment save, then create a category while it is pending:
  the payment rolls back, the category survives, and an error notification appears.
- Editing an item still being saved is rejected locally, preventing accidental
  duplicate recording while a write is in flight.

Unit coverage for projections, reconciliation, and rollback is in
`src/features/finances/optimistic.test.ts`. `bun test` runs it with the existing suite.

The initial server prefetch currently loads the full ledger into one user-scoped
cache so tabs, filters, summaries, and balances agree instantly. Rendering is
limited to seven days and five entries per day initially. Very large histories
will require a bounded ledger cache plus server aggregates; this harness does
not measure production database or initial hydration latency.
