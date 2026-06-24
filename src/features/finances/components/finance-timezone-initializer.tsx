"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { updateUserFinanceSettingsAction } from "@/features/settings/actions"

type FinanceTimezoneInitializerProps = {
  baseCurrency: string
  monthStartDay: number
  timezone: string
  weekStartsOn: number
}

export function FinanceTimezoneInitializer({
  baseCurrency,
  monthStartDay,
  timezone,
  weekStartsOn,
}: FinanceTimezoneInitializerProps) {
  const router = useRouter()

  React.useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    if (!detectedTimezone || detectedTimezone === timezone) {
      return
    }

    void updateUserFinanceSettingsAction({
      baseCurrency,
      monthStartDay,
      timezone: detectedTimezone,
      weekStartsOn,
    }).then((result) => {
      if (!result.error) {
        router.refresh()
      }
    })
  }, [baseCurrency, monthStartDay, router, timezone, weekStartsOn])

  return null
}
