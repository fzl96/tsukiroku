export const errorCodes = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "DUPLICATE_RESOURCE",
  "INVALID_TRANSACTION_TYPE",
  "INVALID_CATEGORY_KIND",
  "INVALID_TRANSFER",
  "ACCOUNT_ARCHIVED",
  "CATEGORY_ARCHIVED",
  "RECURRING_PAYMENT_INACTIVE",
  "DUPLICATE_RECURRING_RECORD",
] as const

export type ErrorCode = (typeof errorCodes)[number]

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function unauthorized(message = "You must be signed in.") {
  return new AppError("UNAUTHORIZED", message)
}

export function notFound(message = "Resource not found.") {
  return new AppError("NOT_FOUND", message)
}

export function validationError(
  message: string,
  fieldErrors?: Record<string, string[]>,
) {
  return new AppError("VALIDATION_ERROR", message, fieldErrors)
}

export function duplicateResource(message = "Resource already exists.") {
  return new AppError("DUPLICATE_RESOURCE", message)
}

export function appError(code: ErrorCode, message: string) {
  return new AppError(code, message)
}

export function toPublicError(error: AppError) {
  return {
    code: error.code,
    message: error.message,
    fieldErrors: error.fieldErrors,
  }
}
