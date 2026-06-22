CREATE TYPE "public"."category_kind" AS ENUM('INCOME', 'EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."financial_account_type" AS ENUM('CASH', 'BANK', 'EWALLET', 'CREDIT_CARD', 'INVESTMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."recurring_frequency" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."recurring_payment_status" AS ENUM('ACTIVE', 'PAUSED', 'CANCELED', 'ENDED');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'POSTED', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('INCOME', 'EXPENSE', 'TRANSFER');--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "category_kind" NOT NULL,
	"color" text,
	"icon" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_user_id_kind_name_unique" UNIQUE("user_id","kind","name")
);
--> statement-breakpoint
CREATE TABLE "financial_account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "financial_account_type" NOT NULL,
	"currency" text NOT NULL,
	"initial_balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_account_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "recurring_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"category_id" text,
	"merchant" text,
	"name" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL,
	"frequency" "recurring_frequency" NOT NULL,
	"interval_count" integer DEFAULT 1 NOT NULL,
	"last_recorded_at" timestamp with time zone,
	"start_date" timestamp with time zone,
	"next_due_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"status" "recurring_payment_status" DEFAULT 'ACTIVE' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"transfer_account_id" text,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'POSTED' NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"merchant" text,
	"note" text,
	"reference" text,
	"category_id" text,
	"recurring_payment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_finance_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"base_currency" text NOT NULL,
	"week_starts_on" integer DEFAULT 1 NOT NULL,
	"month_start_day" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_finance_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_identifier_value_unique" UNIQUE("identifier","value")
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payment" ADD CONSTRAINT "recurring_payment_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payment" ADD CONSTRAINT "recurring_payment_account_id_financial_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payment" ADD CONSTRAINT "recurring_payment_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_account_id_financial_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_transfer_account_id_financial_account_id_fk" FOREIGN KEY ("transfer_account_id") REFERENCES "public"."financial_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_recurring_payment_id_recurring_payment_id_fk" FOREIGN KEY ("recurring_payment_id") REFERENCES "public"."recurring_payment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_finance_settings" ADD CONSTRAINT "user_finance_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_account_user_id_display_order_idx" ON "financial_account" USING btree ("user_id","display_order");--> statement-breakpoint
CREATE INDEX "recurring_payment_user_id_next_due_date_idx" ON "recurring_payment" USING btree ("user_id","next_due_date");--> statement-breakpoint
CREATE INDEX "recurring_payment_user_id_status_idx" ON "recurring_payment" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "recurring_payment_account_id_status_idx" ON "recurring_payment" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "transaction_user_id_occurred_at_idx" ON "transaction" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "transaction_account_id_occurred_at_idx" ON "transaction" USING btree ("account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "transaction_category_id_occurred_at_idx" ON "transaction" USING btree ("category_id","occurred_at");--> statement-breakpoint
CREATE INDEX "transaction_recurring_payment_id_occurred_at_idx" ON "transaction" USING btree ("recurring_payment_id","occurred_at");