"use server"

import { revalidatePath } from "next/cache"

import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
  voidTransaction,
} from "@/features/transactions/service"
import { actionData, actionError } from "@/lib/action-result"
import { requireUser } from "@/lib/auth"

function revalidateTransactionViews() {
  revalidatePath("/dashboard")
  revalidatePath("/finances")
  revalidatePath("/finances/transaction/new")
}

export async function createTransactionAction(input: unknown) {
  try {
    const user = await requireUser()
    const transaction = await createTransaction(user.id, input)
    revalidateTransactionViews()
    return actionData(transaction)
  } catch (error) {
    return actionError(error)
  }
}

export async function updateTransactionAction(
  transactionId: string,
  input: unknown
) {
  try {
    const user = await requireUser()
    const transaction = await updateTransaction(user.id, transactionId, input)
    revalidateTransactionViews()
    return actionData(transaction)
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteTransactionAction(transactionId: string) {
  try {
    const user = await requireUser()
    await deleteTransaction(user.id, transactionId)
    revalidateTransactionViews()
    return actionData({ success: true })
  } catch (error) {
    return actionError(error)
  }
}

export async function voidTransactionAction(transactionId: string) {
  try {
    const user = await requireUser()
    const transaction = await voidTransaction(user.id, transactionId)
    revalidateTransactionViews()
    return actionData(transaction)
  } catch (error) {
    return actionError(error)
  }
}
