import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/db/schema"
import { getServerEnv } from "@/lib/env"

type PostgresClient = ReturnType<typeof postgres>

declare global {
  var tsukirokuPostgresClient: PostgresClient | undefined
}

const client =
  globalThis.tsukirokuPostgresClient ??
  postgres(getServerEnv().DATABASE_URL, {
    max: 1,
    prepare: false,
  })

globalThis.tsukirokuPostgresClient = client

export const db = drizzle(client, { schema })
