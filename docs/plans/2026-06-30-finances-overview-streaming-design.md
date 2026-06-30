# Finances Overview Streaming Design

## Goal

Let the finances overview render section-by-section instead of waiting for every overview query to finish.

## Approach

The route will still resolve the authenticated user and finance settings first, because those determine authorization and date-range parsing. For the overview tab, it will then start the accounts, balances, categories, and transactions promises without awaiting them in the route.

The feature UI will render the existing page shell immediately and wrap each overview section in its own `Suspense` boundary:

- Net worth
- Monthly statement
- Cashflow
- Expense breakdown
- Accounts
- Notable signals

Each fallback keeps the same heading, spacing, borders, and grid shape as the loaded section. This gives React independent streaming points while keeping layout shift low.

## Testing

Add a server-render test that renders the streaming overview with never-resolving promises. The expected output is the real finances shell plus the per-section skeleton labels and layout classes, proving the fallbacks render without resolved data.
