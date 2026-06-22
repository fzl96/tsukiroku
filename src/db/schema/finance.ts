import { createId } from "@paralleldrive/cuid2"
import { relations } from "drizzle-orm"
import {
  boolean,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

const authSchema = pgSchema("auth")

const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
})

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId())

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow()

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

const userId = () =>
  uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" })

const money = (name: string) => numeric(name, { precision: 18, scale: 2 })

export const financialAccountTypeEnum = pgEnum("financial_account_type", [
  "CASH",
  "BANK",
  "EWALLET",
  "CREDIT_CARD",
  "INVESTMENT",
  "OTHER",
])

export const categoryKindEnum = pgEnum("category_kind", ["INCOME", "EXPENSE"])

export const transactionTypeEnum = pgEnum("transaction_type", [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
])

export const transactionStatusEnum = pgEnum("transaction_status", [
  "PENDING",
  "POSTED",
  "VOID",
])

export const recurringPaymentStatusEnum = pgEnum(
  "recurring_payment_status",
  ["ACTIVE", "PAUSED", "CANCELED", "ENDED"],
)

export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
])

export const verification = pgTable(
  "verification",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("verification_identifier_value_unique").on(
      table.identifier,
      table.value,
    ),
  ],
)

export const userFinanceSettings = pgTable(
  "user_finance_settings",
  {
    id: id(),
    userId: userId().unique(),
    baseCurrency: text("base_currency").notNull(),
    weekStartsOn: integer("week_starts_on").notNull().default(1),
    monthStartDay: integer("month_start_day").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
)

export const financialAccount = pgTable(
  "financial_account",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    type: financialAccountTypeEnum("type").notNull(),
    currency: text("currency").notNull(),
    initialBalance: money("initial_balance").notNull().default("0"),
    isArchived: boolean("is_archived").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("financial_account_user_id_name_unique").on(
      table.userId,
      table.name,
    ),
    index("financial_account_user_id_display_order_idx").on(
      table.userId,
      table.displayOrder,
    ),
  ],
)

export const category = pgTable(
  "category",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    kind: categoryKindEnum("kind").notNull(),
    color: text("color"),
    icon: text("icon"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("category_user_id_kind_name_unique").on(
      table.userId,
      table.kind,
      table.name,
    ),
  ],
)

export const recurringPayment = pgTable(
  "recurring_payment",
  {
    id: id(),
    userId: userId(),
    accountId: text("account_id").notNull(),
    categoryId: text("category_id"),
    merchant: text("merchant"),
    name: text("name").notNull(),
    type: transactionTypeEnum("type").notNull(),
    amount: money("amount").notNull(),
    currency: text("currency").notNull(),
    frequency: recurringFrequencyEnum("frequency").notNull(),
    intervalCount: integer("interval_count").notNull().default(1),
    lastRecordedAt: timestamp("last_recorded_at", { withTimezone: true }),
    startDate: timestamp("start_date", { withTimezone: true }),
    nextDueDate: timestamp("next_due_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    status: recurringPaymentStatusEnum("status").notNull().default("ACTIVE"),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [financialAccount.id],
      name: "recurring_payment_account_id_financial_account_id_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [category.id],
      name: "recurring_payment_category_id_category_id_fk",
    }).onDelete("set null"),
    index("recurring_payment_user_id_next_due_date_idx").on(
      table.userId,
      table.nextDueDate,
    ),
    index("recurring_payment_user_id_status_idx").on(table.userId, table.status),
    index("recurring_payment_account_id_status_idx").on(
      table.accountId,
      table.status,
    ),
  ],
)

export const transaction = pgTable(
  "transaction",
  {
    id: id(),
    userId: userId(),
    accountId: text("account_id").notNull(),
    transferAccountId: text("transfer_account_id"),
    type: transactionTypeEnum("type").notNull(),
    status: transactionStatusEnum("status").notNull().default("POSTED"),
    amount: money("amount").notNull(),
    currency: text("currency").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    merchant: text("merchant"),
    note: text("note"),
    reference: text("reference"),
    categoryId: text("category_id"),
    recurringPaymentId: text("recurring_payment_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [financialAccount.id],
      name: "transaction_account_id_financial_account_id_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.transferAccountId],
      foreignColumns: [financialAccount.id],
      name: "transaction_transfer_account_id_financial_account_id_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [category.id],
      name: "transaction_category_id_category_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.recurringPaymentId],
      foreignColumns: [recurringPayment.id],
      name: "transaction_recurring_payment_id_recurring_payment_id_fk",
    }).onDelete("set null"),
    index("transaction_user_id_occurred_at_idx").on(
      table.userId,
      table.occurredAt,
    ),
    index("transaction_account_id_occurred_at_idx").on(
      table.accountId,
      table.occurredAt,
    ),
    index("transaction_category_id_occurred_at_idx").on(
      table.categoryId,
      table.occurredAt,
    ),
    index("transaction_recurring_payment_id_occurred_at_idx").on(
      table.recurringPaymentId,
      table.occurredAt,
    ),
  ],
)

export const userFinanceSettingsRelations = relations(
  userFinanceSettings,
  ({ one }) => ({
    user: one(authUsers, {
      fields: [userFinanceSettings.userId],
      references: [authUsers.id],
    }),
  }),
)

export const financialAccountRelations = relations(
  financialAccount,
  ({ many, one }) => ({
    user: one(authUsers, {
      fields: [financialAccount.userId],
      references: [authUsers.id],
    }),
    transactions: many(transaction, {
      relationName: "transaction_account",
    }),
    incomingTransfers: many(transaction, {
      relationName: "transaction_transfer_account",
    }),
    recurringPayments: many(recurringPayment),
  }),
)

export const categoryRelations = relations(category, ({ many, one }) => ({
  user: one(authUsers, {
    fields: [category.userId],
    references: [authUsers.id],
  }),
  transactions: many(transaction),
  recurringPayments: many(recurringPayment),
}))

export const transactionRelations = relations(transaction, ({ one }) => ({
  user: one(authUsers, {
    fields: [transaction.userId],
    references: [authUsers.id],
  }),
  account: one(financialAccount, {
    fields: [transaction.accountId],
    references: [financialAccount.id],
    relationName: "transaction_account",
  }),
  transferAccount: one(financialAccount, {
    fields: [transaction.transferAccountId],
    references: [financialAccount.id],
    relationName: "transaction_transfer_account",
  }),
  category: one(category, {
    fields: [transaction.categoryId],
    references: [category.id],
  }),
  recurringPayment: one(recurringPayment, {
    fields: [transaction.recurringPaymentId],
    references: [recurringPayment.id],
  }),
}))

export const recurringPaymentRelations = relations(
  recurringPayment,
  ({ many, one }) => ({
    user: one(authUsers, {
      fields: [recurringPayment.userId],
      references: [authUsers.id],
    }),
    account: one(financialAccount, {
      fields: [recurringPayment.accountId],
      references: [financialAccount.id],
    }),
    category: one(category, {
      fields: [recurringPayment.categoryId],
      references: [category.id],
    }),
    transactions: many(transaction),
  }),
)
