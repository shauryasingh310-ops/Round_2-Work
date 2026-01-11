import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'node:path'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import dotenv from 'dotenv'

declare global {
  interface GlobalThis {
    __prisma?: PrismaClient
    __prismaDbUrl?: string
  }
}

function resolveDatabaseUrl(): string {
  let url = sanitizeDatabaseUrl(process.env.DATABASE_URL)

  // In Windows dev setups it's easy to accidentally set DATABASE_URL='undefined' in the OS env,
  // which overrides Next.js-loaded .env files and breaks OAuth callbacks.
  if (!isValidDatabaseUrl(url)) {
    loadDatabaseUrlFromDotenv()
    url = sanitizeDatabaseUrl(process.env.DATABASE_URL)
  }

  if (!isValidDatabaseUrl(url)) {
    // Development fallback to unblock local auth flows.
    // This is intentionally dev-only; production must be configured explicitly.
    if (process.env.NODE_ENV !== 'production') {
      return 'file:./dev.db'
    }

    throw new Error(
      'Invalid DATABASE_URL. Set DATABASE_URL to a valid libSQL/SQLite URL (for example: file:./dev.db). ' +
        'If you set DATABASE_URL in your OS environment variables, remove/override it and restart the dev server.',
    )
  }

  return url
}

function createPrismaClient(databaseUrl: string): PrismaClient {
  const { url: libsqlUrl, authToken } = normalizeLibsqlConfig(databaseUrl)

  // Prisma v7's libSQL adapter is a factory that creates and manages the libSQL client internally.
  // Passing a libSQL client instance here will lead to `config.url` being undefined.
  const adapter = new PrismaLibSql({ url: libsqlUrl, authToken })
  return new PrismaClient({ adapter })
}

function isValidDatabaseUrl(url: string | undefined | null): url is string {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed) return false
  if (trimmed === 'undefined' || trimmed === 'null') return false
  return true
}

function sanitizeDatabaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  // Remove wrapping quotes if a user copied `.env` style values into OS env vars.
  const unquoted = trimmed.replace(/^(["'])(.*)\1$/, '$2').trim()
  return unquoted
}

function loadDatabaseUrlFromDotenv() {
  // Only override when current env value is invalid.
  // We load .env then .env.local so .env.local wins.
  const appRoot = findProjectRoot()
  const envPath = path.join(appRoot, '.env')
  const envLocalPath = path.join(appRoot, '.env.local')

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true })
  }
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true })
  }
}

function normalizeLibsqlConfig(databaseUrl: string): { url: string; authToken?: string } {
  // If auth token is provided separately, prefer that.
  let authToken = process.env.TURSO_AUTH_TOKEN

  // Extract authToken from URL query string if present.
  // This keeps compatibility with DATABASE_URL values like:
  // libsql://<db>.turso.io?authToken=...
  if (databaseUrl.startsWith('libsql:') || databaseUrl.startsWith('https:') || databaseUrl.startsWith('http:')) {
    try {
      const parsed = new URL(databaseUrl)
      const tokenFromUrl = parsed.searchParams.get('authToken')
      if (!authToken && tokenFromUrl) authToken = tokenFromUrl

      if (parsed.searchParams.has('authToken')) {
        parsed.searchParams.delete('authToken')
        databaseUrl = parsed.toString()
      }
    } catch {
      // ignore
    }
  }

  if (!databaseUrl.startsWith('file:')) {
    return { url: databaseUrl, authToken: authToken || undefined }
  }

  // If it's already a file URL (file:///...), keep it as-is.
  if (databaseUrl.startsWith('file://')) return { url: databaseUrl }

  // Handle relative SQLite URLs like `file:./dev.db` by anchoring to the app root.
  const appRoot = findProjectRoot()
  const rawPath = databaseUrl.slice('file:'.length)
  const normalizedRawPath = rawPath.replace(/^\/+/, '')
  const absolutePath = path.resolve(appRoot, normalizedRawPath)

  return { url: pathToFileURL(absolutePath).href }
}

function findProjectRoot(): string {
  // Turbopack bundles files into `.next/...`, so `import.meta.url` often points there.
  // Use process.cwd() (where `next dev`/`next build` is invoked).
  // This repo has an outer folder and an inner Next.js app folder, so also scan one level down.
  const start = process.cwd()

  const isAppRoot = (candidate: string) => {
    const hasPackageJson = fs.existsSync(path.join(candidate, 'package.json'))
    const hasAppDir = fs.existsSync(path.join(candidate, 'app'))
    const hasPrismaDir = fs.existsSync(path.join(candidate, 'prisma'))
    return hasPackageJson && (hasAppDir || hasPrismaDir)
  }

  const scanChildren = (candidate: string) => {
    try {
      const entries = fs.readdirSync(candidate, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue
        const child = path.join(candidate, entry.name)
        if (isAppRoot(child)) return child
      }
    } catch {
      // ignore
    }
    return null
  }

  let dir = start
  for (let i = 0; i < 8; i++) {
    if (isAppRoot(dir)) return dir
    const child = scanChildren(dir)
    if (child) return child

    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return start
}

const effectiveDbUrl = resolveDatabaseUrl()

// If DATABASE_URL was previously invalid (e.g. literal 'undefined'), Prisma may have been
// initialized with a broken adapter and cached on globalThis. Recreate it when the effective URL changes.
const cachedPrisma = globalThis.__prisma
const cachedUrl = globalThis.__prismaDbUrl

export const prisma: PrismaClient =
  cachedPrisma && cachedUrl === effectiveDbUrl ? cachedPrisma : createPrismaClient(effectiveDbUrl)

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
  globalThis.__prismaDbUrl = effectiveDbUrl
}
