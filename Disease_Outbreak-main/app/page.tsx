"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Activity, Droplet, Users, Ambulance, Brain, BarChart3, Menu, X, MapPin, PanelLeft, Settings } from "lucide-react"
import { InteractiveMapModalButton } from "@/components/interactive-map-modal-button"
import { TelegramBotButton } from "@/components/telegram-bot-button"
import { useTranslation } from "react-i18next"
import { signOut, useSession } from "next-auth/react"
import { notificationService } from "@/lib/notifications"
import { preferencesStorage } from "@/lib/storage"
import Dashboard from "./dashboard"
import { WaterQualityPage } from "@/components/water-quality-page"
import { CommunityReportingPage } from "@/components/community-reporting-page"
import { HealthcareResponsePage } from "@/components/healthcare-response-page"
import { MLPredictionsPage } from "@/components/ml-predictions-page"
import AnalyticsInsightsPage from "@/components/analytics-insights-page"
import { MyLocationPage } from "@/components/my-location-page"
import { SettingsPage } from "@/components/settings-page"
import { AIAssistantWidget } from "@/components/ai-assistant-panel"

type PageType = "dashboard" | "mylocation" | "water" | "community" | "healthcare" | "ml" | "analytics" | "settings"

export default function Home() {
  const { t, i18n } = useTranslation()
  const { data: session, status } = useSession()
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    if (typeof window === "undefined") return

    const run = async () => {
      try {
        const today = new Date()
        const key = `epiguard_daily_digest_${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`
        if (localStorage.getItem(key)) return

        const localPrefs = preferencesStorage.get()
        if (!localPrefs.notificationsEnabled) return

        // Prefer server settings (browserEnabled + selectedState + dailyDigestEnabled)
        const res = await fetch("/api/alerts/telegram/link-code", { cache: "no-store" })
        const payload = (await res.json().catch(() => null)) as any

        const selectedState = (payload?.settings?.selectedState || localPrefs.selectedState || "").toString().trim()
        const browserEnabled = payload?.settings?.browserEnabled ?? true
        const dailyEnabled = payload?.settings?.dailyDigestEnabled ?? true

        if (!browserEnabled || !dailyEnabled) return
        if (!selectedState) return

        // Fetch digest details for the selected state.
        const digestRes = await fetch(`/api/digest/state?state=${encodeURIComponent(selectedState)}`, { cache: "no-store" })
        const digest = (await digestRes.json().catch(() => null)) as any
        if (!digestRes.ok || !digest?.ok) return

        const pct = Math.round(Number(digest.riskScore) * 100)
        const title = `Daily Risk Update: ${digest.state}`
        const body = `Risk: ${digest.overallRisk} (${pct}%)\nThreat: ${digest.primaryThreat}\n${Array.isArray(digest.preventions) ? `Prevention: ${digest.preventions[0]}` : ""}`

        await notificationService.requestPermission()
        await notificationService.show({
          title,
          body,
          tag: `daily_digest_${digest.state}`,
        })

        localStorage.setItem(key, "1")
      } catch {
        // best-effort; ignore
      }
    }

    void run()
  }, [status])

  useEffect(() => {
    if (!profileOpen) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (profileRef.current?.contains(target)) return
      setProfileOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [profileOpen])

  const userLabel = useMemo(() => {
    const name = session?.user?.name?.trim()
    if (name) return name
    const email = session?.user?.email?.trim()
    if (email) return email
    return 'Profile'
  }, [session?.user?.email, session?.user?.name])

  const userInitial = useMemo(() => {
    const source = session?.user?.name || session?.user?.email || ''
    const c = source.trim().charAt(0).toUpperCase()
    return c || 'U'
  }, [session?.user?.email, session?.user?.name])

  const navItems = useMemo(() => [
    { id: "dashboard" as const, label: t("common.dashboard"), icon: Activity },
    { id: "mylocation" as const, label: t("common.myLocation"), icon: MapPin },
    { id: "water" as const, label: t("common.waterQuality"), icon: Droplet },
    { id: "community" as const, label: t("common.communityReports"), icon: Users },
    { id: "healthcare" as const, label: t("common.healthcareResponse"), icon: Ambulance },
    { id: "ml" as const, label: t("common.mlPredictions"), icon: Brain },
    { id: "analytics" as const, label: t("common.analytics"), icon: BarChart3 },
    { id: "settings" as const, label: t("common.settings"), icon: Settings },
  ], [t])

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "mylocation":
        return <MyLocationPage />
      case "water":
        return <WaterQualityPage />
      case "community":
        return <CommunityReportingPage />
      case "healthcare":
        return <HealthcareResponsePage />
      case "ml":
        return <MLPredictionsPage />
      case "analytics":
        return <AnalyticsInsightsPage />
      case "settings":
        return <SettingsPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <div key={i18n.language} className="flex h-screen bg-transparent">
      {/* Sidebar */}
      <aside
        className={`${mobileMenuOpen ? "fixed inset-0" : "hidden"} md:block md:static ${isSidebarOpen ? "md:w-64" : "md:w-0"
          } bg-card border-r border-border transition-all duration-300 z-40 w-full h-full md:h-screen overflow-hidden`}
      >
        <div className="w-full md:w-64 h-full flex flex-col">
          <div className="p-6 border-b border-border flex items-center justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              <h2 className="font-bold text-lg whitespace-nowrap">EpiGuard</h2>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id as PageType)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${currentPage === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                    }`}
                >
                  <Icon className="w-5 h-5 min-w-[1.25rem]" />
                  <span className="font-medium" suppressHydrationWarning>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="p-4 border-t border-border mt-auto">
            <div className="bg-primary/10 rounded-lg p-4 text-sm whitespace-nowrap">
              <p className="font-medium text-primary mb-2" suppressHydrationWarning>{t("system.systemStatus")}</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p suppressHydrationWarning>{t("system.databaseConnected")}</p>
                <p suppressHydrationWarning>{t("system.mlModelsActive")}</p>
                <p suppressHydrationWarning>{t("system.lastSync")}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex text-muted-foreground hover:text-foreground transition-colors"
            >
              <PanelLeft className={`w-5 h-5 ${!isSidebarOpen ? "rotate-180" : ""} transition-transform`} />
            </button>
            <h1 className="font-bold md:hidden">EpiGuard</h1>
          </div>
          <div className="flex items-center gap-2">
            <TelegramBotButton />
            <InteractiveMapModalButton />

            <div className="relative" ref={profileRef}>
              {status === 'authenticated' ? (
                <button
                  type="button"
                  aria-label={userLabel}
                  onClick={() => setProfileOpen((v) => !v)}
                  className="h-10 w-10 rounded-full border border-border bg-card/80 hover:bg-card transition-colors flex items-center justify-center overflow-hidden shadow-sm hover:shadow-md ring-1 ring-primary/25"
                >
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-foreground">{userInitial}</span>
                  )}
                </button>
              ) : (
                <a
                  href="/sign-in"
                  className="px-3 py-2 rounded-md border border-border bg-card/80 hover:bg-card transition-colors text-sm font-medium shadow-sm ring-1 ring-primary/25"
                >
                  Sign in
                </a>
              )}

              {profileOpen && status === 'authenticated' && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card/[0.98] backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-primary/20">
                  <div className="px-4 py-3">
                    <div className="text-base font-semibold truncate">{session?.user?.name || 'Account'}</div>
                    {session?.user?.email && (
                      <div className="text-sm text-muted-foreground truncate">{session.user.email}</div>
                    )}
                  </div>
                  <div className="border-t border-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      void signOut({ callbackUrl: '/sign-in' })
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-accent/10 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div key={currentPage} className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">{renderPage()}</div>
      </main>

      <AIAssistantWidget />
    </div>
  )
}
