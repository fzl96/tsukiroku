# Finances Overview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the `/finances?tab=overview` tab with account balances, cashflow chart periods, month-to-date highlights, and suggested overview stats.

**Architecture:** Keep `/finances` as the only route. Add pure overview summary helpers under `src/features/finances`, render most UI in the existing server component, and isolate Recharts in one small client component with minimal serialized props.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Decimal.js, date-fns/date-fns-tz, shadcn/ui chart, Recharts, Bun tests.

---

### Task 1: Overview Summary Helpers

**Files:**

- Create: `src/features/finances/overview.ts`
- Create: `src/features/finances/overview.test.ts`

**Step 1: Write failing tests**

Add tests for:

- `buildMonthlyCashflowBuckets` returns 12 current-year buckets and sums income above zero and expenses below zero.
- `buildWeeklyCashflowBuckets` returns 7 user-week buckets and sums income/expense by day.
- `getMonthOverviewStats` returns month-to-date income, expenses, net cashflow, transaction count, highest expense, and top expense category.

**Step 2: Run tests to verify red**

Run:

```bash
bun test src/features/finances/overview.test.ts
```

Expected: FAIL because `src/features/finances/overview.ts` does not exist.

**Step 3: Implement helpers**

Create exported functions and types:

- `buildMonthlyCashflowBuckets(transactions, now, timezone)`
- `buildWeeklyCashflowBuckets(transactions, now, timezone, weekStartsOn)`
- `getMonthOverviewStats(transactions, categories, now, options)`

Use `Decimal` for math, date range helpers from `src/lib/timezone.ts`, and formatted money strings from `src/lib/money.ts`.

**Step 4: Run tests to verify green**

Run:

```bash
bun test src/features/finances/overview.test.ts
```

Expected: PASS.

### Task 2: Cashflow Chart Client Component

**Files:**

- Create: `src/features/finances/components/overview-cashflow-chart.tsx`
- Test indirectly through `src/features/finances/components/finances-page.test.tsx`

**Step 1: Write failing render test**

Add overview assertions to `FinancesPage` render tests for:

- Current balance heading.
- Cashflow heading.
- Links for `chartPeriod=monthly` and `chartPeriod=daily`.
- Highest expense this month.
- Suggested stats labels.

**Step 2: Run test to verify red**

Run:

```bash
bun test src/features/finances/components/finances-page.test.tsx
```

Expected: FAIL because overview still renders the placeholder.

**Step 3: Implement chart component**

Create a `"use client"` component that accepts:

- `data`
- `currency`
- `period`

Use `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `BarChart`, `Bar`, `CartesianGrid`, `ReferenceLine`, `XAxis`, and `YAxis`. Income uses positive values; expenses use negative values.

**Step 4: Run tests**

Run:

```bash
bun test src/features/finances/components/finances-page.test.tsx
```

Expected: still FAIL until Task 3 wires the UI.

### Task 3: Overview UI And Query Param

**Files:**

- Modify: `src/features/finances/filters.ts`
- Modify: `src/features/finances/filters.test.ts`
- Modify: `src/app/(dashboard)/finances/page.tsx`
- Modify: `src/features/finances/components/finances-page.tsx`

**Step 1: Write failing filter test**

Add `parseOverviewChartPeriod` tests:

- Unknown values default to `monthly`.
- `monthly` and `daily` parse correctly.

**Step 2: Run filter tests red**

Run:

```bash
bun test src/features/finances/filters.test.ts
```

Expected: FAIL because parser does not exist.

**Step 3: Implement filter parser and route prop**

Add chart period parsing in `filters.ts`. Parse `chartPeriod` in the finances route and pass it into `FinancesPage`.

**Step 4: Replace placeholder with overview**

Add `OverviewTab` inside `finances-page.tsx`. It should render account balance cards, chart period links, the client chart, month highlights, and suggested stats. Build chart links with `tab=overview&chartPeriod=...`.

**Step 5: Run focused tests**

Run:

```bash
bun test src/features/finances/filters.test.ts src/features/finances/overview.test.ts src/features/finances/components/finances-page.test.tsx
```

Expected: PASS.

### Task 4: Verification

**Files:**

- No new files.

**Step 1: Run quality checks**

Run:

```bash
bun test
bun run typecheck
bun run lint
```

Expected: PASS.

**Step 2: Review diff**

Run:

```bash
git diff --stat
git diff
```

Expected: only overview-related files changed.
