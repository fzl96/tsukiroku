# Finance Backend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the missing backend validation, query, service, and server-action layers for the finance tracker.

**Architecture:** Preserve the existing Drizzle schema and table names. Add feature-first modules under `src/features/*`, with shared auth, error, action-result, and money helpers under `src/lib`.

**Tech Stack:** Next.js App Router Server Actions, Supabase auth, Drizzle ORM, PostgreSQL, Zod, Decimal.js, Bun tests.

---

### Task 1: Shared Backend Foundation

**Files:**

- Create: `src/lib/action-result.ts`
- Create: `src/lib/errors.ts`
- Create: `src/lib/money.ts`
- Create: `src/lib/auth.ts`
- Test: `src/lib/money.test.ts`

**Steps:**

1. Write failing tests for positive decimal validation and Decimal-safe add/subtract formatting.
2. Run `bun test src/lib/money.test.ts` and verify the tests fail because helpers are missing.
3. Implement shared result, error, money, and auth helpers.
4. Run `bun test src/lib/money.test.ts`.
5. Run `bun run typecheck`.

### Task 2: Settings, Accounts, and Categories

**Files:**

- Create: `src/features/settings/validations.ts`
- Create: `src/features/settings/service.ts`
- Create: `src/features/accounts/validations.ts`
- Create: `src/features/accounts/queries.ts`
- Create: `src/features/accounts/service.ts`
- Create: `src/features/accounts/actions.ts`
- Create: `src/features/categories/validations.ts`
- Create: `src/features/categories/queries.ts`
- Create: `src/features/categories/service.ts`
- Create: `src/features/categories/actions.ts`

**Steps:**

1. Write failing validation tests for settings, account, and category inputs.
2. Implement Zod schemas.
3. Implement user-scoped services and read queries.
4. Add server actions that resolve `requireUser()` and return the shared action result shape.
5. Run targeted tests and `bun run typecheck`.

### Task 3: Transactions

**Files:**

- Create: `src/features/transactions/validations.ts`
- Create: `src/features/transactions/queries.ts`
- Create: `src/features/transactions/service.ts`
- Create: `src/features/transactions/actions.ts`
- Test: `src/features/transactions/validations.test.ts`

**Steps:**

1. Write failing tests for income, expense, and transfer validation rules.
2. Implement transaction Zod schemas.
3. Implement ownership checks for accounts, categories, recurring payments, and transfers.
4. Implement create/update/delete/void/get/list queries and services.
5. Run targeted tests and `bun run typecheck`.

### Task 4: Recurring Payments

**Files:**

- Create: `src/features/recurring-payments/validations.ts`
- Create: `src/features/recurring-payments/schedule.ts`
- Create: `src/features/recurring-payments/queries.ts`
- Create: `src/features/recurring-payments/service.ts`
- Create: `src/features/recurring-payments/actions.ts`
- Test: `src/features/recurring-payments/schedule.test.ts`

**Steps:**

1. Write failing tests for interval calculation and forecast generation.
2. Implement recurring payment schemas and schedule helpers.
3. Implement create/update/pause/cancel/delete/get/list services.
4. Implement record-to-transaction in a database transaction, including duplicate prevention and advancing from old `nextDueDate`.
5. Run targeted tests and `bun run typecheck`.

### Task 5: Dashboard and Reports

**Files:**

- Create: `src/features/dashboard/queries.ts`
- Create: `src/features/dashboard/types.ts`
- Create: `src/features/reports/queries.ts`

**Steps:**

1. Write focused tests for grouped money aggregation helpers where feasible.
2. Implement dashboard summary, cashflow, category breakdown, account balances, and upcoming recurring forecast queries.
3. Implement monthly cashflow, category breakdown, account balance timeline, and recurring monthly estimate queries.
4. Run targeted tests and `bun run typecheck`.

### Task 6: Final Verification

**Steps:**

1. Run `bun test`.
2. Run `bun run typecheck`.
3. Run `bun run lint`.
4. Review `git diff` for scope and unrelated changes.
