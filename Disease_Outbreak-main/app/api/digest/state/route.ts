import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

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

function normalizePlaceName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

async function fetchDiseaseData(): Promise<DiseaseDataApiResponse | null> {
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const state = (searchParams.get('state') ?? '').trim()
  if (!state) {
    return NextResponse.json({ ok: false, error: 'Missing state.' }, { status: 400 })
  }

  const disease = await fetchDiseaseData()
  if (!disease) {
    return NextResponse.json({ ok: false, error: 'Failed to load risk data.' }, { status: 502 })
  }

  const target = normalizePlaceName(state)
  const match = (disease.states ?? []).find((s) => normalizePlaceName(s.state) === target)
  if (!match) {
    return NextResponse.json({ ok: false, error: 'State not found in risk data.' }, { status: 404 })
  }

  const risk = clamp01(match.riskScore)
  const level = match.overallRisk ?? match.riskLevel ?? 'Low'
  const primaryThreat = (match.primaryThreat ?? 'Unknown').toString()

  return NextResponse.json(
    {
      ok: true,
      updatedAt: disease.updatedAt,
      state: match.state,
      riskScore: risk,
      overallRisk: level,
      primaryThreat,
      environmentalFactors: match.environmentalFactors ?? null,
      preventions: buildPreventions({ risk, level, primaryThreat }),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
