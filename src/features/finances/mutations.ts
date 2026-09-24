import * as accounts from "@/features/accounts/service"
import * as categories from "@/features/categories/service"
import * as transactions from "@/features/transactions/service"
import * as recurring from "@/features/recurring-payments/service"
import { updateUserFinanceSettings } from "@/features/settings/service"
import type { FinanceCommand } from "@/features/finances/validations"
import type { FinancePatch } from "@/features/finances/types"

export async function executeFinanceCommand(
  userId: string,
  command: FinanceCommand
): Promise<FinancePatch> {
  switch (command.type) {
    case "transaction.create":
      return {
        transaction: await transactions.createTransaction(userId, command.data),
      }
    case "transaction.update":
      return {
        transaction: await transactions.updateTransaction(
          userId,
          command.id,
          command.data
        ),
      }
    case "transaction.delete":
      await transactions.deleteTransaction(userId, command.id)
      return {}
    case "account.create":
      return {
        account: await accounts.createFinancialAccount(userId, command.data),
      }
    case "account.update":
      return {
        account: await accounts.updateFinancialAccount(
          userId,
          command.id,
          command.data
        ),
      }
    case "account.archive":
      return {
        account: await accounts.archiveFinancialAccount(userId, command.id),
      }
    case "account.delete":
      await accounts.deleteFinancialAccount(userId, command.id)
      return {}
    case "category.create":
      return { category: await categories.createCategory(userId, command.data) }
    case "category.update":
      return {
        category: await categories.updateCategory(
          userId,
          command.id,
          command.data
        ),
      }
    case "category.archive":
      return { category: await categories.archiveCategory(userId, command.id) }
    case "category.delete":
      await categories.deleteCategory(userId, command.id)
      return {}
    case "recurring.create":
      return {
        recurringPayment: await recurring.createRecurringPayment(
          userId,
          command.data
        ),
      }
    case "recurring.update":
      return {
        recurringPayment: await recurring.updateRecurringPayment(
          userId,
          command.id,
          command.data
        ),
      }
    case "recurring.pause":
      return {
        recurringPayment: await recurring.pauseRecurringPayment(
          userId,
          command.id
        ),
      }
    case "recurring.cancel":
      return {
        recurringPayment: await recurring.cancelRecurringPayment(
          userId,
          command.id
        ),
      }
    case "recurring.record":
      return recurring.recordRecurringPayment(userId, command.id, command.data)
    case "settings.update":
      return { settings: await updateUserFinanceSettings(userId, command.data) }
  }
}
