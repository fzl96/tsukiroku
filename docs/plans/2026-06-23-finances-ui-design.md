# Finances UI Design

## Goal

Build the first read-only Finances page at `/finances`, matching the provided reference image while using the existing finance backend queries.

## Route And Layout

The route lives at `src/app/(dashboard)/finances/page.tsx`. It stays thin: resolve the current user, parse filter search params, fetch finance data, and compose feature-level UI.

The dashboard sidebar is reduced to one active item: Finances. The visual treatment follows the reference with a pale canvas, quiet left rail, large serif page heading, compact uppercase labels, and thin outlined filter controls.

## Data

The page fetches:

- financial accounts from `listFinancialAccounts`
- categories from `listCategories`
- transactions from `listTransactions`

Filters are reflected in URL search params so the route remains server-rendered:

- `accountId`
- `categoryId`
- `period` with `all`, `week`, `month`, and `year`

## Components

Feature UI lives under `src/features/finances/components`. The first slice contains display-only components for filters, account/category chips, summary counts, and grouped transaction rows. Creation flows for transactions, recurring payments, and categories are intentionally out of scope.

## Empty And Error States

No accounts, categories, or transactions should render as quiet empty states inside the same layout instead of adding modal flows. Unauthenticated access uses the existing auth helper behavior.

## Verification

Run typecheck and lint after implementation. Add focused tests only for new non-trivial pure logic, such as period range parsing if it is factored into a helper.
