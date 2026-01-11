import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Vercel runs install scripts (postinstall) during `pnpm install`.
    // If DATABASE_URL isn't set yet for the deployment environment, Prisma would fail early.
    // Use a safe fallback so `prisma generate` can still run; production runtime still requires DATABASE_URL.
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
  migrations: {
    path: 'prisma/migrations',
  },
})
