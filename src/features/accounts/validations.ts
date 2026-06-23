import { z } from "zod"

import { assertNonNegativeMoney } from "@/lib/money"

export const financialAccountTypeSchema = z.enum([
  "CASH",
  "BANK",
  "EWALLET",
  "CREDIT_CARD",
  "INVESTMENT",
  "OTHER",
])

export const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO code")

const optionalTextSchema = z
  .string()
  .trim()
  .min(1)
  .optional()

export const createFinancialAccountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: financialAccountTypeSchema,
  currency: currencyCodeSchema,
  initialBalance: z
    .string()
    .default("0")
    .transform((value) => assertNonNegativeMoney(value)),
  displayOrder: z.number().int().optional(),
})

export const updateFinancialAccountSchema = z
  .object({
    name: optionalTextSchema,
    type: financialAccountTypeSchema.optional(),
    currency: currencyCodeSchema.optional(),
    initialBalance: z
      .string()
      .transform((value) => assertNonNegativeMoney(value))
      .optional(),
    displayOrder: z.number().int().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  })

export const listFinancialAccountsFiltersSchema = z
  .object({
    includeArchived: z.boolean().optional(),
  })
  .optional()

export const reorderFinancialAccountsSchema = z.array(z.string().min(1))

export type CreateFinancialAccountInput = z.infer<
  typeof createFinancialAccountSchema
>
export type UpdateFinancialAccountInput = z.infer<
  typeof updateFinancialAccountSchema
>
