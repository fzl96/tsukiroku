"use server"

import { revalidatePath } from "next/cache"

import {
  createDefaultFinanceSettings,
  updateUserFinanceSettings,
} from "@/features/settings/service"
import { actionData, actionError } from "@/lib/action-result"
import { requireUser } from "@/lib/auth"

export async function createDefaultFinanceSettingsAction() {
  try {
    const user = await requireUser()
    const settings = await createDefaultFinanceSettings(user.id)
    revalidatePath("/dashboard")
    return actionData(settings)
  } catch (error) {
    return actionError(error)
  }
}

export async function updateUserFinanceSettingsAction(input: unknown) {
  try {
    const user = await requireUser()
    const settings = await updateUserFinanceSettings(user.id, input)
    revalidatePath("/dashboard")
    return actionData(settings)
  } catch (error) {
    return actionError(error)
  }
}
