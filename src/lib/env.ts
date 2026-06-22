import { z } from "zod"

const publicEnvInput = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

const serverEnvSchema = publicEnvSchema.extend({
  DATABASE_URL: z.string().min(1),
})

export const publicEnv = publicEnvSchema.parse(publicEnvInput)

export function getServerEnv() {
  return serverEnvSchema.parse({
    ...publicEnvInput,
    DATABASE_URL: process.env.DATABASE_URL,
  })
}
