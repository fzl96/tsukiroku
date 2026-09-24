import { z } from "zod"
import {
  createFinancialAccountSchema,
  updateFinancialAccountSchema,
} from "@/features/accounts/validations"
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/features/categories/validations"
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/features/transactions/validations"
import {
  createRecurringPaymentSchema,
  updateRecurringPaymentSchema,
  recordRecurringPaymentOptionsSchema,
} from "@/features/recurring-payments/validations"
import { updateUserFinanceSettingsSchema } from "@/features/settings/validations"

const id = z
  .string()
  .min(1)
  .refine(
    (value) => !value.startsWith("optimistic:"),
    "This item is still saving."
  )
export const financeCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("transaction.create"),
    data: createTransactionSchema,
  }),
  z.object({
    type: z.literal("transaction.update"),
    id,
    data: updateTransactionSchema,
  }),
  z.object({ type: z.literal("transaction.delete"), id }),
  z.object({
    type: z.literal("account.create"),
    data: createFinancialAccountSchema,
  }),
  z.object({
    type: z.literal("account.update"),
    id,
    data: updateFinancialAccountSchema,
  }),
  z.object({ type: z.literal("account.archive"), id }),
  z.object({ type: z.literal("account.delete"), id }),
  z.object({ type: z.literal("category.create"), data: createCategorySchema }),
  z.object({
    type: z.literal("category.update"),
    id,
    data: updateCategorySchema,
  }),
  z.object({ type: z.literal("category.archive"), id }),
  z.object({ type: z.literal("category.delete"), id }),
  z.object({
    type: z.literal("recurring.create"),
    data: createRecurringPaymentSchema,
  }),
  z.object({
    type: z.literal("recurring.update"),
    id,
    data: updateRecurringPaymentSchema,
  }),
  z.object({ type: z.literal("recurring.pause"), id }),
  z.object({ type: z.literal("recurring.cancel"), id }),
  z.object({
    type: z.literal("recurring.record"),
    id,
    data: recordRecurringPaymentOptionsSchema,
  }),
  z.object({
    type: z.literal("settings.update"),
    data: updateUserFinanceSettingsSchema,
  }),
])
export type FinanceCommand = z.output<typeof financeCommandSchema>
export const financeMutationSchema = z.object({
  command: financeCommandSchema,
  clientId: z.string().uuid(),
  submittedAt: z.date(),
})
export type FinanceMutation = z.output<typeof financeMutationSchema>
