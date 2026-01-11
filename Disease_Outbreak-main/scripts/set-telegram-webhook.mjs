import fs from 'node:fs'
import path from 'node:path'

function parseDotenv(text) {
  const out = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()

    // Strip optional surrounding quotes.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    out[key] = value
  }
  return out
}

function loadEnv() {
  const cwd = process.cwd()
  const candidates = ['.env.local', '.env']
  const merged = {}

  for (const filename of candidates) {
    const p = path.join(cwd, filename)
    if (!fs.existsSync(p)) continue
    const txt = fs.readFileSync(p, 'utf8')
    Object.assign(merged, parseDotenv(txt))
  }

  return merged
}

function requireValue(env, name) {
  const value = (env[name] ?? '').toString().trim()
  if (!value) throw new Error(`Missing ${name}. Set it in .env.local (or Vercel env vars).`)
  return value
}

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, '')
}

async function telegramApi(token, method, body) {
  const url = `https://api.telegram.org/bot${token}/${method}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })

  const payload = await resp.json().catch(() => null)
  if (!resp.ok || !payload?.ok) {
    const desc = payload?.description ? `: ${payload.description}` : ''
    throw new Error(`Telegram API ${method} failed (${resp.status})${desc}`)
  }
  return payload
}

async function main() {
  const env = loadEnv()
  const token = requireValue(env, 'TELEGRAM_BOT_TOKEN')
  const secret = requireValue(env, 'TELEGRAM_WEBHOOK_SECRET')
  const baseUrl = stripTrailingSlash(requireValue(env, 'APP_BASE_URL'))
  const webhookUrl = `${baseUrl}/api/telegram/webhook`

  await telegramApi(token, 'setWebhook', {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ['message'],
  })

  const info = await telegramApi(token, 'getWebhookInfo', {})
  const result = info?.result ?? {}

  // Do NOT print secrets.
  console.log('OK: Telegram webhook configured')
  console.log(`- url: ${result.url || webhookUrl}`)
  if (result.last_error_message) {
    console.log(`- last_error: ${result.last_error_message}`)
  }
  if (typeof result.pending_update_count === 'number') {
    console.log(`- pending_update_count: ${result.pending_update_count}`)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
