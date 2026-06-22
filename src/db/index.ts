import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/db/schema"
import { getServerEnv } from "@/lib/env"

const client = postgres(getServerEnv().DATABASE_URL, {
  prepare: false,
})

export const db = drizzle(client, { schema })
