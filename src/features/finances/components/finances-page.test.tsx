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
  test("hides filter controls inside a closed disclosure by default", async () => {
    const { FinancesPage } =
      await import("@/features/finances/components/finances-page")

    const html = renderToStaticMarkup(
      <FinancesPage
        accountBalances={[
          { accountId: account.id, amount: "1100", currency: "USD" },
        ]}
        accounts={[account]}
        categories={[category]}
        filters={{
          accountIds: [],
          categoryIds: [],
          period: "all",
          type: "all",
        }}
        timezone="UTC"
        transactions={[transaction]}
      />
    )

    expect(html).toContain("<details")
    expect(html).not.toContain("<details open")
    expect(html).toContain("<summary")
    expect(html).toContain("Filters")
    expect(html.indexOf("Filters")).toBeLessThan(html.indexOf("Period"))
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
        filters={{
          accountIds: [],
          categoryIds: [],
          period: "all",
          type: "all",
        }}
        timezone="UTC"
        transactions={[transaction]}
      />
    )

    expect(html).toContain("+ New Transaction")
    expect(html).not.toContain('href="/finances/transaction/new"')
    expect(html).toContain('aria-haspopup="dialog"')
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
        filters={{
          accountIds: [],
          categoryIds: [],
          period: "all",
          type: "all",
        }}
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
