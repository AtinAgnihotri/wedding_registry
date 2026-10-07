import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './db/auth-schema'

let pool: Pool | undefined

/** Neon (or any Postgres) via `DATABASE_URL`. Neon URLs already carry `sslmode=require`. */
export function getDb() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.')
  }
  pool ??= new Pool({ connectionString, max: 5 })
  return drizzle(pool, { schema })
}

export function isAuthConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET)
}
