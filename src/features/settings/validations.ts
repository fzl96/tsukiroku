import { z } from "zod"

import {
  DEFAULT_FINANCE_TIMEZONE,
  isValidTimeZone,
} from "@/lib/timezone"

const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO code")

export const timezoneSchema = z
  .string()
  .trim()
  .default(DEFAULT_FINANCE_TIMEZONE)
  .refine((timezone) => isValidTimeZone(timezone), {
    message: "Timezone must be a valid IANA timezone",
  })

export const updateUserFinanceSettingsSchema = z.object({
  baseCurrency: currencyCodeSchema,
  timezone: timezoneSchema,
  weekStartsOn: z.number().int().min(0).max(6),
  monthStartDay: z.number().int().min(1).max(31),
})

export type UpdateUserFinanceSettingsInput = z.infer<
  typeof updateUserFinanceSettingsSchema
>
