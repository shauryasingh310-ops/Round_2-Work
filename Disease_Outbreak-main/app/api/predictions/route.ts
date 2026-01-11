import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const runtime = 'nodejs'

type DiseaseDataApiResponse = {
  updatedAt: string
  states: Array<{
    state: string
    riskScore: number
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

function normalizePlaceName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function guessDiseaseFromThreat(threat: string | null | undefined): string {
  const t = (threat ?? '').toLowerCase()
  if (t.includes('water')) return 'Cholera'
  if (t.includes('resp')) return 'Respiratory'
  if (t.includes('vector')) return 'Dengue'
  return 'Unknown'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

function extractAssistantContent(payload: unknown): string | null {
  const data = payload as ChatCompletionResponse | null
  const content = data?.choices?.[0]?.message?.content
  return typeof content === 'string' && content.trim() ? content : null
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

export async function GET() {
  const data = await fetchDiseaseData()

  const states = (data?.states ?? [])
    .map((s) => ({
      region: s.state,
      disease: guessDiseaseFromThreat(s.primaryThreat),
      risk: clamp01(s.riskScore),
      overallRisk: s.overallRisk ?? (s.riskScore > 0.9 ? 'Critical' : s.riskScore > 0.7 ? 'High' : s.riskScore > 0.5 ? 'Medium' : 'Low'),
      updatedAt: data?.updatedAt ?? new Date().toISOString(),
    }))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 12)

  return NextResponse.json({
    updatedAt: data?.updatedAt ?? new Date().toISOString(),
    predictions: states,
    source: data ? 'live:/api/disease-data' : 'unavailable',
  })
}

type AnalyzeRequestBody = {
  region?: string
  disease?: string
  risk?: number
  trend?: 'increasing' | 'stable' | 'decreasing'
  prompt?: string
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as AnalyzeRequestBody

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Missing OPENROUTER_API_KEY. Add it to .env.local (server-side) and restart the dev server.',
      },
      { status: 400 },
    )
  }

  const region = (body.region ?? '').toString().trim()
  const disease = (body.disease ?? '').toString().trim()
  const trend = body.trend ?? 'stable'
  const risk = typeof body.risk === 'number' ? clamp01(body.risk) : undefined

  // Enrich prompt with live environmental context if we can.
  const diseaseData = await fetchDiseaseData()
  const normalizedRegion = normalizePlaceName(region)
  const match = diseaseData?.states?.find((s) => normalizePlaceName(s.state) === normalizedRegion)

  const prompt =
    body.prompt?.toString().trim() ||
    `Provide concise, actionable outbreak-prevention guidance for ${region || 'the selected region'}.
Disease: ${disease || 'Unknown'}
Estimated risk: ${typeof risk === 'number' ? `${Math.round(risk * 100)}%` : 'Unknown'}
Trend: ${trend}
Environmental factors (if available): ${match?.environmentalFactors ? JSON.stringify(match.environmentalFactors) : 'Unavailable'}
Primary threat category: ${match?.primaryThreat ?? 'Unknown'}
Output format: 5 bullet points, each 1 sentence, no disclaimers.`

  const model =
    process.env.AI_MODEL ||
    process.env.OPENROUTER_MODEL ||
    'openai/gpt-oss-120b:free'

  const baseMessages = [
    {
      role: 'system',
      content:
        'You are an epidemiology assistant. Provide practical prevention guidance based on risk and environmental factors. Be concise. Do not include hidden reasoning. Output only the final answer.',
    },
    { role: 'user', content: prompt },
  ]

  const url = 'https://openrouter.ai/api/v1/chat/completions'
  const maxAttempts = 3
  let lastErrorText: string | null = null
  let lastStatus: number | null = null
  let lastRetryAfter: string | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const extraHeaders: Record<string, string> = {}
    const siteUrl = process.env.OPENROUTER_SITE_URL
    const appName = process.env.OPENROUTER_APP_NAME
    if (siteUrl) extraHeaders['HTTP-Referer'] = siteUrl
    if (appName) extraHeaders['X-Title'] = appName

    const maxTokens = attempt === 1 ? 350 : attempt === 2 ? 700 : 900

    const requestBody = {
      model,
      messages: baseMessages,
      max_tokens: maxTokens,
      temperature: 0.4,
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(requestBody),
    })

    if (resp.ok) {
      const firstPayload = (await resp.json().catch(() => null)) as unknown
      const firstText = extractAssistantContent(firstPayload)
      if (!firstText) {
        // Some reasoning-heavy models may return an empty `message.content` when token budget is too low.
        // Retry with a larger budget before failing.
        if (attempt < maxAttempts) {
          continue
        }

        return NextResponse.json(
          { error: 'No analysis returned from OpenRouter.' },
          { status: 502 },
        )
      }

      // Optional: do a second pass "double-check" to reduce obvious mistakes.
      // We intentionally do NOT request or forward any hidden reasoning fields.
      const doubleCheckEnabled =
        (process.env.AI_DOUBLE_CHECK ?? '').toLowerCase() === 'true' ||
        process.env.AI_DOUBLE_CHECK === '1'

      if (!doubleCheckEnabled) {
        return NextResponse.json({
          analysis: firstText,
          model,
          updatedAt: new Date().toISOString(),
        })
      }

      const verifyBody = {
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are an epidemiology assistant. Review the prior answer for correctness and actionable clarity. If anything is incorrect or ambiguous, fix it. Keep the final output concise.',
          },
          { role: 'user', content: prompt },
          { role: 'assistant', content: firstText },
          {
            role: 'user',
            content:
              'Double-check the answer. If it is correct, return the same content. If not, return a corrected version. Output: 5 bullet points, each 1 sentence, no disclaimers.',
          },
        ],
        max_tokens: 350,
        temperature: 0.2,
      }

      const resp2 = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...extraHeaders,
        },
        body: JSON.stringify(verifyBody),
      })

      if (!resp2.ok) {
        // If the verification call fails, fall back to the first successful answer.
        return NextResponse.json({
          analysis: firstText,
          model,
          updatedAt: new Date().toISOString(),
          note: 'Verification step failed; returned initial answer.',
        })
      }

      const secondPayload = (await resp2.json().catch(() => null)) as unknown
      const secondText = extractAssistantContent(secondPayload)

      return NextResponse.json({
        analysis: secondText || firstText,
        model,
        updatedAt: new Date().toISOString(),
      })
    }

    lastStatus = resp.status
    lastRetryAfter = resp.headers.get('retry-after')

    const contentType = resp.headers.get('content-type') ?? ''
    const isJson = contentType.includes('application/json')
    const errorBody = isJson
      ? await resp.json().catch(() => null)
      : await resp.text().catch(() => null)

    const message =
      (typeof errorBody === 'object' && errorBody ? errorBody?.error?.message : null) ||
      (typeof errorBody === 'string' ? errorBody : null) ||
      ''

    lastErrorText = message ? message.toString().slice(0, 1000) : null

    const transient = resp.status === 429 || resp.status === 503 || resp.status === 504
    if (attempt < maxAttempts && transient) {
      const retryAfterSeconds = lastRetryAfter ? Number.parseFloat(lastRetryAfter) : NaN
      const waitMs = Number.isFinite(retryAfterSeconds)
        ? Math.max(250, Math.min(2000, retryAfterSeconds * 1000))
        : Math.min(2000, 400 * attempt)
      await sleep(waitMs)
      continue
    }

    const errorType =
      typeof errorBody === 'object' && errorBody ? errorBody?.error?.type : undefined
    const errorCode =
      typeof errorBody === 'object' && errorBody ? errorBody?.error?.code : undefined

    return NextResponse.json(
      {
        error: `OpenRouter request failed (${resp.status}).`,
        message: lastErrorText || undefined,
        type: errorType,
        code: errorCode,
        retryAfter: lastRetryAfter || undefined,
      },
      { status: resp.status },
    )
  }

  return NextResponse.json(
    {
      error: `OpenRouter request failed (${lastStatus ?? 500}).`,
      message: lastErrorText || undefined,
      retryAfter: lastRetryAfter || undefined,
    },
    { status: lastStatus ?? 502 },
  )
}
