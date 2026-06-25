"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { CashflowBucket } from "@/features/finances/overview"
import { formatCurrencyAmount } from "@/lib/money"

const chartConfig = {
  income: {
    label: "Income",
    color: "var(--chart-2)",
  },
  expense: {
    label: "Expense",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

type OverviewCashflowChartProps = {
  currency: string
  data: CashflowBucket[]
}

function formatAxisValue(value: number) {
  if (value === 0) {
    return "0"
  }

  return Math.abs(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })
}

export function OverviewCashflowChart({
  currency,
  data,
}: OverviewCashflowChartProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className="min-h-72 w-full"
      initialDimension={{ width: 720, height: 320 }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ bottom: 8, left: 0, right: 8, top: 8 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          tickLine={false}
          tickMargin={10}
        />
        <YAxis
          axisLine={false}
          tickFormatter={formatAxisValue}
          tickLine={false}
          width={44}
        />
        <ReferenceLine y={0} stroke="var(--border)" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                const numericValue =
                  typeof value === "number" || typeof value === "string"
                    ? Math.abs(Number(value))
                    : 0

                return (
                  <>
                    <span className="text-muted-foreground">
                      {name === "income" ? "Income" : "Expense"}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatCurrencyAmount(numericValue, currency)}
                    </span>
                  </>
                )
              }}
            />
          }
        />
        <Bar
          dataKey="income"
          fill="var(--color-income)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="expense"
          fill="var(--color-expense)"
          radius={[0, 0, 4, 4]}
        />
      </BarChart>
    </ChartContainer>
  )
}
