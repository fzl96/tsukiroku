"use server"

import { revalidatePath } from "next/cache"

import {
  archiveFinancialAccount,
  createFinancialAccount,
  deleteFinancialAccount,
  reorderFinancialAccounts,
  updateFinancialAccount,
} from "@/features/accounts/service"
import { actionData, actionError } from "@/lib/action-result"
import { requireUser } from "@/lib/auth"

export async function createFinancialAccountAction(input: unknown) {
  try {
    const user = await requireUser()
    const account = await createFinancialAccount(user.id, input)
    revalidatePath("/dashboard")
    return actionData(account)
  } catch (error) {
    return actionError(error)
  }
}

export async function updateFinancialAccountAction(
  accountId: string,
  input: unknown,
) {
  try {
    const user = await requireUser()
    const account = await updateFinancialAccount(user.id, accountId, input)
    revalidatePath("/dashboard")
    return actionData(account)
  } catch (error) {
    return actionError(error)
  }
}

export async function archiveFinancialAccountAction(accountId: string) {
  try {
    const user = await requireUser()
    const account = await archiveFinancialAccount(user.id, accountId)
    revalidatePath("/dashboard")
    return actionData(account)
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteFinancialAccountAction(accountId: string) {
  try {
    const user = await requireUser()
    await deleteFinancialAccount(user.id, accountId)
    revalidatePath("/dashboard")
    return actionData({ success: true })
  } catch (error) {
    return actionError(error)
  }
}

export async function reorderFinancialAccountsAction(accountIds: unknown) {
  try {
    const user = await requireUser()
    await reorderFinancialAccounts(user.id, accountIds)
    revalidatePath("/dashboard")
    return actionData({ success: true })
  } catch (error) {
    return actionError(error)
  }
}
