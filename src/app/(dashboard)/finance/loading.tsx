import {
  FinancesShell,
  FinancesTabSkeleton,
} from "@/features/finances/components/finances-page"

export default function Loading() {
  return (
    <FinancesShell tab="transactions">
      <FinancesTabSkeleton tab="transactions" />
    </FinancesShell>
  )
}
