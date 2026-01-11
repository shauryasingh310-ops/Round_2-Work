import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildTelegramStartLink } from '@/lib/telegram'
import { telegramSendMessage } from '@/lib/telegram'
import { buildPreventions } from '@/lib/preventions'

export const runtime = 'nodejs'

type DiseaseDataApiResponse = {
  updatedAt: string
  states: Array<{
    state: string
    riskScore: number
    riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical'
    overallRisk?: 'Low' | 'Medium' | 'High' | 'Critical'
    primaryThreat?: string
    environmentalFactors?: {
      temp: number
      humidity: number
      rain: boolean
      pm25: number
      aqiUS?: number | null
      waterQuality: 'Good' | 'Fair' | 'Poor' | 'Unknown'
    }
  }>
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizePlaceName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

async function fetchDiseaseDataFromThisHost(): Promise<DiseaseDataApiResponse | null> {
  try {
    const h = await headers()
    const host = h.get('host')
    if (!host) return null
    const proto = h.get('x-forwarded-proto') ?? 'http'
    const url = `${proto}://${host}/api/disease-data`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as DiseaseDataApiResponse
  } catch {
    return null
  }
}

function redirectToBot(req: Request): NextResponse {
  const url = new URL('/api/telegram/bot', req.url)
  return NextResponse.redirect(url)
}

function generateCode(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

function redirectToStartLink(req: Request, startLink: string): NextResponse {
  if (!startLink) return redirectToBot(req)
  return NextResponse.redirect(startLink, { status: 307 })
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    // Let middleware redirect the user to sign-in (auth is required to send the update).
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramOptIn: true,
      alertSettings: {
        select: { selectedState: true },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const state = (user.alertSettings?.selectedState ?? '').trim()

  // If the user hasn't linked Telegram yet, open the bot using a per-user /start link
  // so the webhook can associate this Telegram chat with the signed-in user.
  if (!user.telegramChatId || !user.telegramOptIn) {
    if (!state) return redirectToBot(req)

    await prisma.telegramLinkCode.deleteMany({ where: { userId } })

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    await prisma.telegramLinkCode.create({ data: { userId, code, expiresAt } })

    const startLink = buildTelegramStartLink(code)
    return redirectToStartLink(req, startLink)
  }

  if (!state) {
    await telegramSendMessage({
      chatId: user.telegramChatId,
      parseMode: 'HTML',
      text:
        `EpiGuard Update\n` +
        `\n` +
        `Please select your state in the app first, then open the bot again to get your latest risk + prevention update.`,
      disableWebPagePreview: true,
    })

    return redirectToBot(req)
  }

  const disease = await fetchDiseaseDataFromThisHost()
  if (!disease) {
    await telegramSendMessage({
      chatId: user.telegramChatId,
      parseMode: 'HTML',
      text:
        `EpiGuard Update\n` +
        `\n` +
        `I couldn't load the latest risk data right now. Please try again in a minute.`,
      disableWebPagePreview: true,
    })

    return redirectToBot(req)
  }

  const target = normalizePlaceName(state)
  const match = (disease.states ?? []).find((s) => normalizePlaceName(s.state) === target)

  if (!match) {
    await telegramSendMessage({
      chatId: user.telegramChatId,
      parseMode: 'HTML',
      text:
        `EpiGuard Update\n` +
        `\n` +
        `I couldn't find risk data for <b>${escapeHtml(state)}</b>. Please re-select your state in the app.`,
      disableWebPagePreview: true,
    })

    return redirectToBot(req)
  }

  const risk = clamp01(match.riskScore)
  const level = match.overallRisk ?? match.riskLevel ?? 'Low'
  const riskPct = String(Math.round(risk * 100))
  const primaryThreat = (match.primaryThreat ?? 'Unknown').toString()

  const preventions = buildPreventions({ risk, level, primaryThreat })

  const env = match.environmentalFactors
  const envLine = env
    ? `Env: ${Math.round(env.temp)}°C, ${Math.round(env.humidity)}% humidity, PM2.5 ${Math.round(env.pm25)}, Water ${escapeHtml(env.waterQuality)}`
    : null

  const link = `${new URL(req.url).origin}/dashboard?state=${encodeURIComponent(match.state)}`

  const text =
    `EpiGuard Update\n` +
    `State: ${escapeHtml(match.state)}\n` +
    `<b>Risk: ${escapeHtml(String(level))} (${escapeHtml(riskPct)}%)</b>\n` +
    `Primary threat: ${escapeHtml(primaryThreat)}\n` +
    (envLine ? `${envLine}\n\n` : `\n`) +
    `Preventions:\n` +
    `- ${escapeHtml(preventions[0] ?? '')}\n` +
    `- ${escapeHtml(preventions[1] ?? '')}\n` +
    `- ${escapeHtml(preventions[2] ?? '')}\n` +
    `- ${escapeHtml(preventions[3] ?? '')}\n` +
    `- ${escapeHtml(preventions[4] ?? '')}\n\n` +
    `Details: ${escapeHtml(link)}`

  await telegramSendMessage({ chatId: user.telegramChatId, text, parseMode: 'HTML', disableWebPagePreview: true })

  return redirectToBot(req)
}
