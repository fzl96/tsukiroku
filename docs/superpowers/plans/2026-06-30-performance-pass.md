# Performance Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut per-request latency and remove the data-growth scaling cliff on the finances page via SQL balance aggregation, per-user data caching, local JWT auth verification, and transaction-pooler connections.

**Architecture:** Four independent workstreams, each a self-contained, committable task. No new dependencies. Pure functions are unit-tested with `bun test`; infra/auth changes are verified by `tsc` plus manual checks against the running app.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM (`postgres-js`), Supabase (`@supabase/ssr`, `@supabase/auth-js`), `decimal.js`, `bun test`.

## Global Constraints

- Feature-first layout: reads in `features/<f>/queries.ts`, mutations in `features/<f>/actions.ts`, pure helpers beside their consumers. (per `AGENTS.md`)
- Files and folders use kebab-case; React components PascalCase.
- Money math uses `decimal.js` and `formatMoney` from `@/lib/money` — never native float arithmetic.
- `unstable_cache` callbacks must NOT read `cookies`/`headers`. Resolve `userId` outside the cache scope and pass it in.
- Cache tags are per-user: `accounts:${userId}`, `categories:${userId}`, `settings:${userId}`.
- Run commands with `bun`. Typecheck: `bun run typecheck`. Tests: `bun test <path>`.

---

## File Structure

- `src/features/accounts/balances.ts` — pure balance math. Gains `AccountBalanceInput` type + `aggregateBalanceRows`; `computeAccountBalances` changes to consume aggregates.
- `src/features/accounts/balances.test.ts` — updated to the new pipeline.
- `src/features/accounts/queries.ts` — `getAccountBalances` rewritten to two SQL `GROUP BY` queries; new `getCachedFinancialAccounts`.
- `src/features/categories/queries.ts` — new `getCachedCategories`.
- `src/features/settings/service.ts` — new `getCachedUserFinanceSettings`.
- `src/features/{accounts,categories,settings}/actions.ts` — add `revalidateTag` beside existing `revalidatePath`.
- `src/app/(dashboard)/finances/page.tsx` — call cached query variants.
- `src/lib/auth.ts` — `getCurrentUser` uses `getClaims()`.
- `src/db/index.ts` — pool tuning.
- `drizzle.config.ts` — migrations use `DIRECT_URL` when present.
- `.env` — runtime `DATABASE_URL` → port `6543`; add `DIRECT_URL` (port `5432`).

---

## Task 1: Balance aggregation in Postgres

Replace the full-history fetch (every POSTED row pulled into JS) with two grouped aggregates, and refactor the pure reducer to consume aggregates.

**Files:**
- Modify: `src/features/accounts/balances.ts`
- Modify: `src/features/accounts/balances.test.ts`
- Modify: `src/features/accounts/queries.ts` (`getAccountBalances`)
- Test: `src/features/accounts/balances.test.ts`

**Interfaces:**
- Consumes: `formatMoney` from `@/lib/money`; `Decimal` from `decimal.js`.
- Produces:
  - `type AccountBalanceInput = { accountId: string; income: string; expense: string; transferIn: string; transferOut: string }`
  - `computeAccountBalances(accounts: BalanceAccount[], inputs: AccountBalanceInput[]): AccountBalance[]`
  - `aggregateBalanceRows(rows: BalanceTransaction[]): AccountBalanceInput[]`
  - `getAccountBalances(userId: string, accounts: FinancialAccount[]): Promise<AccountBalance[]>` (signature unchanged)

- [ ] **Step 1: Rewrite the test to the new pipeline**

Replace the body of `src/features/accounts/balances.test.ts` with:

```ts
import { describe, expect, test } from "bun:test"
import Decimal from "decimal.js"

import {
  aggregateBalanceRows,
  computeAccountBalances,
} from "@/features/accounts/balances"
import { formatMoney } from "@/lib/money"

type Account = { id: string; initialBalance: string; currency: string }
type Row = {
  accountId: string
  transferAccountId: string | null
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  amount: string
}

// Reference implementation: the original per-account reduction over raw rows.
function referenceBalance(account: Account, rows: Row[]) {
  const balance = rows.reduce((total, row) => {
    const amount = new Decimal(row.amount)

    if (row.type === "INCOME" && row.accountId === account.id) {
      return total.plus(amount)
    }
    if (row.type === "EXPENSE" && row.accountId === account.id) {
      return total.minus(amount)
    }
    if (row.type === "TRANSFER" && row.accountId === account.id) {
      return total.minus(amount)
    }
    if (row.type === "TRANSFER" && row.transferAccountId === account.id) {
      return total.plus(amount)
    }
    return total
  }, new Decimal(account.initialBalance))

  return formatMoney(balance)
}

const accounts: Account[] = [
  { id: "a", initialBalance: "100.00", currency: "USD" },
  { id: "b", initialBalance: "0.00", currency: "USD" },
  { id: "c", initialBalance: "50.00", currency: "EUR" },
]

const rows: Row[] = [
  { accountId: "a", transferAccountId: null, type: "INCOME", amount: "200.00" },
  { accountId: "a", transferAccountId: null, type: "EXPENSE", amount: "30.50" },
  { accountId: "a", transferAccountId: "b", type: "TRANSFER", amount: "40.00" },
  { accountId: "b", transferAccountId: "c", type: "TRANSFER", amount: "10.00" },
  { accountId: "c", transferAccountId: null, type: "INCOME", amount: "5.25" },
  // Transaction referencing an account not in the list should be ignored,
  // except its credit to an in-set transfer target.
  { accountId: "z", transferAccountId: "a", type: "TRANSFER", amount: "999.00" },
]

describe("computeAccountBalances + aggregateBalanceRows", () => {
  test("aggregated pipeline matches the per-account reference", () => {
    const result = computeAccountBalances(accounts, aggregateBalanceRows(rows))
    const byId = new Map(result.map((item) => [item.accountId, item]))

    for (const account of accounts) {
      expect(byId.get(account.id)?.amount).toBe(referenceBalance(account, rows))
    }
  })

  test("credits an in-set transfer target even when the source is out of set", () => {
    const result = computeAccountBalances(accounts, aggregateBalanceRows(rows))
    expect(result.find((item) => item.accountId === "a")?.amount).toBe(
      referenceBalance(accounts[0], rows)
    )
  })

  test("returns initial balance when no aggregates touch an account", () => {
    const result = computeAccountBalances(
      [{ id: "x", initialBalance: "12.34", currency: "USD" }],
      []
    )
    expect(result).toEqual([
      { accountId: "x", amount: "12.34", currency: "USD" },
    ])
  })

  test("preserves account order and currency", () => {
    const result = computeAccountBalances(accounts, aggregateBalanceRows(rows))
    expect(result.map((item) => item.accountId)).toEqual(["a", "b", "c"])
    expect(result.map((item) => item.currency)).toEqual(["USD", "USD", "EUR"])
  })

  test("applies income, expense, transferIn, transferOut directly", () => {
    const result = computeAccountBalances(
      [{ id: "a", initialBalance: "100.00", currency: "USD" }],
      [
        {
          accountId: "a",
          income: "200.00",
          expense: "30.50",
          transferIn: "999.00",
          transferOut: "40.00",
        },
      ]
    )
    expect(result[0].amount).toBe("1228.50")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/accounts/balances.test.ts`
Expected: FAIL — `aggregateBalanceRows` is not exported / `computeAccountBalances` signature mismatch.

- [ ] **Step 3: Refactor `balances.ts` to aggregate inputs**

Replace the contents of `src/features/accounts/balances.ts` with:

```ts
import Decimal from "decimal.js"

import { formatMoney } from "@/lib/money"

export type AccountBalance = {
  accountId: string
  amount: string
  currency: string
}

export type AccountBalanceInput = {
  accountId: string
  income: string
  expense: string
  transferIn: string
  transferOut: string
}

type BalanceAccount = {
  id: string
  initialBalance: string
  currency: string
}

type BalanceTransaction = {
  accountId: string
  transferAccountId: string | null
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  amount: string
}

/**
 * Computes each account's balance from pre-aggregated per-account sums:
 * initialBalance + income - expense + transferIn - transferOut. Accounts with
 * no matching aggregate keep their initial balance. Aggregates for accounts not
 * in `accounts` are ignored.
 */
export function computeAccountBalances(
  accounts: BalanceAccount[],
  inputs: AccountBalanceInput[]
): AccountBalance[] {
  const byId = new Map(inputs.map((input) => [input.accountId, input]))

  return accounts.map((account) => {
    const input = byId.get(account.id)
    let total = new Decimal(account.initialBalance)

    if (input) {
      total = total
        .plus(input.income)
        .minus(input.expense)
        .plus(input.transferIn)
        .minus(input.transferOut)
    }

    return {
      accountId: account.id,
      amount: formatMoney(total),
      currency: account.currency,
    }
  })
}

type MutableAggregate = {
  income: Decimal
  expense: Decimal
  transferIn: Decimal
  transferOut: Decimal
}

/**
 * Reduces raw POSTED transactions into per-account aggregates, mirroring the two
 * SQL `GROUP BY` queries in {@link import("@/features/accounts/queries").getAccountBalances}.
 * Used as the testable reference for the SQL aggregation.
 */
export function aggregateBalanceRows(
  rows: BalanceTransaction[]
): AccountBalanceInput[] {
  const totals = new Map<string, MutableAggregate>()

  const ensure = (accountId: string) => {
    let entry = totals.get(accountId)
    if (!entry) {
      entry = {
        income: new Decimal(0),
        expense: new Decimal(0),
        transferIn: new Decimal(0),
        transferOut: new Decimal(0),
      }
      totals.set(accountId, entry)
    }
    return entry
  }

  for (const row of rows) {
    const amount = new Decimal(row.amount)

    if (row.type === "INCOME") {
      ensure(row.accountId).income = ensure(row.accountId).income.plus(amount)
      continue
    }

    if (row.type === "EXPENSE") {
      ensure(row.accountId).expense = ensure(row.accountId).expense.plus(amount)
      continue
    }

    // TRANSFER: debit the source, credit the target.
    const source = ensure(row.accountId)
    source.transferOut = source.transferOut.plus(amount)

    if (row.transferAccountId) {
      const target = ensure(row.transferAccountId)
      target.transferIn = target.transferIn.plus(amount)
    }
  }

  return [...totals.entries()].map(([accountId, entry]) => ({
    accountId,
    income: entry.income.toString(),
    expense: entry.expense.toString(),
    transferIn: entry.transferIn.toString(),
    transferOut: entry.transferOut.toString(),
  }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/features/accounts/balances.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Rewrite `getAccountBalances` to use SQL aggregation**

In `src/features/accounts/queries.ts`, update the imports and replace `getAccountBalances`:

```ts
import { and, asc, eq, isNotNull, sql } from "drizzle-orm"

import { db } from "@/db"
import { financialAccount, transaction, type FinancialAccount } from "@/db/schema"
import {
  computeAccountBalances,
  type AccountBalance,
  type AccountBalanceInput,
} from "@/features/accounts/balances"
```

```ts
/**
 * Computes balances for all given accounts using two grouped aggregate queries
 * over the user's POSTED transactions, transferring O(accounts x types) rows
 * instead of the full history.
 */
export async function getAccountBalances(
  userId: string,
  accounts: FinancialAccount[]
): Promise<AccountBalance[]> {
  if (!accounts.length) {
    return []
  }

  const postedByUser = and(
    eq(transaction.userId, userId),
    eq(transaction.status, "POSTED")
  )

  const [outgoing, incoming] = await Promise.all([
    db
      .select({
        accountId: transaction.accountId,
        type: transaction.type,
        total: sql<string>`coalesce(sum(${transaction.amount}), 0)`,
      })
      .from(transaction)
      .where(postedByUser)
      .groupBy(transaction.accountId, transaction.type),
    db
      .select({
        accountId: transaction.transferAccountId,
        total: sql<string>`coalesce(sum(${transaction.amount}), 0)`,
      })
      .from(transaction)
      .where(
        and(
          postedByUser,
          eq(transaction.type, "TRANSFER"),
          isNotNull(transaction.transferAccountId)
        )
      )
      .groupBy(transaction.transferAccountId),
  ])

  const inputs = new Map<string, AccountBalanceInput>()
  const ensure = (accountId: string) => {
    let input = inputs.get(accountId)
    if (!input) {
      input = {
        accountId,
        income: "0",
        expense: "0",
        transferIn: "0",
        transferOut: "0",
      }
      inputs.set(accountId, input)
    }
    return input
  }

  for (const row of outgoing) {
    const input = ensure(row.accountId)
    if (row.type === "INCOME") {
      input.income = row.total
    } else if (row.type === "EXPENSE") {
      input.expense = row.total
    } else if (row.type === "TRANSFER") {
      input.transferOut = row.total
    }
  }

  for (const row of incoming) {
    if (!row.accountId) {
      continue
    }
    ensure(row.accountId).transferIn = row.total
  }

  return computeAccountBalances(accounts, [...inputs.values()])
}
```

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 7: Manual balance verification**

Start the app (`bun run dev`), open `/finances`, and confirm each account's balance matches its value before this change (income/expense/transfer math unchanged). If you have a transfer between two of your accounts, confirm the source decreased and the target increased by the same amount.

- [ ] **Step 8: Commit**

```bash
git add src/features/accounts/balances.ts src/features/accounts/balances.test.ts src/features/accounts/queries.ts
git commit -m "perf: aggregate account balances in postgres"
```

---

## Task 2: Per-user data cache for low-churn reads

Cache accounts, categories, and settings reads with `unstable_cache` keyed/tagged per user; invalidate on the relevant mutations. Transactions and recurring payments stay uncached. (Account/category/settings `Date` columns have no UI consumers, so cache serialization is safe.)

**Files:**
- Modify: `src/features/accounts/queries.ts` (add `getCachedFinancialAccounts`)
- Modify: `src/features/categories/queries.ts` (add `getCachedCategories`)
- Modify: `src/features/settings/service.ts` (add `getCachedUserFinanceSettings`)
- Modify: `src/features/accounts/actions.ts`, `src/features/categories/actions.ts`, `src/features/settings/actions.ts` (add `revalidateTag`)
- Modify: `src/app/(dashboard)/finances/page.tsx` (use cached variants)

**Interfaces:**
- Consumes: `listFinancialAccounts`, `listCategories`, `getUserFinanceSettings` (existing, unchanged); `requireUser()` from `@/lib/auth`.
- Produces:
  - `getCachedFinancialAccounts(userId: string): Promise<FinancialAccount[]>`
  - `getCachedCategories(userId: string): Promise<Category[]>`
  - `getCachedUserFinanceSettings(userId: string): Promise<UserFinanceSettings | null>`

- [ ] **Step 1: Add `getCachedFinancialAccounts`**

In `src/features/accounts/queries.ts`, add the import and a cached wrapper below `listFinancialAccounts`:

```ts
import { unstable_cache } from "next/cache"
```

```ts
/**
 * Per-user cached variant of {@link listFinancialAccounts} (no filters).
 * Invalidated via `revalidateTag(`accounts:${userId}`)` on account mutations.
 */
export function getCachedFinancialAccounts(userId: string) {
  return unstable_cache(
    () => listFinancialAccounts(userId),
    ["financial-accounts", userId],
    { tags: [`accounts:${userId}`], revalidate: 3600 }
  )()
}
```

- [ ] **Step 2: Add `getCachedCategories`**

In `src/features/categories/queries.ts`, add the import and wrapper below `listCategories`:

```ts
import { unstable_cache } from "next/cache"
```

```ts
/**
 * Per-user cached variant of {@link listCategories} (no filters).
 * Invalidated via `revalidateTag(`categories:${userId}`)` on category mutations.
 */
export function getCachedCategories(userId: string) {
  return unstable_cache(
    () => listCategories(userId),
    ["categories", userId],
    { tags: [`categories:${userId}`], revalidate: 3600 }
  )()
}
```

- [ ] **Step 3: Add `getCachedUserFinanceSettings`**

In `src/features/settings/service.ts`, add the import and wrapper below `getUserFinanceSettings`:

```ts
import { unstable_cache } from "next/cache"
```

```ts
/**
 * Per-user cached variant of {@link getUserFinanceSettings}. For brand-new users
 * this may cache `null` until the settings tag is revalidated by
 * `createDefaultFinanceSettingsAction`; existing users (the hot path) hit cache.
 */
export function getCachedUserFinanceSettings(userId: string) {
  return unstable_cache(
    () => getUserFinanceSettings(userId),
    ["user-finance-settings", userId],
    { tags: [`settings:${userId}`], revalidate: 3600 }
  )()
}
```

- [ ] **Step 4: Invalidate the accounts tag on account mutations**

In `src/features/accounts/actions.ts`, update the import and helper:

```ts
import { revalidatePath, revalidateTag } from "next/cache"
```

The helper currently takes no arguments. Change it to accept the user id and add the tag, then pass `user.id` at each call site:

```ts
function revalidateAccountViews(userId: string) {
  revalidatePath("/dashboard")
  revalidatePath("/finances")
  revalidateTag(`accounts:${userId}`)
}
```

In every action in this file, change `revalidateAccountViews()` to `revalidateAccountViews(user.id)`.

- [ ] **Step 5: Invalidate the categories tag on category mutations**

In `src/features/categories/actions.ts`:

```ts
import { revalidatePath, revalidateTag } from "next/cache"
```

```ts
function revalidateCategoryViews(userId: string) {
  revalidatePath("/dashboard")
  revalidatePath("/finances")
  revalidateTag(`categories:${userId}`)
}
```

Change every `revalidateCategoryViews()` call to `revalidateCategoryViews(user.id)`.

- [ ] **Step 6: Invalidate the settings tag on settings mutations**

In `src/features/settings/actions.ts`, update the import and add the tag in both actions:

```ts
import { revalidatePath, revalidateTag } from "next/cache"
```

In `createDefaultFinanceSettingsAction` and `updateUserFinanceSettingsAction`, after the two `revalidatePath` calls, add:

```ts
    revalidateTag(`settings:${user.id}`)
```

- [ ] **Step 7: Use cached variants in the finances page**

In `src/app/(dashboard)/finances/page.tsx`, update imports:

```ts
import {
  getAccountBalances,
  getCachedFinancialAccounts,
} from "@/features/accounts/queries"
import { getCachedCategories } from "@/features/categories/queries"
import {
  createDefaultFinanceSettings,
  getCachedUserFinanceSettings,
} from "@/features/settings/service"
```

Replace the three read calls:

```ts
  const existingSettings = await getCachedUserFinanceSettings(user.id)
```

```ts
  const [accounts, categories] = await Promise.all([
    getCachedFinancialAccounts(user.id),
    getCachedCategories(user.id),
  ])
```

Leave `listTransactions`, `getAccountBalances`, and `listRecurringPayments` calls unchanged.

- [ ] **Step 8: Typecheck and run the suite**

Run: `bun run typecheck`
Expected: no errors.

Run: `bun test`
Expected: PASS (existing suite, including `finances-page.test.tsx`).

- [ ] **Step 9: Manual cache-invalidation verification**

Start the app. On `/finances`: create or rename an account → the list updates immediately on next navigation; add/rename a category → reflected immediately; change a settings value (e.g. week start) → reflected immediately. (Each proves the matching `revalidateTag` fires.)

- [ ] **Step 10: Commit**

```bash
git add src/features/accounts/queries.ts src/features/categories/queries.ts src/features/settings/service.ts src/features/accounts/actions.ts src/features/categories/actions.ts src/features/settings/actions.ts "src/app/(dashboard)/finances/page.tsx"
git commit -m "perf: cache accounts, categories, and settings reads per user"
```

---

## Task 3: Local JWT auth verification

Replace the per-request network call to Supabase Auth (`getUser`) with local JWT signature verification (`getClaims`), which the project's ES256 signing keys support.

**Files:**
- Modify: `src/lib/auth.ts` (`getCurrentUser`)

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `cache` from `react`.
- Produces: `getCurrentUser(): Promise<CurrentUser | null>` and `requireUser()` — signatures unchanged; `CurrentUser` shape unchanged (`{ id, email }`).

- [ ] **Step 1: Switch `getCurrentUser` to `getClaims`**

In `src/lib/auth.ts`, replace the `getCurrentUser` implementation (keep the `cache(...)` wrapper, the `CurrentUser` type, and `requireUser` as-is):

```ts
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    return null
  }

  const { claims } = data

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  }
})
```

Note: `getClaims()` reads the session from cookies (local) and verifies the JWT signature against the project JWKS, fetched once per server instance and cached. It falls back to a network `getUser` automatically only if local verification is impossible (e.g. symmetric keys) — so behaviour is safe regardless.

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no errors. (If `claims.sub` is typed as optional, narrow with `if (!claims.sub) return null` before the return and use `claims.sub`.)

- [ ] **Step 3: Manual auth verification**

Start the app. While logged in, load `/finances` — it renders with your data (proves `id` resolves from claims). Then clear the session cookie / log out and load `/finances` — you are redirected to login (proves `null` path / `requireUser` still throws).

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts
git commit -m "perf: verify auth jwt locally instead of network getUser"
```

---

## Task 4: Transaction-pooler connections for serverless

Point the runtime at Supabase's transaction pooler (port `6543`, IPv4-proxied), keep migrations on the session pooler/direct via `DIRECT_URL`, and allow modest in-request connection parallelism.

**Files:**
- Modify: `.env` (not committed)
- Modify: `drizzle.config.ts`
- Modify: `src/db/index.ts`

**Interfaces:**
- Consumes: `getServerEnv().DATABASE_URL`; `process.env.DIRECT_URL`.
- Produces: no exported API change; `db` client behaviour change only.

- [ ] **Step 1: Update environment variables**

In `.env`:
- Change the `DATABASE_URL` port from `5432` to `6543` (same host `aws-1-ap-southeast-1.pooler.supabase.com`, same `postgres.<ref>` user). This is the transaction pooler.
- Add a `DIRECT_URL` equal to the *original* string (port `5432`, the session pooler) for migrations:

```bash
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

Mirror both variables in the deployment environment (Vercel project env: `DATABASE_URL` → `6543`, `DIRECT_URL` → `5432`).

- [ ] **Step 2: Point migrations at `DIRECT_URL` when present**

In `drizzle.config.ts`, replace the credential resolution so migrations avoid the transaction pooler (which rejects prepared statements / session state):

```ts
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (!migrationUrl) {
  throw new Error("DATABASE_URL or DIRECT_URL is required to run Drizzle commands")
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
})
```

(Remove the old `if (!process.env.DATABASE_URL)` guard and the inline `dbCredentials.url` reference; keep the `loadEnvConfig`/imports at the top.)

- [ ] **Step 3: Tune the runtime pool**

In `src/db/index.ts`, update the `postgres(...)` options:

```ts
const client =
  globalThis.tsukirokuPostgresClient ??
  postgres(getServerEnv().DATABASE_URL, {
    max: 3,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  })
```

(`prepare: false` is required by the transaction pooler and stays; `max: 3` lets the page's `Promise.all` reads overlap while staying small enough not to exhaust the pooler under fan-out.)

- [ ] **Step 4: Verify migrations and runtime connect**

Run: `bun run db:migrate`
Expected: connects via `DIRECT_URL` and reports no pending migrations (or applies cleanly). No "prepared statement" errors.

Run: `bun run dev`, load `/finances`.
Expected: page loads and queries succeed over port `6543`.

- [ ] **Step 5: Commit**

```bash
git add drizzle.config.ts src/db/index.ts
git commit -m "perf: use transaction pooler at runtime, direct url for migrations"
```

(Do not commit `.env`; it is gitignored.)

---

## Self-Review

**Spec coverage:**
- Workstream 1 (local JWT) → Task 3. ✔
- Workstream 2 (SQL balance aggregation, pure reducer kept + equivalence test) → Task 1. ✔
- Workstream 3 (transaction pooler, `max` tuning, migration caveat) → Task 4. ✔
- Workstream 4 (cache accounts/categories/settings, per-user tags, `revalidateTag` in actions, transactions uncached) → Task 2. ✔
- Out-of-scope items (indexes, materialized balances, cached transaction lists, Cache Components) — correctly absent. ✔

**Placeholder scan:** No TBD/TODO; all code blocks are complete; the only "manual" steps are genuine app-level verifications that cannot be unit-tested (auth signing, live DB sums, cache invalidation), each with concrete observable expectations.

**Type consistency:** `AccountBalanceInput` (`income`/`expense`/`transferIn`/`transferOut`: `string`) is produced by `aggregateBalanceRows` and the `getAccountBalances` merge, and consumed by `computeAccountBalances` — names and types match across Task 1. Cache tag strings (`accounts:`/`categories:`/`settings:${userId}`) match between the `unstable_cache` wrappers (Task 2 steps 1-3) and the `revalidateTag` calls (steps 4-6). `getCurrentUser`/`CurrentUser` shape unchanged, so Task 3 needs no downstream edits.
