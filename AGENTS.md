<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Project Architecture Rules

This project uses:

- Next.js App Router
- Supabase for database platform, auth, storage, and realtime
- Drizzle ORM for database schema, migrations, and database queries
- shadcn/ui for reusable UI primitives
- Zod for validation
- Feature-first folder organization

Agents must follow the structure and rules below when creating, editing, or refactoring code.

---

## Folder Structure

Use this structure as the default project layout:

```txt
src/
  app/
  features/
  db/
  lib/
  components/
  hooks/
  middleware.ts
```

### Main Responsibility Split

```txt
app/         = routes, layouts, pages, loading/error files, route handlers
features/    = business logic, feature UI, server actions, queries, validations
db/          = Drizzle schema, db client, migrations
lib/         = external services, Supabase clients, utilities, environment config
components/  = reusable/global UI components
hooks/       = reusable client-side React hooks
```

Do not create generic `frontend/`, `backend/`, `services/`, `controllers/`, or `repositories/` folders unless explicitly requested.

---

## App Router Rules

The `src/app` directory must stay thin.

Allowed in `app/`:

- `page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `route.ts`
- route groups like `(dashboard)`, `(auth)`, `(marketing)`

Avoid putting business logic directly inside `page.tsx`.

Pages should mostly compose feature-level queries and components.

Example:

```tsx
import { getTransactions } from "@/features/transactions/queries"
import { TransactionTable } from "@/features/transactions/components/transaction-table"

export default async function TransactionsPage() {
  const transactions = await getTransactions()

  return <TransactionTable data={transactions} />
}
```

---

## Feature Folder Rules

Business logic must be organized by feature.

Example:

```txt
src/features/transactions/
  components/
    transaction-form.tsx
    transaction-table.tsx
    transaction-filters.tsx
  actions.ts
  queries.ts
  validations.ts
  types.ts
```

Each feature may contain:

```txt
components/     feature-specific UI
actions.ts      server actions and mutations
queries.ts      read-only database queries
validations.ts  Zod schemas
types.ts        feature-specific TypeScript types
utils.ts        feature-specific helpers, only when needed
```

Do not place feature-specific components inside `src/components/shared`.

If a component is only used by one feature, keep it inside that feature.

---

## Server Action Rules

Server actions must live inside the relevant feature folder.

Preferred:

```txt
src/features/accounts/actions.ts
src/features/transactions/actions.ts
src/features/categories/actions.ts
```

Avoid:

```txt
src/app/actions.ts
src/lib/actions.ts
```

Every server action file must start with:

```ts
"use server"
```

Server actions should be used for:

- creating records
- updating records
- deleting records
- form submissions
- mutations that need authentication
- cache revalidation after mutations

Server actions must validate input using Zod before writing to the database.

Example:

```ts
"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { transactions } from "@/db/schema"
import { createTransactionSchema } from "./validations"

export async function createTransaction(input: unknown) {
  const data = createTransactionSchema.parse(input)

  await db.insert(transactions).values(data)

  revalidatePath("/transactions")
}
```

Do not trust client input.

---

## Query Rules

Read-only database access must live inside feature-level `queries.ts` files.

Preferred:

```txt
src/features/transactions/queries.ts
src/features/accounts/queries.ts
src/features/dashboard/queries.ts
```

Queries should:

- only read data
- not mutate data
- use Drizzle ORM
- be called from Server Components, server actions, or route handlers
- include authorization checks when user-specific data is involved

Avoid calling Drizzle directly from random components.

Example:

```ts
import { db } from "@/db"
import { transactions } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getTransactionsByUserId(userId: string) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
}
```

---

## Database Rules

Database files must live inside `src/db`.

Recommended structure:

```txt
src/db/
  index.ts
  schema/
    users.ts
    accounts.ts
    transactions.ts
    categories.ts
    subscriptions.ts
    index.ts
  migrations/
```

`src/db/index.ts` is responsible for creating and exporting the Drizzle database client.

Example:

```ts
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const client = postgres(process.env.DATABASE_URL!)

export const db = drizzle(client, { schema })
```

Drizzle schema files must be split by domain when the schema grows.

Good:

```txt
schema/users.ts
schema/accounts.ts
schema/transactions.ts
schema/categories.ts
```

Avoid putting a large production schema into one giant `schema.ts` file.

---

## Supabase Rules

Supabase should be used for:

- authentication
- session handling
- storage
- realtime
- Supabase-specific APIs

Drizzle should be used for normal database CRUD.

Use this separation:

```txt
Database CRUD       → Drizzle
Auth/session        → Supabase
Storage             → Supabase
Realtime            → Supabase
Migrations/schema   → Drizzle
```

Supabase client files must live here:

```txt
src/lib/supabase/
  client.ts
  server.ts
  middleware.ts
```

Use:

```txt
client.ts      for browser/client components
server.ts      for server components, server actions, and route handlers
middleware.ts  for session refresh middleware
```

Do not scatter Supabase client initialization across the app.

---

## Validation Rules

Use Zod for validation.

Validation schemas must live inside the relevant feature folder.

Example:

```txt
src/features/transactions/validations.ts
```

Validation schemas should be reused by:

- forms
- server actions
- route handlers
- input parsers

Example:

```ts
import { z } from "zod"

export const createTransactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().optional(),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  date: z.coerce.date(),
})
```

Never write to the database without validating external input first.

---

## Component Rules

Reusable global components belong in `src/components`.

Recommended structure:

```txt
src/components/
  ui/
  layout/
  shared/
```

Use:

```txt
components/ui/       shadcn/ui primitives
components/layout/   navbar, sidebar, shell, header
components/shared/   reusable app-specific components
```

shadcn/ui components must stay inside:

```txt
src/components/ui/
```

Examples:

```txt
components/ui/button.tsx
components/ui/dialog.tsx
components/ui/input.tsx
components/ui/table.tsx
```

Do not put business logic into `components/ui`.

Feature-specific components must stay inside their feature folder.

Example:

```txt
src/features/transactions/components/transaction-table.tsx
```

Do not move feature-specific components to `components/shared` unless they are reused by multiple unrelated features.

---

## Client and Server Component Rules

Prefer Server Components by default.

Use Client Components only when needed for:

- local state
- event handlers
- effects
- browser APIs
- interactive forms
- client-side animations
- third-party client-only libraries

Client components must include:

```tsx
"use client"
```

Do not add `"use client"` unnecessarily.

Keep Client Components as small as possible.

Recommended pattern:

```txt
Server page fetches data
→ passes data into a small Client Component
→ Client Component handles interactivity
```

---

## Auth Rules

User-specific queries and mutations must verify the current user/session.

Do not rely on user IDs passed from the client unless they are verified on the server.

Server actions should get the authenticated user from the server-side Supabase client or a shared auth helper.

Preferred location for auth helpers:

```txt
src/lib/auth.ts
```

Example helper name:

```ts
getCurrentUser()
requireUser()
```

Use `requireUser()` for protected mutations.

---

## Environment Variable Rules

Environment variable parsing must be centralized.

Preferred file:

```txt
src/lib/env.ts
```

Do not access `process.env` randomly throughout the app.

Use a typed env helper where possible.

Example categories:

```txt
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Never expose service-role keys to the client.

Only variables prefixed with `NEXT_PUBLIC_` may be used in client-side code.

---

## Import Rules

Use path aliases.

Preferred:

```ts
import { db } from "@/db"
import { Button } from "@/components/ui/button"
import { createTransaction } from "@/features/transactions/actions"
```

Avoid deep relative imports like:

```ts
import { db } from "../../../db"
```

Do not create circular imports between features.

Shared logic used by multiple features should move to `src/lib` or `src/components/shared`.

---

## Naming Rules

Use kebab-case for files and folders.

Good:

```txt
transaction-form.tsx
account-selector.tsx
create-transaction-button.tsx
```

Avoid:

```txt
TransactionForm.tsx
accountSelector.tsx
CreateTransactionButton.tsx
```

React component names must still use PascalCase.

Example:

```tsx
export function TransactionForm() {}
```

---

## Route Handler Rules

Route handlers belong in `app/api`.

Example:

```txt
src/app/api/webhooks/route.ts
```

Use route handlers for:

- webhooks
- external API callbacks
- endpoints needed by third-party services
- cases where server actions are not appropriate

Do not use route handlers for normal form mutations if a server action is simpler.

---

## Cache and Revalidation Rules

After mutations, server actions should revalidate affected pages.

Use:

```ts
import { revalidatePath } from "next/cache"
```

Example:

```ts
revalidatePath("/transactions")
```

For shared data, consider tag-based revalidation only when the app actually needs it.

Do not randomly call `router.refresh()` from the client when server-side revalidation is more appropriate.

---

## Error Handling Rules

Server actions should return predictable results when used by forms.

Preferred result shape:

```ts
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}
```

Do not leak raw database errors to the client.

Use generic user-facing messages.

Log detailed errors only on the server.

---

## Type Rules

Prefer inferred types from Drizzle and Zod.

Examples:

```ts
type Transaction = typeof transactions.$inferSelect
type NewTransaction = typeof transactions.$inferInsert
```

For Zod:

```ts
type CreateTransactionInput = z.infer<typeof createTransactionSchema>
```

Do not manually duplicate types that can be inferred safely.

---

## Form Rules

Forms should use feature-level validation schemas.

Preferred stack:

- React Hook Form
- Zod
- shadcn/ui form components
- server actions for submit

Form components should live inside the relevant feature folder.

Example:

```txt
src/features/transactions/components/transaction-form.tsx
```

Forms should not contain raw database calls.

---

## UI Rules

Use shadcn/ui primitives from:

```txt
src/components/ui
```

Build app-specific components on top of shadcn primitives.

Do not install random UI libraries unless explicitly approved.

Keep UI consistent with existing components.

Use shared components for repeated patterns:

```txt
empty-state.tsx
confirm-dialog.tsx
data-table.tsx
page-header.tsx
```

---

## Suggested Feature Layout for This App

For a finance app, use this structure:

```txt
src/features/
  auth/
    actions.ts
    components/
      login-form.tsx

  accounts/
    actions.ts
    queries.ts
    validations.ts
    types.ts
    components/
      account-form.tsx
      account-card.tsx
      account-selector.tsx

  transactions/
    actions.ts
    queries.ts
    validations.ts
    types.ts
    components/
      transaction-form.tsx
      transaction-table.tsx
      transaction-filters.tsx

  categories/
    actions.ts
    queries.ts
    validations.ts
    types.ts
    components/
      category-form.tsx
      category-badge.tsx

  subscriptions/
    actions.ts
    queries.ts
    validations.ts
    types.ts
    components/
      subscription-form.tsx
      subscription-list.tsx

  dashboard/
    queries.ts
    components/
      spending-chart.tsx
      balance-summary.tsx
      recent-transactions.tsx
```

---

## Things Agents Must Avoid

Agents must not:

- put all logic inside `app/page.tsx`
- create a giant `lib/actions.ts`
- create a giant `lib/queries.ts`
- call Drizzle directly from many random components
- put feature-specific UI in `components/shared`
- put business logic in `components/ui`
- use Supabase database queries everywhere when Drizzle is the ORM
- expose Supabase service-role keys to the client
- skip validation before database writes
- trust user IDs from the client
- add `"use client"` unnecessarily
- create unnecessary abstraction layers like controllers or repositories
- create circular dependencies between features
- duplicate types that can be inferred from Drizzle or Zod

---

## Default Decision Rules

When adding a new page:

1. Create the route in `src/app`.
2. Put feature-specific UI in `src/components/[feature]`.
3. Put reads in `src/features/[feature]/queries.ts`.
4. Put mutations in `src/features/[feature]/actions.ts`.
5. Put validation in `src/features/[feature]/validations.ts`.
6. Put database tables in `src/db/schema`.
7. Use shadcn primitives from `src/components/ui`.

When unsure where something belongs:

```txt
Route/page?              → app/
Specific to one feature? → features/[feature]/
Reusable UI?             → components/shared/
shadcn primitive?        → components/ui/
Database schema/client?  → db/
Supabase/auth/env utils? → lib/
Reusable React hook?     → hooks/
```

Keep the codebase simple, feature-first, typed, validated, and server-first.

<!-- END:nextjs-agent-rules -->
