# Performance Pass — Design

**Date:** 2026-06-30
**Status:** Approved (design), pending implementation plan
**Deployment target:** Vercel / serverless

## Goal

Reduce per-request latency and remove the data-growth scaling cliff on the
finances page, proactively (the app is not painfully slow yet). Four
independent workstreams, ordered by impact on serverless.

## Context

The finances route (`src/app/(dashboard)/finances/page.tsx`) runs, per load:
`requireUser()` → settings → `Promise.all([accounts, categories])` → tab-gated
`Promise.all([transactions, balances, recurring])`. Queries already take
`userId` as a plain argument and are de-N+1'd. Indexes on `transaction`
(`user_id, occurred_at`, plus account/category/recurring variants) already cover
the main filters and are **not** changed by this work.

Verified facts:
- `supabase.auth.getClaims()` is available in the installed `@supabase/auth-js`.
- Next 16 `unstable_cache` works without the `cacheComponents` flag, but
  **cannot read `cookies`/`headers` inside the cached function** — so cached
  queries must receive `userId` as an argument (they already do) and the user is
  resolved before the cache scope.

## Workstreams

### 1. Local JWT auth verification

**Problem:** `getCurrentUser()` in `src/lib/auth.ts` calls
`supabase.auth.getUser()`, a network round-trip to Supabase Auth on the critical
path of every page load (including cold starts).

**Change:** Use `supabase.auth.getClaims()`, which verifies the JWT locally
against the project JWKS (fetched once, then cached). Keep the React `cache()`
wrapper for per-request dedup. `getClaims` falls back to a network call
automatically when it cannot verify locally, so behavior degrades gracefully.

**Prerequisite — confirmed met:** The project's JWT signing key is **ECC
(P-256) → ES256, asymmetric**. Local verification is therefore the real path and
the latency win applies. Code still verifies locally and degrades gracefully if
keys ever change.

**Shape:** `getCurrentUser` returns the same `{ id, email }` shape, derived from
claims (`sub`, `email`) instead of the `user` object.

### 2. Balance aggregation in Postgres

**Problem:** `getAccountBalances` (`src/features/accounts/queries.ts`) pulls
**every** POSTED transaction row into JS and reduces in memory. Cost grows
linearly with history forever and transfers a large result set from a remote DB.

**Change:** Replace the full-history fetch with two grouped aggregates:
- `GROUP BY accountId, type` → income / expense / transfer-out sums per account.
- `GROUP BY transferAccountId WHERE type = 'TRANSFER'` → transfer-in sums per
  account.

This transfers O(accounts × types) rows instead of O(transactions). The pure
reducer `computeAccountBalances` (`src/features/accounts/balances.ts`) is kept
and refactored to consume **pre-aggregated rows** rather than raw transactions,
so `balances.test.ts` continues to exercise the balance math. Final per-account
balance = `initialBalance + income − expense − transferOut + transferIn`.

**Decision A (settled):** On-the-fly SQL aggregation, **not** a maintained
balance column. Accurate, no invalidation complexity, supported by existing
indexes. A maintained/materialized column is explicitly deferred (YAGNI) until
aggregation is measured to be slow.

### 3. Connection pooling for serverless

**Problem:** Two issues. (a) `DATABASE_URL` currently targets the Supabase
**session pooler** (`aws-1-ap-southeast-1.pooler.supabase.com:5432`,
user `postgres.<ref>`) — chosen for IPv4 compatibility (the direct connection is
IPv6-only without the paid add-on, and Vercel needs IPv4) — but session mode
holds a server connection for the whole function invocation, suboptimal for
Vercel fan-out. (b) `src/db/index.ts` sets `max: 1`, so the page's `Promise.all`
reads serialize over a single connection instead of overlapping.

**Change:**
- Point the **runtime** `DATABASE_URL` at the Supabase **transaction pooler**:
  same host and user, port `5432` → `6543`. The transaction pooler is also
  IPv4-proxied on the same `pooler.supabase.com` host, so IPv4 compatibility is
  preserved. It returns the connection to the pool after each transaction and
  *requires* `prepare: false`, which the client already sets — so this is a
  low-risk, port-only change.
- Raise `max` to a small value (≈3) to allow in-request parallelism; add
  `idle_timeout` and `connect_timeout`. `max` stays small so many concurrent
  lambda instances don't exhaust the pooler's connection limit.

**Caveat:** `drizzle-kit` migrations (`db:migrate` / `db:push`) should **not**
run through the transaction pooler (no prepared statements / no session state).
Keep migrations on the session pooler (`5432`) or a direct connection via a
separate `DIRECT_URL`, wired into `drizzle.config.ts` only. The runtime app uses
`6543`; migrations use `5432`/direct.

### 4. Next data cache for low-churn reads

**Problem:** `listFinancialAccounts`, `listCategories`, and
`getUserFinanceSettings` are re-fetched every navigation though they rarely
change.

**Change:** Wrap each in `unstable_cache`, keyed and tagged per user
(`accounts:${userId}`, `categories:${userId}`, `settings:${userId}`).
`userId` is resolved outside the cache scope and passed in (cookies/headers must
not be read inside). Invalidate with `revalidateTag` inside the existing
`actions.ts` mutations, alongside the current `revalidatePath` calls:
- `accounts/actions.ts` → `revalidateTag('accounts:${userId}')`
- `categories/actions.ts` → `revalidateTag('categories:${userId}')`
- `settings/actions.ts` → `revalidateTag('settings:${userId}')`

**Transactions stay uncached** — high churn and filter/period-dependent keys make
caching net-negative. Recurring payments stay uncached for the same churn
reasons.

**Decision B (settled):** `unstable_cache` with per-user tags, **not** the Next
16 Cache Components migration. No app-wide rendering-default flip; lowest risk
for a per-user dynamic app. Cache Components is a separate, larger migration if
pursued later.

## Out of scope

- Index changes (already adequate).
- Maintained/materialized balance column (Decision A).
- Caching transaction lists or recurring payments.
- `cacheComponents` / `'use cache'` migration (Decision B).

## Testing

- **Unit:** `computeAccountBalances` keeps its tests against the refactored
  pre-aggregated input shape. A new test asserts the SQL-aggregation mapping
  produces the same balances as the previous full-scan reducer over a fixture.
- **Manual against the running app:** auth still works (and falls back when
  signing keys are absent); cache invalidation — after creating/editing an
  account/category/settings the finances page reflects the change immediately;
  balances match expectations after income/expense/transfer mutations.

## Risks

- **Auth:** signing keys confirmed ES256, so the latency win applies; code still
  degrades gracefully if keys ever change. No regression risk.
- **Pool:** too-high `max` risks pooler exhaustion under fan-out. Mitigated by
  keeping `max` small (≈3) and verifying the pooler endpoint.
- **Cache staleness:** a missed `revalidateTag` shows stale accounts/categories.
  Mitigated by adding the tag invalidation in the same helper that already calls
  `revalidatePath`, and by a short `revalidate` TTL as a backstop.
