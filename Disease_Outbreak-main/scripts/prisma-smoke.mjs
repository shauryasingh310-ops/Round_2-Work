import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

function normalizeLibsqlUrl(url) {
  if (!url.startsWith('file:')) return url
  if (url.startsWith('file://')) return url

  const rawPath = url.slice('file:'.length)
  const normalizedRawPath = rawPath.replace(/^\/+/g, '')
  const absolutePath = path.resolve(process.cwd(), normalizedRawPath)
  return pathToFileURL(absolutePath).href
}

const databaseUrl = (process.env.DATABASE_URL || 'file:./dev.db').trim()
const libsqlUrl = normalizeLibsqlUrl(databaseUrl)

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: libsqlUrl }),
})

try {
  const user = await prisma.user.findFirst({
    select: { id: true, email: true, name: true },
  })
  console.log(JSON.stringify({ ok: true, libsqlUrl, user }, null, 2))
} catch (err) {
  console.error('Prisma smoke test failed')
  console.error(err)
  process.exitCode = 1
} finally {
  await prisma.$disconnect().catch(() => {})
}
