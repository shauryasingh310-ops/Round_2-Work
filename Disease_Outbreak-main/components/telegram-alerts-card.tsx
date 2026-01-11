"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { LocateFixed, X } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ALL_STATES } from "@/lib/all-states"
import { preferencesStorage, type UserPreferences } from "@/lib/storage"

type ServerTelegramSettings = {
  telegram: {
    hasBot: boolean
    botUsername: string | null
    chatIdLinked: boolean
    telegramUsername: string | null
    telegramOptIn: boolean
  }
  settings: {
    selectedState: string
    browserEnabled: boolean
    dailyDigestEnabled?: boolean
  } | null
}

type Props = {
  onClose?: () => void
}

export function TelegramAlertsCard({ onClose }: Props) {
  const { data: session } = useSession()

  const [preferences, setPreferences] = useState<UserPreferences>(preferencesStorage.get())

  const [tgStatus, setTgStatus] = useState<ServerTelegramSettings | null>(null)
  const [tgLoading, setTgLoading] = useState(false)
  const [tgError, setTgError] = useState<string | null>(null)

  const selectedState = tgStatus?.settings?.selectedState || preferences.selectedState || ""
  const tgDailyDigestEnabled = tgStatus?.settings?.dailyDigestEnabled ?? true

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!session?.user?.id) {
        setTgStatus(null)
        return
      }

      setTgLoading(true)
      setTgError(null)

      try {
        const res = await fetch("/api/alerts/telegram/link-code", { cache: "no-store" })
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as any
          throw new Error(payload?.error || `Failed to load Telegram settings (${res.status}).`)
        }

        const data = (await res.json()) as ServerTelegramSettings
        if (cancelled) return

        setTgStatus(data)

        if (data.settings?.selectedState) {
          preferencesStorage.save({ selectedState: data.settings.selectedState })
          setPreferences(preferencesStorage.get())
        }
      } catch (e) {
        if (!cancelled) setTgError(e instanceof Error ? e.message : "Failed to load Telegram settings")
      } finally {
        if (!cancelled) setTgLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  const saveTelegramSettings = async (updates: Record<string, any>): Promise<string | null> => {
    setTgLoading(true)
    setTgError(null)

    try {
      const res = await fetch("/api/alerts/telegram/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const payload = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(payload?.error || `Failed to save (${res.status}).`)

      const startLink = typeof payload?.startLink === "string" && payload.startLink ? payload.startLink : null

      const refreshed = await fetch("/api/alerts/telegram/link-code", { cache: "no-store" })
      const data = (await refreshed.json()) as ServerTelegramSettings
      setTgStatus(data)

      if (typeof updates.selectedState === "string") {
        preferencesStorage.save({ selectedState: updates.selectedState })
        setPreferences(preferencesStorage.get())
      }

      return startLink
    } catch (e) {
      setTgError(e instanceof Error ? e.message : "Failed to save Telegram settings")
      return null
    } finally {
      setTgLoading(false)
    }
  }

  const linkTelegram = async () => {
    const startLink = await saveTelegramSettings({})
    if (!startLink) return
    if (typeof window === "undefined") return
    window.open(startLink, "_blank", "noopener,noreferrer")
  }

  const detectMyState = async () => {
    setTgLoading(true)
    setTgError(null)

    if (typeof window === "undefined" || !navigator.geolocation) {
      setTgLoading(false)
      setTgError("Location is not supported in this browser.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/location/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          })

          const payload = (await res.json().catch(() => null)) as any
          if (!res.ok || !payload?.ok || !payload?.state) {
            throw new Error(payload?.error || `Failed to detect state (${res.status}).`)
          }

          const value = String(payload.state)
          preferencesStorage.save({ selectedState: value })
          setPreferences(preferencesStorage.get())
          await saveTelegramSettings({ selectedState: value })
        } catch (e) {
          setTgError(e instanceof Error ? e.message : "Failed to detect state")
        } finally {
          setTgLoading(false)
        }
      },
      (err) => {
        setTgLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          setTgError("Location permission denied. Allow location access to auto-detect your state.")
          return
        }
        setTgError("Unable to fetch your location. Try again.")
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    )
  }

  return (
    <Card className="bg-card/60 border-border backdrop-blur-3xl shadow-2xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Telegram Alerts</CardTitle>
            <CardDescription>Daily digest + on-demand updates for your state.</CardDescription>
          </div>
          {onClose ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!session ? (
          <Alert>
            <AlertDescription>Sign in to enable Telegram alerts.</AlertDescription>
          </Alert>
        ) : (
          <>
            {tgError ? (
              <Alert className="border-red-500/40 bg-red-500/10">
                <AlertDescription className="text-red-200">{tgError}</AlertDescription>
              </Alert>
            ) : null}

            {tgStatus && !tgStatus.telegram.hasBot ? (
              <Alert className="border-yellow-500/40 bg-yellow-500/10">
                <AlertDescription className="text-yellow-100">
                  Telegram bot is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME on the server.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <label className="block text-sm font-medium">Selected state</label>
              <Button
                variant="default"
                className="w-full justify-start gap-2 shadow-sm ring-1 ring-primary/30"
                onClick={() => void detectMyState()}
                disabled={tgLoading}
              >
                <LocateFixed className="h-4 w-4" />
                {tgLoading ? "Detecting…" : "Auto-detect my state"}
              </Button>
              <div className="text-xs text-muted-foreground">Or choose manually below.</div>

              <select
                value={selectedState}
                onChange={(e) => {
                  const value = e.target.value
                  preferencesStorage.save({ selectedState: value })
                  setPreferences(preferencesStorage.get())
                  void saveTelegramSettings({ selectedState: value })
                }}
                className="w-full px-3 py-2.5 bg-background/80 border border-border rounded-md"
              >
                <option value="">-- Select a state --</option>
                {ALL_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-background rounded border border-border">
              <div>
                <div className="font-medium">Daily digest</div>
                <div className="text-xs text-muted-foreground">Send one detailed update per day.</div>
              </div>
              <Button
                variant={tgDailyDigestEnabled ? "default" : "outline"}
                onClick={() => void saveTelegramSettings({ dailyDigestEnabled: !tgDailyDigestEnabled })}
                disabled={tgLoading}
              >
                {tgDailyDigestEnabled ? "Enabled" : "Enable"}
              </Button>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={tgLoading || !selectedState}
                onClick={() => {
                  if (!selectedState) return
                  window.open("/api/telegram/open", "_blank", "noopener,noreferrer")
                }}
              >
                Open bot
              </Button>
              {!selectedState ? (
                <p className="text-xs text-muted-foreground">Select your state first to enable the bot.</p>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
