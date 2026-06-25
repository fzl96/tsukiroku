import { describe, expect, mock, test } from "bun:test"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { Category, FinancialAccount, Transaction } from "@/db/schema"

mock.module("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

mock.module("next/navigation", () => ({
  useRouter: () => ({
    refresh: () => {},
  }),
}))

mock.module("@/components/ui/sheet", () => ({
  Sheet: ({ children }: React.PropsWithChildren) => <>{children}</>,
  SheetContent: ({
    children,
    className,
    side,
  }: React.PropsWithChildren<{ className?: string; side?: string }>) => (
    <aside className={className} data-side={side}>
      {children}
    </aside>
  ),
  SheetDescription: ({
    children,
    className,
  }: React.PropsWithChildren<{ className?: string }>) => (
    <p className={className}>{children}</p>
  ),
  SheetFooter: ({
    children,
    className,
  }: React.PropsWithChildren<{ className?: string }>) => (
    <footer className={className}>{children}</footer>
  ),
  SheetHeader: ({
    children,
    className,
  }: React.PropsWithChildren<{ className?: string }>) => (
    <header className={className}>{children}</header>
  ),
  SheetTitle: ({
    children,
    className,
  }: React.PropsWithChildren<{ className?: string }>) => (
    <h2 className={className}>{children}</h2>
  ),
  SheetTrigger: ({
    asChild,
    children,
  }: React.PropsWithChildren<{ asChild?: boolean }>) =>
    asChild && React.isValidElement(children) ? (
      React.cloneElement(
        children as React.ReactElement<Record<string, unknown>>,
        {
          "aria-haspopup": "dialog",
        }
      )
    ) : (
      <button type="button" aria-haspopup="dialog">
        {children}
      </button>
    ),
}))

const account = {
  id: "account_1",
  name: "Checking",
  color: "#2563eb",
  currency: "USD",
  initialBalance: "1000",
  isArchived: false,
  type: "BANK",
} as FinancialAccount

const category = {
  id: "category_1",
  name: "Salary",
  color: "#16a34a",
  kind: "INCOME",
} as Category

const transaction = {
  id: "transaction_1",
  accountId: account.id,
  amount: "100",
  categoryId: category.id,
  createdAt: new Date("2026-06-20T00:00:00.000Z"),
  currency: "USD",
  description: "June salary",
  merchant: null,
  note: null,
  occurredAt: new Date("2026-06-20T00:00:00.000Z"),
  recurringPaymentId: null,
  reference: null,
  status: "POSTED",
  title: null,
  transferAccountId: null,
  type: "INCOME",
  updatedAt: new Date("2026-06-20T00:00:00.000Z"),
  userId: "user_1",
} as Transaction

describe("FinancesPage", () => {
  test("renders four query-param tabs and defaults to transactions", async () => {
    const { FinancesPage } =
      await import("@/features/finances/components/finances-page")

    const html = renderToStaticMarkup(
      <FinancesPage
        accountBalances={[
          { accountId: account.id, amount: "1100", currency: "USD" },
        ]}
        accounts={[account]}
        categories={[category]}
        financeSettings={{
          baseCurrency: "USD",
          monthStartDay: 1,
          timezone: "UTC",
          weekStartsOn: 1,
        }}
        filters={{
          accountIds: [],
          categoryIds: [],
          period: "all",
          type: "all",
        }}
        tab="transactions"
        timezone="UTC"
        transactions={[transaction]}
      />
    )

    expect(html).toContain('href="/finances?tab=overview"')
    expect(html).toContain('href="/finances?tab=transactions"')
    expect(html).toContain('href="/finances?tab=recurring"')
    expect(html).toContain('href="/finances?tab=manage"')
    expect(html).toContain("sticky top-0 z-20 bg-background")
    expect(html).not.toContain("Recent transactions")
  })

  test("opens transaction filters from a right-side sheet", async () => {
    const { FinancesPage } =
      await import("@/features/finances/components/finances-page")

    const html = renderToStaticMarkup(
      <FinancesPage
        accountBalances={[
          { accountId: account.id, amount: "1100", currency: "USD" },
        ]}
        accounts={[account]}
        categories={[category]}
        financeSettings={{
          baseCurrency: "USD",
          monthStartDay: 1,
          timezone: "UTC",
          weekStartsOn: 1,
        }}
        filters={{
          accountIds: [],
          categoryIds: [],
          period: "all",
          type: "all",
        }}
        tab="transactions"
        timezone="UTC"
        transactions={[transaction]}
      />
    )

    expect(html).toContain("FILTER")
    expect(html).toContain("Filter transactions")
    expect(html).toContain('data-side="right"')
    expect(html).toContain("Period")
    expect(html).toContain("Account")
    expect(html).toContain("Category")
  })

  test("opens new transactions from an in-place drawer trigger", async () => {
    const { FinancesPage } =
      await import("@/features/finances/components/finances-page")

    const html = renderToStaticMarkup(
      <FinancesPage
        accountBalances={[
          { accountId: account.id, amount: "1100", currency: "USD" },
        ]}
        accounts={[account]}
        categories={[category]}
        financeSettings={{
          baseCurrency: "USD",
          monthStartDay: 1,
          timezone: "UTC",
          weekStartsOn: 1,
        }}
        filters={{
          accountIds: [],
          categoryIds: [],
          period: "all",
          type: "all",
        }}
        tab="transactions"
        timezone="UTC"
        transactions={[transaction]}
      />
    )

    expect(html).toContain("+ New Transaction")
    expect(html).not.toContain('href="/finances/transaction/new"')
    expect(html).toContain('aria-haspopup="dialog"')
  })

  test("renders manage lists for accounts categories and finance settings", async () => {
    const { FinancesPage } =
      await import("@/features/finances/components/finances-page")

    const html = renderToStaticMarkup(
      <FinancesPage
        accountBalances={[
          { accountId: account.id, amount: "1100", currency: "USD" },
        ]}
        accounts={[account]}
        categories={[category]}
        financeSettings={{
          baseCurrency: "USD",
          monthStartDay: 1,
          timezone: "UTC",
          weekStartsOn: 1,
        }}
        filters={{
          accountIds: [],
          categoryIds: [],
          period: "all",
          type: "all",
        }}
        tab="manage"
        timezone="UTC"
        transactions={[transaction]}
      />
    )

    expect(html).toContain("Accounts")
    expect(html).toContain("Categories")
    expect(html).toContain("Finance settings")
    expect(html).toContain("Base currency")
    expect(html).toContain("USD")
    expect(html).toContain("UTC")
    expect(html).toContain("+ New Account")
    expect(html).toContain("+ New Category")
  })

  test("renders account and category action drawers from pointer menu triggers", async () => {
    const { FinancesPage } =
      await import("@/features/finances/components/finances-page")

    const html = renderToStaticMarkup(
      <FinancesPage
        accountBalances={[
          { accountId: account.id, amount: "1100", currency: "USD" },
        ]}
        accounts={[account]}
        categories={[category]}
        financeSettings={{
          baseCurrency: "USD",
          monthStartDay: 1,
          timezone: "UTC",
          weekStartsOn: 1,
        }}
        filters={{
          accountIds: [],
          categoryIds: [],
          period: "all",
          type: "all",
        }}
        tab="manage"
        timezone="UTC"
        transactions={[transaction]}
      />
    )

    expect(html).toContain("cursor-pointer")
    expect(html).toContain(`Open ${account.name} actions`)
    expect(html).toContain(`Open ${category.name} actions`)
    expect(html).toContain("Edit account")
    expect(html).toContain("Archive account?")
    expect(html).toContain("Delete account?")
    expect(html).toContain("Edit category")
    expect(html).toContain("Archive category?")
    expect(html).toContain("Delete category?")
    expect(html).not.toContain("tabler-icon-dots-vertical")
  })

  test("renders placeholder states for overview and recurring payments", async () => {
    const { FinancesPage } =
      await import("@/features/finances/components/finances-page")

    const renderPage = (tab: "overview" | "recurring") =>
      renderToStaticMarkup(
        <FinancesPage
          accountBalances={[
            { accountId: account.id, amount: "1100", currency: "USD" },
          ]}
          accounts={[account]}
          categories={[category]}
          financeSettings={{
            baseCurrency: "USD",
            monthStartDay: 1,
            timezone: "UTC",
            weekStartsOn: 1,
          }}
          filters={{
            accountIds: [],
            categoryIds: [],
            period: "all",
            type: "all",
          }}
          tab={tab}
          timezone="UTC"
          transactions={[transaction]}
        />
      )

    expect(renderPage("overview")).toContain("Overview is coming next.")
    expect(renderPage("recurring")).toContain(
      "Recurring payments are coming next."
    )
  })

  test("sizes the transaction drawer from its usage and keeps header and actions sticky", async () => {
    const { FinancesPage } =
      await import("@/features/finances/components/finances-page")

    const html = renderToStaticMarkup(
      <FinancesPage
        accountBalances={[
          { accountId: account.id, amount: "1100", currency: "USD" },
        ]}
        accounts={[account]}
        categories={[category]}
        financeSettings={{
          baseCurrency: "USD",
          monthStartDay: 1,
          timezone: "UTC",
          weekStartsOn: 1,
        }}
        filters={{
          accountIds: [],
          categoryIds: [],
          period: "all",
          type: "all",
        }}
        tab="transactions"
        timezone="UTC"
        transactions={[transaction]}
      />
    )

    expect(html).toContain("data-[side=right]:sm:max-w-2xl")
    expect(html).toContain("data-[side=right]:lg:max-w-3xl")
    expect(html).toContain("sticky top-0")
    expect(html).toContain("overflow-y-auto")
    expect(html).toContain("sticky bottom-0")
    expect(html).toContain("Cancel")
    expect(html).toContain("Save")
  })
})
