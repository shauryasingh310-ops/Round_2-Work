'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, Loader2, Send, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type AssistantApiResponse = {
  message?: string
  error?: string
  messageText?: string
  type?: string
  code?: string
  retryAfter?: string
}

function playChatSound(kind: 'send' | 'receive') {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = kind === 'send' ? 520 : 760

    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.13)

    osc.onended = () => {
      try {
        ctx.close()
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore (autoplay / permission errors)
  }
}

export function AIAssistantPanel() {
  const { t } = useTranslation()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, loading])

  async function send() {
    const content = input.trim()
    if (!content || loading) return

    playChatSound('send')
    setError(null)
    setLoading(true)

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')

    try {
      const resp = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      const data = (await resp.json().catch(() => null)) as AssistantApiResponse | null

      if (!resp.ok) {
        const serverMessage =
          (data as any)?.message || (data as any)?.error || t('assistant.errors.generic')
        const retryAfter = (data as any)?.retryAfter
        setError(retryAfter ? `${serverMessage} (retry-after: ${retryAfter})` : serverMessage)
        return
      }

      const assistantText = data?.message
      if (!assistantText) {
        setError(t('assistant.errors.noResponse'))
        return
      }

      playChatSound('receive')
      setMessages([...nextMessages, { role: 'assistant', content: assistantText }])
    } catch {
      setError(t('assistant.errors.network'))
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send()
  }

  const ChatUI = (
    <>
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto rounded-md border bg-background p-3"
        aria-label={t('assistant.transcriptLabel')}
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('assistant.empty')}</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={
                  (m.role === 'user' ? 'flex justify-end ' : 'flex justify-start ') +
                  'animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none'
                }
              >
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground'
                      : 'max-w-[85%] rounded-lg bg-muted px-3 py-2 text-foreground'
                  }
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-start animate-pulse motion-reduce:animate-none">
            <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-foreground">
              <p className="text-sm leading-relaxed">…</p>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('assistant.inputPlaceholder')}
          aria-label={t('assistant.inputLabel')}
          className="bg-background/90 border-border/70 backdrop-blur-xl placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/50"
        />
        <Button type="submit" disabled={!canSend}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="ml-2">{t('assistant.send')}</span>
        </Button>
      </form>
    </>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('assistant.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ChatUI}
      </CardContent>
    </Card>
  )
}

export function AIAssistantWidget() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="fixed bottom-24 right-6 z-50">
          <Card className="w-[460px] max-w-[calc(100vw-2rem)] bg-card/60 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{t('assistant.title')}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('assistant.close')}
                onClick={() => setOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <AIAssistantPanelContent />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Button
        type="button"
        className="h-20 w-20 rounded-full p-0"
        aria-label={t('assistant.open')}
        onClick={() => setOpen((v) => !v)}
      >
        <Bot className="h-12 w-12" />
      </Button>
    </div>
  )
}

function AIAssistantPanelContent() {
  const { t } = useTranslation()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, loading])

  async function send() {
    const content = input.trim()
    if (!content || loading) return

    playChatSound('send')
    setError(null)
    setLoading(true)

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')

    try {
      const resp = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      const data = (await resp.json().catch(() => null)) as AssistantApiResponse | null

      if (!resp.ok) {
        const serverMessage =
          (data as any)?.message || (data as any)?.error || t('assistant.errors.generic')
        const retryAfter = (data as any)?.retryAfter
        setError(retryAfter ? `${serverMessage} (retry-after: ${retryAfter})` : serverMessage)
        return
      }

      const assistantText = data?.message
      if (!assistantText) {
        setError(t('assistant.errors.noResponse'))
        return
      }

      playChatSound('receive')
      setMessages([...nextMessages, { role: 'assistant', content: assistantText }])
    } catch {
      setError(t('assistant.errors.network'))
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send()
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="h-96 max-h-[calc(100vh-16rem)] overflow-y-auto rounded-md border bg-background/60 backdrop-blur-xl p-3"
        aria-label={t('assistant.transcriptLabel')}
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('assistant.empty')}</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={
                  (m.role === 'user' ? 'flex justify-end ' : 'flex justify-start ') +
                  'animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none'
                }
              >
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground'
                      : 'max-w-[85%] rounded-lg bg-muted px-3 py-2 text-foreground'
                  }
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-start animate-pulse motion-reduce:animate-none">
            <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-foreground">
              <p className="text-sm leading-relaxed">…</p>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('assistant.inputPlaceholder')}
          aria-label={t('assistant.inputLabel')}
          className="bg-background/90 border-border/70 backdrop-blur-xl placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/50"
        />
        <Button type="submit" disabled={!canSend}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </>
  )
}
