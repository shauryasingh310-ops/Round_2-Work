"use client"

import React, { useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TelegramAlertsCard } from "@/components/telegram-alerts-card"

export function TelegramBotButton() {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const el = wrapperRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  return (
    <div ref={wrapperRef} className="group relative">
      <Button
        variant="outline"
        size="icon"
        className={
          "h-10 w-10 border-primary/40 bg-primary/10 text-primary " +
          "shadow-sm ring-1 ring-primary/35 " +
          "transition-all hover:bg-primary/15 hover:border-primary/60 " +
          "hover:shadow-[0_0_0_1px_rgba(99,102,241,0.25),0_0_24px_rgba(99,102,241,0.35)] " +
          "focus-visible:ring-primary/60"
        }
        aria-label="Telegram bot"
        onClick={() => setOpen((v) => !v)}
      >
        <Send className="h-4 w-4" />
      </Button>

      <div className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="rounded-md border border-border bg-card/95 px-2 py-1 text-xs text-foreground shadow-lg backdrop-blur">
          Telegram bot
        </div>
      </div>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-2xl animate-in fade-in duration-200 motion-reduce:animate-none"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-[min(480px,calc(100vw-24px))] z-50 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 motion-reduce:animate-none">
            <TelegramAlertsCard onClose={() => setOpen(false)} />
          </div>
        </>
      ) : null}
    </div>
  )
}
