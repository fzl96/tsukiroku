# Finance Backend Design

## Goal

Implement the missing backend layers for the finance tracker while preserving the existing Drizzle table names and migrations.

## Existing State

The project already has the core finance schema in `src/db/schema/finance.ts`:

- `user_finance_settings`
- `financial_account`
- `category`
- `transaction`
- `recurring_payment`

The schema already defines the required enums, foreign keys, indexes, timestamps, Supabase `auth.users` ownership, and `numeric(18, 2)` money columns. The missing backend work is the application layer around these tables.

## Chosen Approach

Keep the current schema and build feature-first backend modules:

- `src/features/settings`
- `src/features/accounts`
- `src/features/categories`
- `src/features/transactions`
- `src/features/recurring-payments`
- `src/features/dashboard`

Each feature owns its Zod validation schemas, read queries, and mutation services. Server Actions will be thin wrappers that call services after resolving the current user from Supabase.

## Supporting Libraries

- `src/lib/auth.ts` exposes `getCurrentUser()` and `requireUser()`.
- `src/lib/action-result.ts` defines the shared `{ data } | { error }` response shape.
- `src/lib/errors.ts` defines typed backend errors and public error mapping.
- `src/lib/money.ts` wraps `decimal.js` and keeps money values as string-safe decimals.

## Backend Rules

Every read and write takes a trusted `userId` from the server context. Resource ownership checks query by both `id` and `userId`, returning `NOT_FOUND` when no row is found.

Only `POSTED` transactions affect balances and dashboard cashflow. Recurring payments never affect balances directly; they generate forecasts and can be recorded into real transactions.

Archived accounts and categories are hidden by default and rejected for new transactions or recurring payments. Account/category deletion is blocked when the spec says historical links should be preserved.

## Testing

Use Bun tests for core domain behavior:

- money decimal parsing and arithmetic
- transaction input cross-field validation
- recurring interval and forecast generation
- service-level business rules using mocked or transactional data where practical

Run `bun test`, `bun run typecheck`, and `bun run lint` before reporting completion.
