"use client"

import { createContext, useContext } from "react"
import type {
  FinanceTab,
  FinancePeriod,
  FinanceTransactionTypeFilter,
  OverviewChartPeriod,
} from "@/features/finances/filters"

export type FinanceFilters = {
  accountIds: string[]
  categoryIds: string[]
  period: FinancePeriod
  type: FinanceTransactionTypeFilter
}
export type FinanceNavigation = {
  tab: FinanceTab
  chartPeriod: OverviewChartPeriod
  filters: FinanceFilters
}
export const initialFinanceNavigation: FinanceNavigation = {
  tab: "transactions",
  chartPeriod: "monthly",
  filters: { accountIds: [], categoryIds: [], period: "all", type: "all" },
}
export const FinanceNavigationContext = createContext({
  navigate: (update: Partial<FinanceNavigation>) => {
    void update
  },
})
export const useFinanceNavigation = () => useContext(FinanceNavigationContext)
