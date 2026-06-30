"use server"

import { revalidatePath, updateTag } from "next/cache"

import {
  archiveCategory,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/categories/service"
import { actionData, actionError } from "@/lib/action-result"
import { requireUser } from "@/lib/auth"

function revalidateCategoryViews(userId: string) {
  revalidatePath("/dashboard")
  revalidatePath("/finances")
  updateTag(`categories:${userId}`)
}

export async function createCategoryAction(input: unknown) {
  try {
    const user = await requireUser()
    const category = await createCategory(user.id, input)
    revalidateCategoryViews(user.id)
    return actionData(category)
  } catch (error) {
    return actionError(error)
  }
}

export async function updateCategoryAction(categoryId: string, input: unknown) {
  try {
    const user = await requireUser()
    const category = await updateCategory(user.id, categoryId, input)
    revalidateCategoryViews(user.id)
    return actionData(category)
  } catch (error) {
    return actionError(error)
  }
}

export async function archiveCategoryAction(categoryId: string) {
  try {
    const user = await requireUser()
    const category = await archiveCategory(user.id, categoryId)
    revalidateCategoryViews(user.id)
    return actionData(category)
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteCategoryAction(categoryId: string) {
  try {
    const user = await requireUser()
    await deleteCategory(user.id, categoryId)
    revalidateCategoryViews(user.id)
    return actionData({ success: true })
  } catch (error) {
    return actionError(error)
  }
}
