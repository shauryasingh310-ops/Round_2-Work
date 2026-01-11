import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
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
    drivers?: string[]
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

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

function getBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return ''
}

async function fetchDiseaseData(baseUrl: string): Promise<DiseaseDataApiResponse | null> {
  try {
    const resp = await fetch(`${baseUrl}/api/disease-data`, { cache: 'no-store' })
    if (!resp.ok) return null
    return (await resp.json()) as DiseaseDataApiResponse
  } catch {
    return null
  }
}

function requireCronAuth(req: Request): boolean {
  // Vercel Cron requests include this header.
  if (req.headers.get('x-vercel-cron') === '1') return true

  const expected = process.env.CRON_SECRET
  if (!expected) {
    return process.env.NODE_ENV !== 'production'
  }

  const header = req.headers.get('x-cron-secret')
  if (header && header === expected) return true

  const auth = req.headers.get('authorization')
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length)
    if (token === expected) return true
  }

  return false
}

export async function GET(req: Request) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Missing APP_BASE_URL (or VERCEL_URL) for cron execution.' },
      { status: 500 },
    )
  }

  const disease = await fetchDiseaseData(baseUrl)
  if (!disease) {
    return NextResponse.json(
      { error: 'Failed to fetch /api/disease-data. Check API keys / uptime.' },
      { status: 502 },
    )
  }

  const settings = await prisma.userAlertSettings.findMany({
    where: { dailyDigestEnabled: true },
    include: {
      user: {
        select: {
          telegramChatId: true,
          telegramOptIn: true,
        },
      },
    },
  })

  const byState = new Map<string, DiseaseDataApiResponse['states'][number]>()
  for (const s of disease.states ?? []) byState.set(s.state, s)

  const now = new Date()
  let sent = 0
  let skipped = 0

  for (const row of settings) {
    const chatId = row.user.telegramChatId
    if (!chatId || !row.user.telegramOptIn) {
      skipped++
      continue
    }

    const state = (row.selectedState || '').trim()
    if (!state) {
      skipped++
      continue
    }

    const last = row.lastDailyDigestSentAt
    if (last && isSameUtcDay(last, now)) {
      skipped++
      continue
    }

    const snapshot = byState.get(state)
    if (!snapshot) {
      skipped++
      continue
    }

    const level = snapshot.overallRisk ?? snapshot.riskLevel ?? 'Low'
    const risk = clamp01(snapshot.riskScore)
    const riskPct = String(Math.round(risk * 100))
    const primaryThreat = (snapshot.primaryThreat ?? 'Unknown').toString()

    const preventions = buildPreventions({ risk, level, primaryThreat })

    const env = snapshot.environmentalFactors
    const envLine = env
      ? `Env: ${Math.round(env.temp)}°C, ${Math.round(env.humidity)}% humidity, PM2.5 ${Math.round(env.pm25)}, Water ${escapeHtml(env.waterQuality)}`
      : null

    const link = `${baseUrl}/dashboard?state=${encodeURIComponent(state)}`

    const text =
      `EpiGuard Daily Update\n` +
      `State: ${escapeHtml(state)}\n` +
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

    await telegramSendMessage({ chatId, text, parseMode: 'HTML', disableWebPagePreview: true })

    await prisma.userAlertSettings.update({
      where: { id: row.id },
      data: { lastDailyDigestSentAt: now },
    })

    sent++
  }

  return NextResponse.json({ ok: true, sent, skipped, updatedAt: disease.updatedAt })
}
