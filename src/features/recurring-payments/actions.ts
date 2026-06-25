"use server"

import { revalidatePath } from "next/cache"

import {
  cancelRecurringPayment,
  createRecurringPayment,
  deleteRecurringPayment,
  pauseRecurringPayment,
  recordRecurringPayment,
  updateRecurringPayment,
} from "@/features/recurring-payments/service"
import { actionData, actionError } from "@/lib/action-result"
import { requireUser } from "@/lib/auth"

function revalidateRecurringPaymentViews() {
  revalidatePath("/dashboard")
  revalidatePath("/finances")
}

export async function createRecurringPaymentAction(input: unknown) {
  try {
    const user = await requireUser()
    const recurringPayment = await createRecurringPayment(user.id, input)
    revalidateRecurringPaymentViews()
    return actionData(recurringPayment)
  } catch (error) {
    return actionError(error)
  }
}

export async function updateRecurringPaymentAction(
  recurringPaymentId: string,
  input: unknown
) {
  try {
    const user = await requireUser()
    const recurringPayment = await updateRecurringPayment(
      user.id,
      recurringPaymentId,
      input
    )
    revalidateRecurringPaymentViews()
    return actionData(recurringPayment)
  } catch (error) {
    return actionError(error)
  }
}

export async function pauseRecurringPaymentAction(recurringPaymentId: string) {
  try {
    const user = await requireUser()
    const recurringPayment = await pauseRecurringPayment(
      user.id,
      recurringPaymentId
    )
    revalidateRecurringPaymentViews()
    return actionData(recurringPayment)
  } catch (error) {
    return actionError(error)
  }
}

export async function cancelRecurringPaymentAction(recurringPaymentId: string) {
  try {
    const user = await requireUser()
    const recurringPayment = await cancelRecurringPayment(
      user.id,
      recurringPaymentId
    )
    revalidateRecurringPaymentViews()
    return actionData(recurringPayment)
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteRecurringPaymentAction(recurringPaymentId: string) {
  try {
    const user = await requireUser()
    await deleteRecurringPayment(user.id, recurringPaymentId)
    revalidateRecurringPaymentViews()
    return actionData({ success: true })
  } catch (error) {
    return actionError(error)
  }
}

export async function recordRecurringPaymentAction(
  recurringPaymentId: string,
  options?: unknown
) {
  try {
    const user = await requireUser()
    const result = await recordRecurringPayment(
      user.id,
      recurringPaymentId,
      options
    )
    revalidateRecurringPaymentViews()
    return actionData(result)
  } catch (error) {
    return actionError(error)
  }
}
