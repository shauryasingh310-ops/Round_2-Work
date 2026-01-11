import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const requestUrl = new URL(req.url)
  const forceDirect = requestUrl.searchParams.get('direct') === '1'

  const usernameRaw = (process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '')

  // If explicitly requested, ALWAYS go directly to the Telegram bot page (no send/update logic).
  if (forceDirect) {
    if (!usernameRaw) {
      return NextResponse.json(
        { ok: false, error: 'Telegram bot is not configured.' },
        { status: 500 },
      )
    }
    return NextResponse.redirect(`https://t.me/${usernameRaw}`, { status: 307 })
  }

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (userId) {
    const url = new URL('/api/telegram/open', req.url)
    return NextResponse.redirect(url, { status: 307 })
  }

  if (!usernameRaw) {
    return NextResponse.json(
      { ok: false, error: 'Telegram bot is not configured.' },
      { status: 500 },
    )
  }

  const url = `https://t.me/${usernameRaw}`
  return NextResponse.redirect(url, { status: 307 })
}
