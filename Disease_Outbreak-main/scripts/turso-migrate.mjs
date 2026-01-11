import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { createClient } from '@libsql/client'

function getEnv(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function parseDbConfig() {
  // Prefer split vars so tokens don't have to be embedded in a URL.
  const tursoUrl = getEnv('TURSO_DATABASE_URL')
  const databaseUrl = getEnv('DATABASE_URL')
  const rawUrl = tursoUrl ?? databaseUrl

  if (!rawUrl) {
    throw new Error(
      'Missing TURSO_DATABASE_URL or DATABASE_URL. Example: libsql://<db>-<org>.turso.io',
    )
  }

  // libsql URLs may contain ?authToken=..., but we prefer TURSO_AUTH_TOKEN.
  let authToken = getEnv('TURSO_AUTH_TOKEN')
  let url = rawUrl

  try {
    const parsed = new URL(rawUrl)
    const tokenFromUrl = parsed.searchParams.get('authToken')
    if (!authToken && tokenFromUrl) authToken = tokenFromUrl

    // Strip authToken from URL string so we don't accidentally log it.
    if (parsed.searchParams.has('authToken')) {
      parsed.searchParams.delete('authToken')
      url = parsed.toString()
    }
  } catch {
    // If URL parsing fails, keep raw string.
  }

  return { url, authToken }
}

function listMigrationFolders(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) return []

  const entries = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    // Prisma migration folders are timestamped; lexical sort works.
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  return entries
}

async function ensureMigrationsTable(client) {
  await client.execute(
    'CREATE TABLE IF NOT EXISTS "__app_migrations" (name TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)',
  )
}

async function hasMigration(client, name) {
  const res = await client.execute({
    sql: 'SELECT 1 AS ok FROM "__app_migrations" WHERE name = ? LIMIT 1',
    args: [name],
  })
  return (res.rows?.length ?? 0) > 0
}

async function markMigration(client, name) {
  await client.execute({
    sql: 'INSERT INTO "__app_migrations" (name, appliedAt) VALUES (?, ?)',
    args: [name, new Date().toISOString()],
  })
}

async function applyMigrationSql(client, sqlText) {
  // Some migrations include PRAGMA changes; running as a script is safest.
  if (typeof client.executeMultiple === 'function') {
    await client.executeMultiple(sqlText)
    return
  }

  // Fallback: try executing single statement (will fail for multi-statement SQL).
  await client.execute(sqlText)
}

export async function runTursoMigrations() {
  const { url, authToken } = parseDbConfig()

  if (!authToken) {
    throw new Error(
      'Missing TURSO_AUTH_TOKEN (or authToken query param). Create a Turso token and set TURSO_AUTH_TOKEN in your terminal.',
    )
  }

  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations')
  const folders = listMigrationFolders(migrationsDir)

  if (!folders.length) {
    console.log('No migration folders found at:', migrationsDir)
    process.exit(0)
  }

  console.log(`Connecting to Turso DB (libsql) ...`)
  console.log(`- URL: ${url.replace(/\?.*$/, '')}`)
  console.log(`- Migrations: ${folders.length}`)

  const client = createClient({ url, authToken })

  try {
    await ensureMigrationsTable(client)

    let applied = 0
    let skipped = 0

    for (const folder of folders) {
      const migrationPath = path.join(migrationsDir, folder, 'migration.sql')
      if (!fs.existsSync(migrationPath)) continue

      // Use folder name as migration ID.
      const name = folder
      const already = await hasMigration(client, name)
      if (already) {
        skipped++
        continue
      }

      const sqlText = fs.readFileSync(migrationPath, 'utf8')
      if (!sqlText.trim()) {
        await markMigration(client, name)
        applied++
        continue
      }

      try {
        await applyMigrationSql(client, sqlText)
        await markMigration(client, name)
        applied++
        console.log(`Applied: ${name}`)
      } catch (e) {
        throw new Error(`Failed applying migration ${name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    console.log(`Done. applied=${applied}, skipped=${skipped}`)
  } finally {
    try {
      client.close()
    } catch {
      // ignore
    }
  }
}

function isMainModule() {
  try {
    return pathToFileURL(process.argv[1]).href === import.meta.url
  } catch {
    return false
  }
}

if (isMainModule()) {
  runTursoMigrations().catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
