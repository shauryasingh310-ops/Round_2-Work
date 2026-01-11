import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (userId) {
    const url = new URL('/api/telegram/open', req.url)
    return NextResponse.redirect(url, { status: 307 })
  }

  const username = (process.env.TELEGRAM_BOT_USERNAME || '').trim()
  if (!username) {
    return NextResponse.json(
      { ok: false, error: 'Telegram bot is not configured.' },
      { status: 500 },
    )
  }

  const url = `https://t.me/${username}`
  return NextResponse.redirect(url, { status: 307 })
}
