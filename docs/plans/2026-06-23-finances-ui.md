# Finances UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the read-only `/finances` page with account, category, and period filtering.

**Architecture:** Keep App Router routes thin and put finance display UI in `src/features/finances/components`. Fetch data on the server from existing account, category, and transaction query modules, then render URL-driven filters and grouped transaction rows.

**Tech Stack:** Next.js App Router, React Server Components, Drizzle-backed feature queries, Tailwind CSS, shadcn/ui/sidebar.

---

### Task 1: Add Filter Range Helper

**Files:**

- Create: `src/features/finances/filters.ts`
- Test: `src/features/finances/filters.test.ts`

**Step 1: Write failing tests**

Test that `all` returns no date range and `week`, `month`, and `year` return date ranges anchored to a provided date.

**Step 2: Run tests to verify failure**

Run: `bun test src/features/finances/filters.test.ts`

Expected: FAIL because the helper does not exist.

**Step 3: Implement minimal helper**

Export `periodOptions`, `parsePeriod`, and `getPeriodRange`.

**Step 4: Run tests to verify pass**

Run: `bun test src/features/finances/filters.test.ts`

Expected: PASS.

### Task 2: Add Finances Display Components

**Files:**

- Create: `src/features/finances/components/finances-page.tsx`

**Step 1: Implement display component**

Render the reference-inspired shell: title, filter rows, account/category chips, transaction summary, and grouped transaction list.

**Step 2: Keep filters URL-driven**

Use anchor links with generated query strings for account, category, and period filters so no client component is needed.

### Task 3: Add `/finances` Route

**Files:**

- Create: `src/app/(dashboard)/finances/page.tsx`

**Step 1: Read Next.js docs**

Read the relevant App Router docs from `node_modules/next/dist/docs/`.

**Step 2: Implement thin server route**

Resolve `requireUser()`, parse `searchParams`, fetch accounts, categories, and transactions, and render `FinancesPage`.

### Task 4: Simplify Dashboard Sidebar

**Files:**

- Modify: `src/components/app-sidebar.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Replace sample nav**

Show only a `Finances` item linking to `/finances`.

**Step 2: Match reference layout**

Use a quiet sidebar and pale page canvas.

### Task 5: Verify

**Files:**

- No new files.

**Step 1: Run focused tests**

Run: `bun test src/features/finances/filters.test.ts`

**Step 2: Run typecheck and lint**

Run: `bun run typecheck`

Run: `bun run lint`
