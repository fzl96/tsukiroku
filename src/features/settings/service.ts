import { eq } from "drizzle-orm"

import { db } from "@/db"
import { userFinanceSettings } from "@/db/schema"
import { updateUserFinanceSettingsSchema } from "@/features/settings/validations"

export async function getUserFinanceSettings(userId: string) {
  const [settings] = await db
    .select()
    .from(userFinanceSettings)
    .where(eq(userFinanceSettings.userId, userId))
    .limit(1)

  return settings ?? null
}

export async function createDefaultFinanceSettings(userId: string) {
  const existing = await getUserFinanceSettings(userId)

  if (existing) {
    return existing
  }

  const [created] = await db
    .insert(userFinanceSettings)
    .values({
      userId,
      baseCurrency: "IDR",
      weekStartsOn: 1,
      monthStartDay: 1,
    })
    .returning()

  return created
}

export async function updateUserFinanceSettings(
  userId: string,
  input: unknown,
) {
  const data = updateUserFinanceSettingsSchema.parse(input)

  await createDefaultFinanceSettings(userId)

  const [updated] = await db
    .update(userFinanceSettings)
    .set(data)
    .where(eq(userFinanceSettings.userId, userId))
    .returning()

  return updated
}
