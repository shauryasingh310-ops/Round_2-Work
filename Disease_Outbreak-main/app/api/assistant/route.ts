import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type AssistantRequestBody = {
  message?: string
  messages?: ChatMessage[]
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

function normalizeMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return []

  return messages
    .map((m) => {
      const role = (m as any)?.role
      const content = (m as any)?.content
      if (role !== 'user' && role !== 'assistant') return null
      if (typeof content !== 'string') return null
      const trimmed = content.trim()
      if (!trimmed) return null
      return { role, content: trimmed.slice(0, 2000) } as ChatMessage
    })
    .filter(Boolean) as ChatMessage[]
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as AssistantRequestBody

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Missing OPENROUTER_API_KEY. Add it to .env.local (server-side) and restart the dev server.',
      },
      { status: 400 },
    )
  }

  const model =
    process.env.AI_MODEL || process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free'

  const prior = normalizeMessages(body.messages)
  const single = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : ''

  const userMessages = prior.length ? prior : single ? [{ role: 'user', content: single }] : []
  if (userMessages.length === 0) {
    return NextResponse.json(
      { error: 'Missing message.' },
      { status: 400 },
    )
  }

  const maxHistory = 20
  const clipped = userMessages.slice(-maxHistory)

  const requestBody = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are the EpiGuard assistant. Help users interpret outbreak risk signals, environmental factors, and app features. Provide practical, concise guidance. Do not claim to be a doctor. For urgent symptoms, recommend contacting local medical services. Keep answers short.',
      },
      ...clipped,
    ],
    max_tokens: 450,
    temperature: 0.4,
  }

  const extraHeaders: Record<string, string> = {}
  const siteUrl = process.env.OPENROUTER_SITE_URL
  const appName = process.env.OPENROUTER_APP_NAME
  if (siteUrl) extraHeaders['HTTP-Referer'] = siteUrl
  if (appName) extraHeaders['X-Title'] = appName

  const url = 'https://openrouter.ai/api/v1/chat/completions'

  const maxAttempts = 3
  let lastErrorText: string | null = null
  let lastStatus: number | null = null
  let lastRetryAfter: string | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const maxTokens = attempt === 1 ? 450 : attempt === 2 ? 800 : 1100

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({ ...requestBody, max_tokens: maxTokens }),
    })

    if (resp.ok) {
      const payload = (await resp.json().catch(() => null)) as unknown
      const text = extractAssistantContent(payload)
      if (!text) {
        // Some reasoning-heavy models may return an empty `message.content` when token budget is too low.
        // Retry with a larger budget before failing.
        if (attempt < maxAttempts) {
          continue
        }

        return NextResponse.json(
          { error: 'No response returned from OpenRouter.' },
          { status: 502 },
        )
      }

      return NextResponse.json({
        message: text,
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
      (typeof errorBody === 'object' && errorBody ? (errorBody as any)?.error?.message : null) ||
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
      typeof errorBody === 'object' && errorBody ? (errorBody as any)?.error?.type : undefined
    const errorCode =
      typeof errorBody === 'object' && errorBody ? (errorBody as any)?.error?.code : undefined

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
