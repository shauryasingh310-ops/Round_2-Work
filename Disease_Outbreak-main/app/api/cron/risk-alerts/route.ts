import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { splitBullets } from '@/lib/otp'
import { telegramSendMessage } from '@/lib/telegram'

export const runtime = 'nodejs'

type DiseaseDataApiResponse = {
  updatedAt: string
  states: Array<{
    state: string
    riskScore: number
    riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical'
    overallRisk?: 'Low' | 'Medium' | 'High' | 'Critical'
    primaryThreat?: string
  }>
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function meetsThreshold(level: string | null | undefined, threshold: 'HIGH' | 'CRITICAL'): boolean {
  if (threshold === 'CRITICAL') return level === 'Critical'
  return level === 'High' || level === 'Critical'
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

async function fetchAiActions(baseUrl: string, state: string, primaryThreat: string, risk: number): Promise<string[]> {
  try {
    const resp = await fetch(`${baseUrl}/api/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        region: state,
        disease: primaryThreat,
        risk,
        trend: 'stable',
      }),
    })

    if (!resp.ok) return []
    const payload = (await resp.json().catch(() => null)) as any
    const analysis = typeof payload?.analysis === 'string' ? payload.analysis : ''
    return splitBullets(analysis, 3)
  } catch {
    return []
  }
}

function requireCronAuth(req: Request): boolean {
  // Vercel Cron requests include this header.
  if (req.headers.get('x-vercel-cron') === '1') return true

  const expected = process.env.CRON_SECRET
  if (!expected) {
    // Dev friendliness: allow when secret not set.
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

  // Deprecated: threshold/cooldown based alerts were replaced with on-demand
  // "send update when opening the bot".
  if (process.env.ENABLE_THRESHOLD_ALERTS !== 'true') {
    return NextResponse.json({ ok: true, disabled: true, sent: 0, skipped: 0 })
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
    where: { telegramEnabled: true },
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
  for (const s of disease.states ?? []) {
    byState.set(s.state, s)
  }

  let sent = 0
  let skipped = 0
  const now = Date.now()

  for (const row of settings) {
    const chatId = row.user.telegramChatId
    if (!chatId || !row.user.telegramOptIn) {
      skipped++
      continue
    }

    const state = row.selectedState
    const snapshot = byState.get(state)
    if (!snapshot) {
      skipped++
      continue
    }

    const level = snapshot.overallRisk ?? snapshot.riskLevel ?? 'Low'
    const risk = clamp01(snapshot.riskScore)
    const threshold = row.threshold

    if (!meetsThreshold(level, threshold)) {
      skipped++
      continue
    }

    const last = row.lastAlertSentAt?.getTime() ?? 0
    const cooldownMs = (row.cooldownMinutes ?? 60) * 60 * 1000
    if (last && now - last < cooldownMs) {
      skipped++
      continue
    }

    const riskPct = String(Math.round(risk * 100))
    const primaryThreat = (snapshot.primaryThreat ?? 'Unknown').toString()

    const actions = await fetchAiActions(baseUrl, state, primaryThreat, risk)
    const safeActions = actions.length
      ? actions
      : [
          'Avoid unsafe water and use boiled/filtered water.',
          'Increase hand hygiene and sanitation precautions.',
          'Seek medical advice early if symptoms appear.',
        ]

    const link = `${baseUrl}/dashboard?state=${encodeURIComponent(state)}`

    const text =
      `EpiGuard Alert\n` +
      `Risk: ${level}\n` +
      `State: ${state}\n` +
      `Risk score: ${riskPct}%\n` +
      `Primary threat: ${primaryThreat}\n\n` +
      `Recommended actions:\n` +
      `- ${safeActions[0] ?? ''}\n` +
      `- ${safeActions[1] ?? ''}\n` +
      `- ${safeActions[2] ?? ''}\n\n` +
      `Details: ${link}`

    await telegramSendMessage({
      chatId,
      text,
      disableWebPagePreview: true,
    })

    await prisma.userAlertSettings.update({
      where: { id: row.id },
      data: { lastAlertSentAt: new Date() },
    })

    sent++
  }

  return NextResponse.json({ ok: true, sent, skipped, updatedAt: disease.updatedAt })
}
