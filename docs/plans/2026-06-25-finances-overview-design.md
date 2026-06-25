# Finances Overview Design

## Goal

Build the existing `/finances?tab=overview` tab into a usable finance overview that shows current account balances, cashflow trends, and month-to-date highlights.

## Scope

The overview will stay inside the existing finances route. The route already authenticates the user, loads finance settings, accounts, account balances, categories, recurring payments, and filtered transactions. The overview will reuse that data and add focused pure helpers for summary calculations.

## UI

The overview tab will replace the placeholder with:

- Current balance cards for all active accounts.
- A cashflow chart with a period toggle.
- Month-to-date highlight cards.
- A small insights section with suggested overview data.

The cashflow chart supports two periods:

- Monthly: twelve buckets for the current year.
- Daily: seven buckets for the current week.

Income renders as positive bars above the axis. Expenses render as negative bars below the axis.

## Data Model

The first implementation computes overview values from the transactions already loaded by `/finances`. This keeps the implementation small and aligned with the existing page contract.

Pure helper functions will produce:

- Chart buckets for monthly and weekly daily periods.
- Month-to-date total income, total expenses, net cashflow, and transaction count.
- The highest expense this month.
- The top expense category this month.

Amounts remain string-backed and use `Decimal` for arithmetic.

## Components

Most overview UI remains server-rendered inside `src/features/finances/components/finances-page.tsx`.

The Recharts chart will live in a focused client component:

```txt
src/features/finances/components/overview-cashflow-chart.tsx
```

Only chart bucket data and the selected display labels are passed across the client boundary.

## Error And Empty States

If there are no accounts, the overview shows the same empty account treatment used elsewhere.

If there are no transactions in a period, chart buckets render as zero values and highlight cards show neutral copy such as `No expenses this month`.

## Testing

Tests will cover pure overview helpers first:

- Monthly buckets cover the current year and sum income/expense by month.
- Daily buckets cover the current user week and sum income/expense by day.
- Highest monthly expense ignores income, transfers, and out-of-month transactions.
- Suggested stats compute month-to-date totals and top expense category.

The existing `FinancesPage` render test will gain overview assertions for the main labels and period links.
