import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildTelegramStartLink, telegramBotUsername } from '@/lib/telegram'

export const runtime = 'nodejs'

function generateCode(): string {
  // Short, URL-safe code
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramUsername: true,
      telegramOptIn: true,
      alertSettings: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const botUsername = telegramBotUsername()
  const hasBot = Boolean(botUsername)

  return NextResponse.json({
    telegram: {
      hasBot,
      botUsername: botUsername || null,
      chatIdLinked: Boolean(user.telegramChatId),
      telegramUsername: user.telegramUsername,
      telegramOptIn: user.telegramOptIn,
    },
    settings: user.alertSettings,
  })
}

type CreateLinkCodeBody = {
  selectedState?: string
  browserEnabled?: boolean
  dailyDigestEnabled?: boolean
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as CreateLinkCodeBody

  // Save alert settings updates (optional, same endpoint for convenience)
  const selectedState = (body.selectedState ?? '').toString().trim()

  if (selectedState && selectedState.length > 80) {
    return NextResponse.json({ error: 'Invalid state.' }, { status: 400 })
  }

  const existing = await prisma.userAlertSettings.findUnique({ where: { userId } })
  await prisma.userAlertSettings.upsert({
    where: { userId },
    create: {
      userId,
      selectedState: selectedState || existing?.selectedState || '',
      browserEnabled: typeof body.browserEnabled === 'boolean' ? body.browserEnabled : true,
      dailyDigestEnabled: typeof body.dailyDigestEnabled === 'boolean' ? body.dailyDigestEnabled : true,
    },
    update: {
      ...(selectedState ? { selectedState } : {}),
      ...(typeof body.browserEnabled === 'boolean' ? { browserEnabled: body.browserEnabled } : {}),
      ...(typeof body.dailyDigestEnabled === 'boolean' ? { dailyDigestEnabled: body.dailyDigestEnabled } : {}),
    },
  })

  // Create a one-time link code
  await prisma.telegramLinkCode.deleteMany({ where: { userId } })

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  await prisma.telegramLinkCode.create({
    data: { userId, code, expiresAt },
  })

  const startLink = buildTelegramStartLink(code)

  return NextResponse.json({
    ok: true,
    code,
    expiresAt,
    startLink,
    botUsername: telegramBotUsername() || null,
  })
}
