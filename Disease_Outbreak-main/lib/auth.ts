import type { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import bcrypt from 'bcryptjs'

import { prisma } from '@/lib/prisma'

function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return ''
  return trimmed.replace(/\/+$/, '')
}

// NextAuth requires NEXTAUTH_URL in production. On Vercel, this is commonly forgotten.
// Infer a safe default from APP_BASE_URL (preferred) or VERCEL_URL.
const inferredNextAuthUrl =
  normalizeBaseUrl(process.env.NEXTAUTH_URL) ||
  normalizeBaseUrl(process.env.APP_BASE_URL) ||
  (process.env.VERCEL_URL ? `https://${normalizeBaseUrl(process.env.VERCEL_URL)}` : '')

if (!process.env.NEXTAUTH_URL && inferredNextAuthUrl) {
  process.env.NEXTAUTH_URL = inferredNextAuthUrl
}

const isProd = process.env.NODE_ENV === 'production'
if (isProd) {
  const missing: string[] = []
  if (!process.env.NEXTAUTH_SECRET) missing.push('NEXTAUTH_SECRET')
  if (!process.env.NEXTAUTH_URL) missing.push('NEXTAUTH_URL')
  if (missing.length) {
    // NextAuth will surface a generic "Server configuration" error to the client.
    // This log makes the root cause visible in Vercel logs.
    console.error(`[auth] Missing required env var(s): ${missing.join(', ')}`)
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NEXTAUTH_DEBUG === 'true',
  // Required on platforms like Vercel (trust x-forwarded-* headers)
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
            authorization: { params: { scope: 'read:user user:email' } },
          }),
        ]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email ?? '').toString().trim().toLowerCase()
        const password = (credentials?.password ?? '').toString()

        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.passwordHash) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        }
      },
    }),
  ],
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.sub === 'string' ? token.sub : session.user.id
      }
      return session
    },
  },
}
