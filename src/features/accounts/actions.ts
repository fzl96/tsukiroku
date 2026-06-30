"use server"

import { revalidatePath, revalidateTag } from "next/cache"

import {
  archiveFinancialAccount,
  createFinancialAccount,
  deleteFinancialAccount,
  reorderFinancialAccounts,
  updateFinancialAccount,
} from "@/features/accounts/service"
import { actionData, actionError } from "@/lib/action-result"
import { requireUser } from "@/lib/auth"

function revalidateAccountViews(userId: string) {
  revalidatePath("/dashboard")
  revalidatePath("/finances")
  revalidateTag(`accounts:${userId}`, "max")
}

export async function createFinancialAccountAction(input: unknown) {
  try {
    const user = await requireUser()
    const account = await createFinancialAccount(user.id, input)
    revalidateAccountViews(user.id)
    return actionData(account)
  } catch (error) {
    return actionError(error)
  }
}

export async function updateFinancialAccountAction(
  accountId: string,
  input: unknown
) {
  try {
    const user = await requireUser()
    const account = await updateFinancialAccount(user.id, accountId, input)
    revalidateAccountViews(user.id)
    return actionData(account)
  } catch (error) {
    return actionError(error)
  }
}

export async function archiveFinancialAccountAction(accountId: string) {
  try {
    const user = await requireUser()
    const account = await archiveFinancialAccount(user.id, accountId)
    revalidateAccountViews(user.id)
    return actionData(account)
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteFinancialAccountAction(accountId: string) {
  try {
    const user = await requireUser()
    await deleteFinancialAccount(user.id, accountId)
    revalidateAccountViews(user.id)
    return actionData({ success: true })
  } catch (error) {
    return actionError(error)
  }
}

export async function reorderFinancialAccountsAction(accountIds: unknown) {
  try {
    const user = await requireUser()
    await reorderFinancialAccounts(user.id, accountIds)
    revalidateAccountViews(user.id)
    return actionData({ success: true })
  } catch (error) {
    return actionError(error)
  }
}
