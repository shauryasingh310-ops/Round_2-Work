import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

// Healthcare uses a slightly different naming set than the rest of the app.
// This avoids duplicates when users import curated snapshots that use modern official names.
const HEALTHCARE_REGIONS = [
  'Andaman & Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

function canonicalizeRegionName(value: unknown): string {
  const s = String(value ?? '').trim()
  if (!s) return ''

  // Common alias normalizations
  const simplified = s
    .replace(/\s+/g, ' ')
    .replace(/\band\b/gi, '&')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim()

  const direct: Record<string, string> = {
    'Andaman & Nicobar': 'Andaman & Nicobar Islands',
    'Andaman and Nicobar Islands': 'Andaman & Nicobar Islands',
    'Andaman & Nicobar Islands': 'Andaman & Nicobar Islands',
    'Dadra and Nagar Haveli and Daman and Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'Dadra & Nagar Haveli and Daman & Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'Dadra & Nagar Haveli': 'Dadra & Nagar Haveli and Daman & Diu',
    'Daman & Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'Dadra and Nagar Haveli': 'Dadra & Nagar Haveli and Daman & Diu',
    'Daman and Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'Jammu and Kashmir': 'Jammu & Kashmir',
    'Jammu & Kashmir': 'Jammu & Kashmir',
    'Orissa': 'Odisha',
    'Pondicherry': 'Puducherry',
  }

  return direct[s] || direct[simplified] || simplified
}

type UpstreamHealthcareResponse = {
  updatedAt?: string
  sourceUrl?: string
  states?: Array<any>
}

type NormalizedHospital = {
  name: string
  bedsAvailable?: number
  totalBeds?: number
  lastUpdated?: string
  sourceUrl?: string
}

type NormalizedHealthcareState = {
  state: string
  bedsAvailable?: number
  totalBeds?: number
  ventilatorsAvailable?: number
  resourcesDispatched?: number
  casesHandled?: number
  avgResponseTimeHours?: number
  emergencyContacts: Array<{ label: string; phone: string }>
  hospitals?: NormalizedHospital[]
  lastUpdated?: string
  sourceUrl?: string
}

type NormalizedHealthcareResponse = {
  updatedAt: string
  states: NormalizedHealthcareState[]
  source: string
  sourceUrl?: string
}

function mergeWithAllStates(states: NormalizedHealthcareState[]): NormalizedHealthcareState[] {
  const byName = new Map<string, NormalizedHealthcareState>()
  for (const s of states) byName.set(s.state, s)

  const merged: NormalizedHealthcareState[] = HEALTHCARE_REGIONS.map((state) => {
    const existing = byName.get(state)
    if (existing) return existing
    return {
      state,
      bedsAvailable: 0,
      totalBeds: undefined,
      ventilatorsAvailable: 0,
      resourcesDispatched: 0,
      casesHandled: undefined,
      avgResponseTimeHours: undefined,
      emergencyContacts: [],
      hospitals: undefined,
      lastUpdated: undefined,
      sourceUrl: undefined,
    }
  })

  // Keep any unknown/extra regions from upstream (if any) appended at end.
  for (const s of states) {
    if (!HEALTHCARE_REGIONS.includes(s.state)) merged.push(s)
  }

  return merged
}

function clampNonNegativeInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.round(n))
}

function parseOptionalNonNegativeInt(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  const s = String(value).trim()
  if (!s) return undefined
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, Math.round(n))
}

function parseOptionalNonNegativeFloat(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  const s = String(value).trim()
  if (!s) return undefined
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, n)
}

const DEFAULT_INDIA_EMERGENCY_CONTACTS: Array<{ label: string; phone: string }> = [
  { label: 'Emergency (India)', phone: '112' },
]

function isPlaceholderPhone(phone: string): boolean {
  const s = String(phone ?? '').trim().toLowerCase()
  if (!s) return true
  if (s.includes('placeholder')) return true
  const digits = s.replace(/[^0-9]/g, '')
  if (!digits) return true
  if (/^0+$/.test(digits)) return true
  // e.g. 1800-000-000
  if (/0{6,}/.test(digits)) return true
  return false
}

function phoneKey(phone: string): string {
  return String(phone ?? '').replace(/[^0-9]/g, '')
}

function normalizePhone(value: unknown): string {
  const s = String(value ?? '').trim()
  if (!s) return ''
  if (isPlaceholderPhone(s)) return ''
  return s
}

function normalizeStateName(value: unknown): string {
  return canonicalizeRegionName(value)
}

function normalizeContacts(value: unknown): Array<{ label: string; phone: string }> {
  const cleaned = Array.isArray(value)
    ? (value
        .map((c) => {
          const label = String((c as any)?.label ?? (c as any)?.name ?? 'Emergency').trim()
          const phone = normalizePhone((c as any)?.phone ?? (c as any)?.number)
          if (!phone) return null
          return { label: label || 'Emergency', phone }
        })
        .filter(Boolean) as Array<{ label: string; phone: string }> )
    : []

  // Ensure at least one real, known contact for India.
  const existingKeys = new Set(cleaned.map((c) => phoneKey(c.phone)).filter(Boolean))
  const merged = [...cleaned]
  for (const c of DEFAULT_INDIA_EMERGENCY_CONTACTS) {
    const k = phoneKey(c.phone)
    if (k && !existingKeys.has(k)) {
      merged.unshift(c)
      existingKeys.add(k)
    }
  }

  return merged
}

function ensureDefaultContacts(states: NormalizedHealthcareState[]): NormalizedHealthcareState[] {
  return states.map((s) => ({
    ...s,
    emergencyContacts: normalizeContacts(s.emergencyContacts),
  }))
}

function normalizeHospitals(value: unknown): NormalizedHospital[] {
  if (!Array.isArray(value)) return []
  return value
    .map((h) => {
      const name = String((h as any)?.name ?? (h as any)?.hospital ?? '').trim()
      if (!name) return null

      const bedsAvailable = parseOptionalNonNegativeInt(
        (h as any)?.bedsAvailable ?? (h as any)?.beds_available ?? (h as any)?.available_beds,
      )
      const totalBeds = parseOptionalNonNegativeInt((h as any)?.totalBeds ?? (h as any)?.total_beds)

      const lastUpdatedRaw = (h as any)?.lastUpdated ?? (h as any)?.updatedAt ?? (h as any)?.last_updated
      const lastUpdated = typeof lastUpdatedRaw === 'string' ? lastUpdatedRaw.trim() : undefined
      const sourceUrlRaw = (h as any)?.sourceUrl ?? (h as any)?.source_url ?? (h as any)?.url
      const sourceUrl = typeof sourceUrlRaw === 'string' ? sourceUrlRaw.trim() : undefined

      return {
        name,
        bedsAvailable,
        totalBeds,
        lastUpdated: lastUpdated || undefined,
        sourceUrl: sourceUrl || undefined,
      } satisfies NormalizedHospital
    })
    .filter(Boolean) as NormalizedHospital[]
}

function normalizeStates(payload: UpstreamHealthcareResponse): NormalizedHealthcareState[] {
  const rawStates = Array.isArray(payload?.states) ? payload.states : []

  return rawStates
    .map((s) => {
      const state =
        normalizeStateName((s as any)?.state) ||
        normalizeStateName((s as any)?.region) ||
        normalizeStateName((s as any)?.name)

      if (!state) return null

      const bedsAvailable = parseOptionalNonNegativeInt(
        (s as any)?.bedsAvailable ?? (s as any)?.beds_available ?? (s as any)?.available_beds,
      )
      const totalBeds = parseOptionalNonNegativeInt((s as any)?.totalBeds ?? (s as any)?.total_beds)

      const ventilatorsAvailable = parseOptionalNonNegativeInt(
        (s as any)?.ventilatorsAvailable ??
          (s as any)?.ventilators_available ??
          (s as any)?.available_ventilators,
      )

      const resourcesDispatched = parseOptionalNonNegativeInt(
        (s as any)?.resourcesDispatched ?? (s as any)?.resources_dispatched,
      )

      const casesHandled = parseOptionalNonNegativeInt(
        (s as any)?.casesHandled ?? (s as any)?.cases_handled ?? (s as any)?.cases,
      )

      const avgResponseTimeHours = parseOptionalNonNegativeFloat(
        (s as any)?.avgResponseTimeHours ??
          (s as any)?.avg_response_time_hours ??
          (s as any)?.avgResponseTime ??
          (s as any)?.avg_response_time,
      )

      const emergencyContacts = normalizeContacts(
        (s as any)?.emergencyContacts ?? (s as any)?.emergency_contacts ?? (s as any)?.contacts,
      )

      const hospitals = normalizeHospitals(
        (s as any)?.hospitals ?? (s as any)?.hospitalCapacity ?? (s as any)?.hospitals_list,
      )

      const lastUpdatedRaw = (s as any)?.lastUpdated ?? (s as any)?.updatedAt ?? (s as any)?.last_updated
      const lastUpdated = typeof lastUpdatedRaw === 'string' ? lastUpdatedRaw.trim() : undefined
      const sourceUrlRaw = (s as any)?.sourceUrl ?? (s as any)?.source_url ?? (s as any)?.url
      const sourceUrl = typeof sourceUrlRaw === 'string' ? sourceUrlRaw.trim() : undefined

      return {
        state,
        bedsAvailable,
        totalBeds,
        ventilatorsAvailable,
        resourcesDispatched,
        casesHandled,
        avgResponseTimeHours,
        emergencyContacts,
        hospitals: hospitals.length ? hospitals : undefined,
        lastUpdated: lastUpdated || undefined,
        sourceUrl: sourceUrl || undefined,
      } satisfies NormalizedHealthcareState
    })
    .filter(Boolean) as NormalizedHealthcareState[]
}

export async function GET() {
  const url = process.env.HEALTHCARE_API_URL
  if (!url) {
    // Local fallback for development/demo when no provider is configured.
    // Edit data/healthcare.json to update values.
    const localPath = path.join(process.cwd(), 'data', 'healthcare.json')
    try {
      const raw = await readFile(localPath, 'utf8')
      const payload = (JSON.parse(raw) ?? {}) as UpstreamHealthcareResponse

      const updatedAt =
        (typeof payload?.updatedAt === 'string' && payload.updatedAt) || new Date().toISOString()

      const states = ensureDefaultContacts(mergeWithAllStates(normalizeStates(payload)))

      const sourceUrl = typeof payload?.sourceUrl === 'string' ? payload.sourceUrl.trim() : undefined

      const result: NormalizedHealthcareResponse = {
        updatedAt,
        states,
        source: 'local:data/healthcare.json',
        sourceUrl: sourceUrl || undefined,
      }

      return NextResponse.json(result)
    } catch (e: any) {
      return NextResponse.json(
        {
          error:
            'No healthcare provider configured, and local file data/healthcare.json was not readable.',
          message: e?.message ? String(e.message).slice(0, 500) : undefined,
        },
        { status: 400 },
      )
    }
  }

  const authHeaderName = (process.env.HEALTHCARE_API_AUTH_HEADER || 'Authorization').trim()
  const apiKey = (process.env.HEALTHCARE_API_KEY || '').trim()

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  // If you provide a key but your upstream expects a different scheme, adjust HEALTHCARE_API_KEY accordingly.
  if (apiKey) {
    headers[authHeaderName] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
  }

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    const contentType = resp.headers.get('content-type') ?? ''
    const isJson = contentType.includes('application/json')
    const body = isJson ? await resp.json().catch(() => null) : await resp.text().catch(() => null)

    if (!resp.ok) {
      const upstreamMsg =
        (typeof body === 'object' && body ? (body as any)?.error?.message : null) ||
        (typeof body === 'object' && body ? (body as any)?.message : null) ||
        (typeof body === 'string' ? body : null)

      return NextResponse.json(
        {
          error: `Healthcare provider request failed (${resp.status}).`,
          message: upstreamMsg ? String(upstreamMsg).slice(0, 1000) : undefined,
        },
        { status: resp.status },
      )
    }

    const payload = (body ?? {}) as UpstreamHealthcareResponse
    const updatedAt =
      (typeof payload?.updatedAt === 'string' && payload.updatedAt) || new Date().toISOString()

    const states = ensureDefaultContacts(mergeWithAllStates(normalizeStates(payload)))

    const sourceUrl = typeof payload?.sourceUrl === 'string' ? payload.sourceUrl.trim() : undefined

    const result: NormalizedHealthcareResponse = {
      updatedAt,
      states,
      source: 'provider:HEALTHCARE_API_URL',
      sourceUrl: sourceUrl || undefined,
    }

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'Failed to reach healthcare provider.',
        message: e?.message ? String(e.message).slice(0, 500) : undefined,
      },
      { status: 502 },
    )
  }
}
