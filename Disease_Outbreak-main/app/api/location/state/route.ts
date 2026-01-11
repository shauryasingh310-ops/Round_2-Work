import { NextResponse } from 'next/server'

import { STATE_COORDINATES } from '@/lib/state-coordinates'

export const runtime = 'nodejs'

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = degToRad(b.lat - a.lat)
  const dLng = degToRad(b.lng - a.lng)
  const lat1 = degToRad(a.lat)
  const lat2 = degToRad(b.lat)

  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)

  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function findNearestState(lat: number, lng: number): string | null {
  let bestState: string | null = null
  let bestDist = Number.POSITIVE_INFINITY

  for (const [state, coords] of Object.entries(STATE_COORDINATES)) {
    const d = haversineKm({ lat, lng }, { lat: coords.lat, lng: coords.lng })
    if (d < bestDist) {
      bestDist = d
      bestState = state
    }
  }

  return bestState
}

type Body = { lat?: number; lng?: number }

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body

  const lat = typeof body.lat === 'number' ? body.lat : Number.NaN
  const lng = typeof body.lng === 'number' ? body.lng : Number.NaN

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: 'Missing lat/lng.' }, { status: 400 })
  }

  const state = findNearestState(lat, lng)
  if (!state) {
    return NextResponse.json({ ok: false, error: 'Unable to detect state.' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, state })
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST { lat, lng } to detect nearest state.' })
}
