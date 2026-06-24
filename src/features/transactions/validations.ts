import { z } from "zod"

import { categoryKindSchema } from "@/features/categories/validations"
import { assertPositiveMoney } from "@/lib/money"

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE", "TRANSFER"])
export const transactionStatusSchema = z.enum(["PENDING", "POSTED", "VOID"])

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

const transactionInputBaseSchema = z.object({
  accountId: z.string().trim().min(1),
  transferAccountId: nullableIdSchema,
  title: z.string().trim().min(1).max(160),
  type: transactionTypeSchema,
  status: transactionStatusSchema.default("POSTED"),
  amount: z.string().transform((value) => assertPositiveMoney(value)),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO code"),
  occurredAt: z.date(),
  merchant: nullableTextSchema,
  note: nullableTextSchema,
  reference: nullableTextSchema,
  categoryId: nullableIdSchema,
  recurringPaymentId: nullableIdSchema,
})

export const createTransactionSchema = transactionInputBaseSchema.superRefine(
  (data, ctx) => {
    if (data.type === "TRANSFER") {
      if (!data.transferAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["transferAccountId"],
          message: "Transfer destination account is required",
        })
      }

      if (data.transferAccountId === data.accountId) {
        ctx.addIssue({
          code: "custom",
          path: ["transferAccountId"],
          message: "Transfer destination must be different from source account",
        })
      }

      if (data.categoryId) {
        ctx.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "Transfers cannot have categories",
        })
      }

      if (data.recurringPaymentId) {
        ctx.addIssue({
          code: "custom",
          path: ["recurringPaymentId"],
          message: "Transfers cannot be linked to recurring payments",
        })
      }

      return
    }

    if (data.transferAccountId) {
      ctx.addIssue({
        code: "custom",
        path: ["transferAccountId"],
        message: "Only transfers can have a destination account",
      })
    }
  }
)
export const updateTransactionSchema = transactionInputBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  })

export const listTransactionsFiltersSchema = z
  .object({
    from: z.date().optional(),
    to: z.date().optional(),
    toExclusive: z.date().optional(),
    accountId: z.string().min(1).optional(),
    accountIds: z.array(z.string().min(1)).optional(),
    categoryId: z.string().min(1).optional(),
    categoryIds: z.array(z.string().min(1)).optional(),
    type: transactionTypeSchema.optional(),
    status: transactionStatusSchema.optional(),
  })
  .optional()

export const categoryCompatibleTransactionTypeSchema = categoryKindSchema

export type TransactionType = z.infer<typeof transactionTypeSchema>
export type TransactionStatus = z.infer<typeof transactionStatusSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
