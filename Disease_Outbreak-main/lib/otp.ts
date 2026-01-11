import crypto from 'node:crypto'

export function generateOtpCode(length: number = 6): string {
  const digits = '0123456789'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += digits[Math.floor(Math.random() * digits.length)]
  }
  return out
}

export function hashOtp(code: string, secret: string): string {
  return crypto.createHash('sha256').update(`${secret}:${code}`).digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) return false
    return crypto.timingSafeEqual(aBuf, bBuf)
  } catch {
    return false
  }
}

export function splitBullets(text: string, max: number): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const bullets = lines
    .map((l) => l.replace(/^[-*•\d+.\)]\s*/, '').trim())
    .filter(Boolean)

  const unique: string[] = []
  for (const b of bullets) {
    if (!unique.includes(b)) unique.push(b)
    if (unique.length >= max) break
  }

  return unique
}
