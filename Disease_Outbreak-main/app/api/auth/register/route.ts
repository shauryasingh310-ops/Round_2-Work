import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type RegisterBody = {
  name?: string
  email?: string
  password?: string
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RegisterBody

  const name = (body.name ?? '').toString().trim()
  const email = (body.email ?? '').toString().trim().toLowerCase()
  const password = (body.password ?? '').toString()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 },
    )
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with that email already exists.' },
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ ok: true, user })
  } catch (err) {
    const errorId = `reg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

    // Log full error server-side so you can inspect Vercel Function logs.
    console.error(`[register] ${errorId}`, err)

    // Handle common Prisma errors cleanly.
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return NextResponse.json(
          { error: 'An account with that email already exists.', errorId },
          { status: 409 },
        )
      }
    }

    const message = err instanceof Error ? err.message : ''
    const isMissingTables = /no such table|SQLITE_ERROR/i.test(message)
    const isDbUrlMisconfigured = /Invalid DATABASE_URL|DATABASE_URL/i.test(message)

    // Avoid leaking internals to the browser in production, but still provide a useful hint.
    const hint = isMissingTables
      ? 'Database tables are missing. Run Prisma migrations against the production database.'
      : isDbUrlMisconfigured
        ? 'Database configuration is missing or invalid in production.'
        : undefined

    return NextResponse.json(
      {
        error: 'Registration failed.',
        errorId,
        ...(hint ? { hint } : {}),
        ...(process.env.NODE_ENV !== 'production' ? { details: message } : {}),
      },
      { status: 500 },
    )
  }
}
