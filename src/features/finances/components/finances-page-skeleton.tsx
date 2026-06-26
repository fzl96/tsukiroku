import type { FinanceTab } from "@/features/finances/filters"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const tabLabels: Record<FinanceTab, string> = {
  overview: "Overview",
  transactions: "Transactions",
  recurring: "Recurring Payments",
  manage: "Manage",
}

/**
 * Mirrors the static shell of {@link FinancesPage} (header + tab bar) so a tab
 * navigation paints instantly while the data-dependent body streams in.
 */
export function FinancesPageSkeleton({ tab }: { tab: FinanceTab }) {
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1180px]">
        <header className="border-b border-border pb-9">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
                Ledger
              </p>
              <h1 className="mt-2 font-heading text-5xl leading-none tracking-tight sm:text-6xl">
                Finances
              </h1>
            </div>
          </div>
        </header>

        <nav
          className="flex flex-wrap gap-2 border-b border-border py-5"
          aria-label="Finance sections"
        >
          {(Object.keys(tabLabels) as FinanceTab[]).map((key) => (
            <span
              key={key}
              className={cn(
                "inline-flex h-8 items-center border border-border px-3 font-mono text-[11px] tracking-[0.14em] text-foreground uppercase",
                key === tab &&
                  "border-primary bg-primary text-primary-foreground"
              )}
            >
              {tabLabels[key]}
            </span>
          ))}
        </nav>

        <div className="space-y-6 py-6" aria-hidden="true">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </main>
  )
}
