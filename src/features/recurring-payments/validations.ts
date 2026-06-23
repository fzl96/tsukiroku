import { z } from "zod"

import { assertPositiveMoney } from "@/lib/money"

export const recurringPaymentTypeSchema = z.enum(["INCOME", "EXPENSE"])
export const recurringPaymentStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "CANCELED",
  "ENDED",
])
export const recurringFrequencySchema = z.enum([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
])

const nullableIdSchema = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null)

const nullableTextSchema = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null)

export const createRecurringPaymentSchema = z
  .object({
    accountId: z.string().trim().min(1),
    categoryId: nullableIdSchema,
    merchant: nullableTextSchema,
    name: z.string().trim().min(1).max(160),
    type: recurringPaymentTypeSchema,
    amount: z.string().transform((value) => assertPositiveMoney(value)),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO code"),
    frequency: recurringFrequencySchema,
    intervalCount: z.number().int().min(1).default(1),
    startDate: z.date().nullable().optional().transform((value) => value ?? null),
    nextDueDate: z.date(),
    endDate: z.date().nullable().optional().transform((value) => value ?? null),
    note: nullableTextSchema,
  })
  .superRefine((data, ctx) => {
    const startBoundary = data.startDate ?? data.nextDueDate

    if (data.endDate && data.endDate < startBoundary) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be after start or next due date",
      })
    }
  })

const recurringPaymentBaseUpdateSchema = z.object({
  accountId: z.string().trim().min(1).optional(),
  categoryId: nullableIdSchema,
  merchant: nullableTextSchema,
  name: z.string().trim().min(1).max(160).optional(),
  type: recurringPaymentTypeSchema.optional(),
  amount: z.string().transform((value) => assertPositiveMoney(value)).optional(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO code")
    .optional(),
  frequency: recurringFrequencySchema.optional(),
  intervalCount: z.number().int().min(1).optional(),
  startDate: z.date().nullable().optional(),
  nextDueDate: z.date().optional(),
  endDate: z.date().nullable().optional(),
  note: nullableTextSchema,
  status: recurringPaymentStatusSchema.optional(),
})

export const updateRecurringPaymentSchema = recurringPaymentBaseUpdateSchema.refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Provide at least one field to update",
  },
)

export const listRecurringPaymentsFiltersSchema = z
  .object({
    status: recurringPaymentStatusSchema.optional(),
    accountId: z.string().min(1).optional(),
    includeInactive: z.boolean().optional(),
  })
  .optional()

export const recurringForecastParamsSchema = z.object({
  from: z.date(),
  to: z.date(),
})

export const recordRecurringPaymentOptionsSchema = z
  .object({
    occurredAt: z.date().optional(),
    status: z.enum(["PENDING", "POSTED"]).optional(),
    allowDuplicate: z.boolean().optional(),
  })
  .optional()

export type RecurringPaymentType = z.infer<typeof recurringPaymentTypeSchema>
export type RecurringFrequency = z.infer<typeof recurringFrequencySchema>
export type CreateRecurringPaymentInput = z.infer<
  typeof createRecurringPaymentSchema
>
export type UpdateRecurringPaymentInput = z.infer<
  typeof updateRecurringPaymentSchema
>
