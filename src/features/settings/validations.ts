import { z } from "zod"

const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO code")

export const updateUserFinanceSettingsSchema = z.object({
  baseCurrency: currencyCodeSchema,
  weekStartsOn: z.number().int().min(0).max(6),
  monthStartDay: z.number().int().min(1).max(31),
})

export type UpdateUserFinanceSettingsInput = z.infer<
  typeof updateUserFinanceSettingsSchema
>
