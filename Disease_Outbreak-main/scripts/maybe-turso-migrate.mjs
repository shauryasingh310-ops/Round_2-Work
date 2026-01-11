import process from 'node:process'

import { runTursoMigrations } from './turso-migrate.mjs'

const vercelEnv = (process.env.VERCEL_ENV || '').toLowerCase()
const isVercelProduction = vercelEnv === 'production'

if (!isVercelProduction) {
  // Avoid running migrations for local dev and Vercel preview deployments.
  if (process.env.VERCEL_ENV) {
    console.log(`Skipping Turso migrations (VERCEL_ENV=${process.env.VERCEL_ENV}).`)
  }
  process.exit(0)
}

await runTursoMigrations()
