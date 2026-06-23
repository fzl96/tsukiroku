import { z } from "zod"

import { AppError, toPublicError } from "@/lib/errors"

export type ActionError = {
  code: string
  message: string
  fieldErrors?: Record<string, string[]>
}

export type ActionResult<T> =
  | {
      data: T
      error?: never
    }
  | {
      data?: never
      error: ActionError
    }

export function actionData<T>(data: T): ActionResult<T> {
  return { data }
}

export function actionError(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) {
    return {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input.",
        fieldErrors: z.flattenError(error).fieldErrors,
      },
    }
  }

  if (error instanceof AppError) {
    return {
      error: toPublicError(error),
    }
  }

  console.error(error)

  return {
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong.",
    },
  }
}
