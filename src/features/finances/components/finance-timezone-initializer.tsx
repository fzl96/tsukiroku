"use client"

import { useEffect, useRef } from "react"
import { useFinanceActions } from "@/features/finances/components/finance-data-provider"

export function FinanceTimezoneInitializer(settings: {
  baseCurrency: string
  monthStartDay: number
  timezone: string
  weekStartsOn: number
}) {
  const started = useRef(false)
  const { updateUserFinanceSettingsAction } = useFinanceActions()
  useEffect(() => {
    if (started.current) return
    started.current = true
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || settings.timezone
    void updateUserFinanceSettingsAction({ ...settings, timezone })
  }, [settings, updateUserFinanceSettingsAction])
  return null
}
