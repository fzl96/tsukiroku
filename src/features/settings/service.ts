import { eq } from "drizzle-orm"
import { unstable_cache } from "next/cache"

import { db } from "@/db"
import { userFinanceSettings } from "@/db/schema"
import { updateUserFinanceSettingsSchema } from "@/features/settings/validations"
import { normalizeTimeZone } from "@/lib/timezone"

export async function getUserFinanceSettings(userId: string) {
  const [settings] = await db
    .select()
    .from(userFinanceSettings)
    .where(eq(userFinanceSettings.userId, userId))
    .limit(1)

  return settings ?? null
}

/**
 * Per-user cached variant of {@link getUserFinanceSettings}. For brand-new users
 * this may cache `null` until the settings tag is revalidated by
 * `createDefaultFinanceSettingsAction`; existing users (the hot path) hit cache.
 */
export function getCachedUserFinanceSettings(userId: string) {
  return unstable_cache(
    () => getUserFinanceSettings(userId),
    ["user-finance-settings", userId],
    { tags: [`settings:${userId}`], revalidate: 3600 }
  )()
}

export async function createDefaultFinanceSettings(
  userId: string,
  input?: { timezone?: string | null }
) {
  const existing = await getUserFinanceSettings(userId)

  if (existing) {
    return existing
  }

  const [created] = await db
    .insert(userFinanceSettings)
    .values({
      userId,
      baseCurrency: "IDR",
      timezone: normalizeTimeZone(input?.timezone),
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
