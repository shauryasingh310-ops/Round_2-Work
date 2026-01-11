type TelegramSendMessageArgs = {
  chatId: string
  text: string
  parseMode?: 'MarkdownV2' | 'Markdown' | 'HTML'
  disableWebPagePreview?: boolean
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}. Set it as a server-side environment variable.`)
  return value
}

function botToken(): string {
  return requireEnv('TELEGRAM_BOT_TOKEN')
}

export function telegramBotUsername(): string {
  const value = process.env.TELEGRAM_BOT_USERNAME
  return (value ?? '').trim().replace(/^@/, '')
}

export function buildTelegramStartLink(code: string): string {
  const username = telegramBotUsername()
  if (!username) return ''
  return `https://t.me/${encodeURIComponent(username)}?start=${encodeURIComponent(code)}`
}

export async function telegramSendMessage(args: TelegramSendMessageArgs): Promise<void> {
  const token = botToken()

  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`
  const body = {
    chat_id: args.chatId,
    text: args.text,
    parse_mode: args.parseMode,
    disable_web_page_preview: args.disableWebPagePreview ?? true,
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (resp.ok) return

  const text = await resp.text().catch(() => '')
  throw new Error(`Telegram API failed (${resp.status}): ${text.slice(0, 1000)}`)
}

export type TelegramWebhookUpdate = {
  update_id: number
  message?: {
    message_id: number
    from?: {
      id: number
      is_bot: boolean
      first_name?: string
      last_name?: string
      username?: string
      language_code?: string
    }
    chat: {
      id: number
      type: 'private' | 'group' | 'supergroup' | 'channel'
      username?: string
      first_name?: string
      last_name?: string
    }
    date: number
    text?: string
  }
}

export function extractStartCode(update: TelegramWebhookUpdate): {
  chatId: string
  username?: string
  code?: string
} | null {
  const text = update.message?.text?.trim() ?? ''
  if (!text) return null

  const chatId = String(update.message?.chat?.id ?? '')
  if (!chatId) return null

  const username = update.message?.from?.username

  // /start <payload>
  if (!text.startsWith('/start')) return { chatId, username }

  const parts = text.split(/\s+/).filter(Boolean)
  const code = parts.length >= 2 ? parts[1] : undefined

  return { chatId, username, code }
}
