import { cache } from "react"

import { unauthorized } from "@/lib/errors"
import { createClient } from "@/lib/supabase/server"

export type CurrentUser = {
  id: string
  email: string | null
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return {
    id: user.id,
    email: user.email ?? null,
  }
})

export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    throw unauthorized()
  }

  return user
}
