import { NextResponse } from 'next/server'

import {
  fetchPollutionData,
  fetchWaterData,
  fetchWeatherData,
  type PollutionData,
  type WaterQualityData,
  type WeatherData,
} from '@/lib/api-client'
import { ALL_STATES } from '@/lib/all-states'
import { STATE_COORDINATES } from '@/lib/state-coordinates'

export const runtime = 'nodejs'

type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'

type WaterQualityLabel = 'Good' | 'Fair' | 'Poor' | 'Unknown'

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function normalizePlaceName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function parseNumericMeasurement(raw: string | null | undefined): number {
  if (!raw) return Number.NaN
  const cleaned = raw
    .toString()
    .trim()
    .replace(/,/g, '')

  if (!cleaned) return Number.NaN
  // common non-numeric tokens
  if (/^(na|n\/a|null|bdl|belowdetection|nd|notdetected|--)$/i.test(cleaned)) return Number.NaN
  // handle formats like "<0.5"
  const withoutInequality = cleaned.replace(/^[<>]=?\s*/, '')
  const num = Number.parseFloat(withoutInequality)
  return Number.isFinite(num) ? num : Number.NaN
}

function assessWaterQuality(record: WaterQualityData | null): { label: WaterQualityLabel; severity: number } {
  if (!record) return { label: 'Unknown', severity: 0.25 }

  const param = (record.quality_parameter ?? '').toLowerCase()
  const value = parseNumericMeasurement(record.value)
  if (!Number.isFinite(value)) return { label: 'Unknown', severity: 0.25 }

  // Parameter-aware heuristics. These are simple public-health oriented rules of thumb.
  // They can be refined later if you decide on a specific standard (CPCB/IS10500/etc.).
  if (param.includes('dissolved') && param.includes('oxygen')) {
    // DO (mg/L): higher is better
    if (value >= 6) return { label: 'Good', severity: 0.15 }
    if (value >= 4) return { label: 'Fair', severity: 0.45 }
    return { label: 'Poor', severity: 0.8 }
  }

  if (param.includes('bod')) {
    // BOD (mg/L): lower is better
    if (value <= 3) return { label: 'Good', severity: 0.15 }
    if (value <= 6) return { label: 'Fair', severity: 0.45 }
    return { label: 'Poor', severity: 0.8 }
  }

  if (param === 'ph' || param.includes(' ph')) {
    // pH: 6.5-8.5 desirable
    if (value >= 6.5 && value <= 8.5) return { label: 'Good', severity: 0.15 }
    if (value >= 6.0 && value <= 9.0) return { label: 'Fair', severity: 0.45 }
    return { label: 'Poor', severity: 0.8 }
  }

  if (param.includes('turbidity')) {
    // Turbidity (NTU): lower is better
    if (value <= 5) return { label: 'Good', severity: 0.15 }
    if (value <= 10) return { label: 'Fair', severity: 0.45 }
    return { label: 'Poor', severity: 0.8 }
  }

  // Generic fallback: treat higher as worse.
  if (value <= 10) return { label: 'Good', severity: 0.15 }
  if (value <= 20) return { label: 'Fair', severity: 0.45 }
  return { label: 'Poor', severity: 0.8 }
}

function computeRisk(input: {
  weather: WeatherData | null
  pollution: PollutionData | null
  water: WaterQualityData | null
}): {
  score: number
  level: RiskLevel
  drivers: string[]
  components: {
    dengueLike: number
    respiratory: number
    water: number
  }
  environmentalFactors: {
    temp: number
    humidity: number
    rain: boolean
    pm25: number
    aqiUS: number | null
    waterQuality: WaterQualityLabel
  }
  primaryThreat: string
} {
  const drivers: string[] = []

  const temp = input.weather?.temp ?? 0
  const humidity = input.weather?.humidity ?? 0
  const rain = (input.weather?.rain_last_3h ?? 0) > 0
  const pm25 = input.pollution?.pm25 ?? 0
  const aqiUS = typeof input.pollution?.usEpaIndex === 'number' ? input.pollution.usEpaIndex : null

  const waterAssessment = assessWaterQuality(input.water)

  // Simple heuristics (0..1) — replace later with real epidemiology / case data.
  const dengueLike = clamp01(((temp - 24) / 10) * 0.35 + (humidity / 100) * 0.45 + (rain ? 0.25 : 0))
  const respiratory = (() => {
    // Prefer categorical AQI (1..6) when present; this aligns with the UI label "Respiratory (AQI)".
    if (typeof aqiUS === 'number' && Number.isFinite(aqiUS)) {
      const idx = Math.round(aqiUS)
      switch (idx) {
        case 1:
          return 0.2
        case 2:
          return 0.45
        case 3:
          return 0.65
        case 4:
          return 0.8
        case 5:
          return 0.92
        case 6:
          return 1
        default:
          return clamp01((pm25 / 150) * 0.8)
      }
    }

    // Fallback: PM2.5-based scaling.
    return clamp01((pm25 / 150) * 0.8)
  })()

  // Water severity already normalized by parameter-aware thresholds.
  const water = clamp01(waterAssessment.severity)
  const waterQuality = waterAssessment.label

  if (dengueLike > 0.5) drivers.push('Weather')
  if (respiratory > 0.5) drivers.push('Air quality')
  if (water > 0.5) drivers.push('Water quality')

  const score = clamp01(Math.max(dengueLike, respiratory, water))

  const level: RiskLevel =
    score > 0.9 ? 'Critical' : score > 0.7 ? 'High' : score > 0.5 ? 'Medium' : 'Low'

  const maxComponent = Math.max(dengueLike, respiratory, water)
  const primaryThreat =
    maxComponent === water
      ? 'Water-borne'
      : maxComponent === respiratory
        ? 'Respiratory'
        : 'Vector-borne'

  return {
    score,
    level,
    drivers,
    components: {
      dengueLike,
      respiratory,
      water,
    },
    environmentalFactors: {
      temp,
      humidity,
      rain,
      pm25,
      aqiUS,
      waterQuality,
    },
    primaryThreat,
  }
}

function scoreWaterRecord(record: WaterQualityData): number {
  const param = (record.quality_parameter ?? '').toLowerCase()
  const assessment = assessWaterQuality(record)
  // Prefer records we know how to interpret (and that usually correlate with health outcomes)
  const paramWeight =
    param.includes('bod') || (param.includes('dissolved') && param.includes('oxygen')) || param.includes('coliform')
      ? 1
      : param.includes('turbidity') || param === 'ph' || param.includes(' ph')
        ? 0.8
        : 0.6

  return assessment.severity * paramWeight
}

function selectWaterForState(all: WaterQualityData[], state: string): WaterQualityData | null {
  if (!all.length) return null

  const target = normalizePlaceName(state)
  const byState = all.filter((w) => normalizePlaceName(w.state_name) === target)
  const byDistrict = all.filter((w) => normalizePlaceName(w.district_name) === target)

  // Fuzzy fallback for common naming variations (e.g., extra words, punctuation)
  const byStateFuzzy = all.filter((w) => {
    const normalized = normalizePlaceName(w.state_name)
    return normalized && (normalized.includes(target) || target.includes(normalized))
  })

  const candidates = byState.length ? byState : byDistrict.length ? byDistrict : byStateFuzzy

  if (!candidates.length) return null

  let best = candidates[0]
  let bestScore = scoreWaterRecord(best)
  for (const rec of candidates) {
    const s = scoreWaterRecord(rec)
    if (s > bestScore) {
      bestScore = s
      best = rec
    }
  }
  return best
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let index = 0

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (index < items.length) {
      const currentIndex = index++
      results[currentIndex] = await fn(items[currentIndex])
    }
  })

  await Promise.all(workers)
  return results
}

export async function GET() {
  const weatherKey = process.env.WEATHER_API_KEY
  const waterKey = process.env.DATA_GOV_IN_API_KEY

  // Fetch water dataset once (then match per state).
  const waterData = await fetchWaterData(waterKey ?? '').catch(() => [])

  const perState = await mapWithConcurrency(ALL_STATES, 6, async (state) => {
    const coords = STATE_COORDINATES[state]
    const [weather, pollution] = await Promise.all([
      fetchWeatherData(state, weatherKey ?? '').catch(() => null),
      fetchPollutionData(state, coords ? { lat: coords.lat, lng: coords.lng } : undefined).catch(() => null),
    ])

    const waterForState = selectWaterForState(waterData, state)

    const risk = computeRisk({ weather, pollution, water: waterForState })

    return {
      state,
      riskScore: Number(risk.score.toFixed(3)),
      overallRisk: risk.level,
      riskLevel: risk.level,
      drivers: risk.drivers,
      dengueRisk: Math.round(risk.components.dengueLike * 100),
      respiratoryRisk: Math.round(risk.components.respiratory * 100),
      waterRisk: Math.round(risk.components.water * 100),
      primaryThreat: risk.primaryThreat,
      environmentalFactors: risk.environmentalFactors,
      weather,
      pollution,
      water: waterForState,
      cases: 0,
      deaths: 0,
    }
  })

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      states: perState,
      meta: {
        weatherProvider: weatherKey ? 'WeatherAPI.com' : 'missing/none',
        weatherKeyPresent: Boolean(weatherKey),
        pollutionProvider: weatherKey ? 'WeatherAPI.com' : 'missing/none',
        waterProvider: waterKey ? 'data.gov.in' : 'mock/fallback',
        waterKeyPresent: Boolean(waterKey),
        waterRecords: waterData.length,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
