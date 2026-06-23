import { z } from "zod"

export const categoryKindSchema = z.enum(["INCOME", "EXPENSE"])

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: categoryKindSchema,
  color: z.string().trim().min(1).max(40).optional(),
  icon: z.string().trim().min(1).max(80).optional(),
})

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    kind: categoryKindSchema.optional(),
    color: z.string().trim().min(1).max(40).nullable().optional(),
    icon: z.string().trim().min(1).max(80).nullable().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  })

export const listCategoriesFiltersSchema = z
  .object({
    kind: categoryKindSchema.optional(),
    includeArchived: z.boolean().optional(),
  })
  .optional()

export type CategoryKind = z.infer<typeof categoryKindSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
