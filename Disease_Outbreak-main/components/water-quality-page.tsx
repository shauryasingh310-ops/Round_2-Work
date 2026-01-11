"use client"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertTriangle, Droplet, MapPin } from "lucide-react"

type WaterQualityLabel = "Good" | "Fair" | "Poor" | "Unknown"

type ContaminationLevel = "safe" | "warning" | "danger"

type DiseaseDataApiResponse = {
  updatedAt: string
  states: Array<{
    state: string
    waterRisk?: number
    drivers?: string[]
    environmentalFactors?: {
      waterQuality?: WaterQualityLabel
    }
    water?: {
      station_code?: string
      station_name?: string
      state_name?: string
      district_name?: string
      quality_parameter?: string
      value?: string
    } | null
  }>
  meta?: {
    waterProvider?: string
    waterKeyPresent?: boolean
    waterRecords?: number
    weatherProvider?: string
    weatherKeyPresent?: boolean
  }
}

type WaterSource = {
  id: string
  name: string
  type: "river" | "well" | "tap" | "reservoir" | "source"
  region: string
  contamination_level: "safe" | "warning" | "danger"
  quality_label: WaterQualityLabel
  quality_score?: number
  water_risk?: number
  measurement?: string
  measurement_value?: string
  last_tested?: string
  drivers?: string[]
}

type ContaminationEvent = {
  id: string
  source: string
  region: string
  date: string
  contaminant: string
  severity: "low" | "medium" | "high" | "critical"
  health_risk: string
}

type EventHistoryItem = {
  key: string
  event: ContaminationEvent
  firstSeenAt: number
  lastSeenAt: number
}

const EVENT_HISTORY_KEY = "waterQualityEventHistory:v1"

function parseNumericMeasurement(raw: string | null | undefined): number {
  if (!raw) return Number.NaN
  const cleaned = raw.toString().trim().replace(/,/g, "")
  if (!cleaned) return Number.NaN
  if (/^(na|n\/a|null|bdl|belowdetection|nd|notdetected|--)$/i.test(cleaned)) return Number.NaN
  const withoutInequality = cleaned.replace(/^[<>]=?\s*/, "")
  const num = Number.parseFloat(withoutInequality)
  return Number.isFinite(num) ? num : Number.NaN
}

function inferSourceType(name: string): WaterSource["type"] {
  const v = name.toLowerCase()
  if (v.includes("reservoir")) return "reservoir"
  if (v.includes("river")) return "river"
  if (v.includes("well")) return "well"
  if (v.includes("tap")) return "tap"
  return "source"
}

function labelToContaminationLevel(label: WaterQualityLabel): ContaminationLevel {
  if (label === "Poor") return "danger"
  if (label === "Fair") return "warning"
  if (label === "Good") return "safe"
  return "warning"
}

function toEventSeverity(level: ContaminationLevel): ContaminationEvent["severity"] {
  if (level === "danger") return "critical"
  if (level === "warning") return "high"
  return "low"
}

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function WaterQualityPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string>("")
  const [waterProvider, setWaterProvider] = useState<string>("")
  const [waterSources, setWaterSources] = useState<WaterSource[]>([])
  const [qualityTrendData, setQualityTrendData] = useState<Array<{ date: string; score: number }>>([])
  const [eventHistory, setEventHistory] = useState<EventHistoryItem[]>([])

  useEffect(() => {
    const stored = safeParseJson<EventHistoryItem[]>(
      typeof window !== "undefined" ? window.localStorage.getItem(EVENT_HISTORY_KEY) : null,
      [],
    )
    setEventHistory(Array.isArray(stored) ? stored : [])
  }, [])

  useEffect(() => {
    let active = true
    let timer: any

    const load = async () => {
      try {
        const res = await fetch("/api/disease-data", { cache: "no-store" })
        const data = (await res.json().catch(() => null)) as DiseaseDataApiResponse | null
        if (!res.ok) {
          const msg = [data?.["error" as any], (data as any)?.message].filter(Boolean).join("\n")
          throw new Error(msg || `Request failed (${res.status})`)
        }

        const rows = Array.isArray(data?.states) ? data!.states : []
        const iso = typeof data?.updatedAt === "string" ? data.updatedAt : new Date().toISOString()
        const updatedLabel = new Date(iso).toLocaleString()

        const provider = typeof data?.meta?.waterProvider === "string" ? data.meta.waterProvider : ""
        if (active) {
          setUpdatedAt(updatedLabel)
          setWaterProvider(provider)
        }

        const sources: WaterSource[] = rows
          .filter((r) => r && r.state)
          .map((r) => {
            const label = (r.environmentalFactors?.waterQuality ?? "Unknown") as WaterQualityLabel
            const level = labelToContaminationLevel(label)
            const waterRisk = typeof r.waterRisk === "number" && Number.isFinite(r.waterRisk) ? r.waterRisk : undefined
            const score = typeof waterRisk === "number" ? Math.max(0, Math.min(100, Math.round(100 - waterRisk))) : undefined

            const stationName = r.water?.station_name ? String(r.water.station_name) : `${r.state} water source`
            const measurement = r.water?.quality_parameter ? String(r.water.quality_parameter) : ""
            const measurementValue = r.water?.value ? String(r.water.value) : ""

            return {
              id: r.water?.station_code ? String(r.water.station_code) : r.state,
              name: stationName,
              type: inferSourceType(stationName),
              region: r.state,
              contamination_level: level,
              quality_label: label,
              quality_score: score,
              water_risk: waterRisk,
              measurement,
              measurement_value: measurementValue,
              last_tested: updatedLabel,
              drivers: Array.isArray(r.drivers) ? r.drivers.map(String) : [],
            }
          })
          .filter((s) => Boolean(s.name))
          .sort((a, b) => {
            const order = { danger: 2, warning: 1, safe: 0 } as const
            const byLevel = order[b.contamination_level] - order[a.contamination_level]
            if (byLevel !== 0) return byLevel
            return (a.quality_score ?? 101) - (b.quality_score ?? 101)
          })

        const scores = sources.map((s) => s.quality_score).filter((v): v is number => typeof v === "number")
        const avgScore = scores.length ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length) : null

        const now = Date.now()
        const cutoff = now - 7 * 24 * 60 * 60 * 1000

        const currentEvents: EventHistoryItem[] = sources
          .filter((s) => s.contamination_level !== "safe")
          .map((s) => {
            const key = `${s.region}::${s.id}::${s.measurement ?? ""}::${s.measurement_value ?? ""}`
            const contaminantParts = [s.measurement, s.measurement_value].filter(Boolean)
            const contaminant = contaminantParts.length ? contaminantParts.join(": ") : "Water quality alert"
            const healthRisk = (s.drivers ?? []).length ? (s.drivers ?? []).join("; ") : "Water risk signal detected"
            const event: ContaminationEvent = {
              id: key,
              source: s.name,
              region: s.region,
              date: updatedLabel,
              contaminant,
              severity: toEventSeverity(s.contamination_level),
              health_risk: healthRisk,
            }
            return { key, event, firstSeenAt: now, lastSeenAt: now }
          })

        if (active) {
          setWaterSources(sources)

          setQualityTrendData((prev) => {
            if (typeof avgScore !== "number") return prev
            const point = { date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), score: avgScore }
            const next = [...prev, point]
            return next.length > 48 ? next.slice(next.length - 48) : next
          })

          setEventHistory((prev) => {
            const pruned = prev.filter((x) => x.lastSeenAt >= cutoff)
            const byKey = new Map(pruned.map((x) => [x.key, x]))

            for (const item of currentEvents) {
              const existing = byKey.get(item.key)
              if (existing) {
                existing.lastSeenAt = now
                existing.event.date = updatedLabel
              } else {
                byKey.set(item.key, item)
              }
            }

            const next = Array.from(byKey.values()).sort((a, b) => b.lastSeenAt - a.lastSeenAt)
            try {
              window.localStorage.setItem(EVENT_HISTORY_KEY, JSON.stringify(next))
            } catch {
              // ignore storage errors
            }
            return next
          })
        }

        if (active) setError(null)
      } catch (e: any) {
        if (!active) return
        setError(e?.message ? String(e.message) : "Failed to load water quality data.")
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    void load()
    timer = setInterval(load, 5 * 60 * 1000)

    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [])

  const getContaminationColor = (level: string) => {
    switch (level) {
      case "danger":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "warning":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "safe":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/30 border-red-400"
      case "high":
        return "bg-orange-500/30 border-orange-400"
      case "medium":
        return "bg-yellow-500/30 border-yellow-400"
      case "low":
        return "bg-green-500/30 border-green-400"
      default:
        return "bg-gray-500/30 border-gray-400"
    }
  }

  const dangerSources = useMemo(() => waterSources.filter((s) => s.contamination_level === "danger"), [waterSources])
  const avgQualityScore = useMemo(() => {
    const scores = waterSources.map((s) => s.quality_score).filter((v): v is number => typeof v === "number")
    return scores.length ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length) : null
  }, [waterSources])

  const contaminationEvents = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    return eventHistory
      .filter((x) => x.lastSeenAt >= cutoff)
      .map((x) => x.event)
  }, [eventHistory])

  const phDistributionData = useMemo(() => {
    return waterSources
      .map((s) => {
        const isPH = (s.measurement ?? "").toLowerCase().includes("ph")
        const value = isPH ? parseNumericMeasurement(s.measurement_value) : Number.NaN
        return Number.isFinite(value)
          ? {
              name: s.name.split("(")[0].trim().substring(0, 15),
              ph: value,
            }
          : null
      })
      .filter((x): x is { name: string; ph: number } => Boolean(x))
  }, [waterSources])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Droplet className="w-8 h-8" />
          {t("waterQuality.title")}
        </h1>
        <p className="text-muted-foreground mt-2">{t("waterQuality.subtitle")}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Last updated: {updatedAt || "—"}
          {waterProvider ? ` • Source: ${waterProvider}` : ""} • Polling: 5 min
        </p>
      </div>

      {error ? (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <strong>{t("errors.general.somethingWentWrong")}:</strong> {error}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Critical Alerts */}
      {dangerSources.length > 0 && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <strong>{t("waterQuality.waterSafetyAlert")}:</strong> {dangerSources.length} {t("waterQuality.criticalContamination")}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("waterQuality.totalSourcesMonitored")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{waterSources.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("waterQuality.acrossAllIndia")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("waterQuality.avgQualityScore")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{typeof avgQualityScore === "number" ? `${avgQualityScore}%` : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("waterQuality.overallWaterQuality")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("waterQuality.criticalSources")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">{dangerSources.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("waterQuality.dangerLevelContamination")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("waterQuality.recentEvents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-400">{contaminationEvents.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("waterQuality.last7Days")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="sources">{t("waterQuality.waterSources")}</TabsTrigger>
          <TabsTrigger value="contaminants">{t("waterQuality.contaminationEvents")}</TabsTrigger>
          <TabsTrigger value="quality">{t("waterQuality.qualityTrends")}</TabsTrigger>
          <TabsTrigger value="analysis">{t("waterQuality.analysis")}</TabsTrigger>
        </TabsList>

        {/* Water Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("waterQuality.allIndiaWaterSourceStatus")}</CardTitle>
              <CardDescription>{t("waterQuality.realTimeMonitoring")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : waterSources.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No water quality records available.</div>
                ) : (
                  waterSources.map((source) => (
                  <div key={source.id} className="p-4 bg-background rounded-lg border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {source.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {source.type.charAt(0).toUpperCase() + source.type.slice(1)} • {source.region}
                        </p>
                      </div>
                      <Badge className={getContaminationColor(source.contamination_level)}>
                        {(source.quality_label ?? source.contamination_level).toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">Measurement</p>
                        <p className="font-semibold">{source.measurement || "—"}</p>
                        <p className="text-xs text-muted-foreground">Parameter</p>
                      </div>
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">Value</p>
                        <p className="font-semibold">{source.measurement_value || "—"}</p>
                        <p className="text-xs text-muted-foreground">Reported</p>
                      </div>
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">{t("waterQuality.qualityScore")}</p>
                        <p className="font-semibold text-primary">{typeof source.quality_score === "number" ? `${source.quality_score}%` : "—"}</p>
                        <div className="w-full bg-muted rounded-full h-1 mt-1">
                          <div
                            className="bg-primary h-1 rounded-full"
                            style={{
                              width: `${typeof source.quality_score === "number" ? source.quality_score : 0}%`,
                              backgroundColor:
                                typeof source.quality_score === "number" && source.quality_score > 75
                                  ? "rgb(34, 197, 94)"
                                  : typeof source.quality_score === "number" && source.quality_score > 50
                                    ? "rgb(234, 179, 8)"
                                    : "rgb(239, 68, 68)",
                            }}
                          />
                        </div>
                      </div>
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">{t("waterQuality.lastTested")}</p>
                        <p className="font-semibold text-xs">{source.last_tested || "—"}</p>
                        <p className="text-xs text-muted-foreground">{t("waterQuality.recently")}</p>
                      </div>
                    </div>
                  </div>
                ))) }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contamination Events Tab */}
        <TabsContent value="contaminants" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("waterQuality.recentContaminationEvents")}</CardTitle>
              <CardDescription>{t("waterQuality.detectedContaminants")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {contaminationEvents.map((event) => (
                <div key={event.id} className={`p-4 rounded-lg border ${getSeverityBg(event.severity)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{event.source}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event.region} • {event.date}
                      </p>
                    </div>
                    <Badge className="bg-background/50">{event.contaminant}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("waterQuality.severity")}</p>
                      <p className="font-semibold capitalize">{event.severity}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("waterQuality.healthRisk")}</p>
                      <p className="font-semibold">{event.health_risk}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Trends Tab */}
        <TabsContent value="quality" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("waterQuality.nationalWaterQualityTrend")}</CardTitle>
              <CardDescription>{t("waterQuality.averageQualityScore")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={qualityTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
                  <XAxis dataKey="date" stroke="oklch(0.7 0 0)" />
                  <YAxis stroke="oklch(0.7 0 0)" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: "oklch(0.12 0 0)", border: "1px solid oklch(0.2 0 0)" }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="oklch(0.5 0.15 200)"
                    strokeWidth={3}
                    dot={{ fill: "oklch(0.5 0.15 200)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("waterQuality.phLevelDistribution")}</CardTitle>
              <CardDescription>{t("waterQuality.phLevelsAcrossSources")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={phDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="oklch(0.7 0 0)" />
                  <YAxis stroke="oklch(0.7 0 0)" domain={[6, 8.5]} />
                  <Tooltip contentStyle={{ backgroundColor: "oklch(0.12 0 0)", border: "1px solid oklch(0.2 0 0)" }} />
                  <Bar dataKey="ph" fill="oklch(0.45 0.12 130)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t("waterQuality.qualityAssessmentByRegion")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from(new Set(waterSources.map((s) => s.region))).map((region) => {
                    const regionSources = waterSources.filter((s) => s.region === region)
                    const avgScore = Math.round(
                      regionSources.reduce((sum, s) => sum + s.quality_score, 0) / regionSources.length,
                    )
                    return (
                      <div key={region} className="p-3 bg-background rounded border border-border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">{region}</span>
                          <span className="text-sm text-muted-foreground">{avgScore}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${avgScore}%`,
                              backgroundColor:
                                avgScore > 75
                                  ? "rgb(34, 197, 94)"
                                  : avgScore > 50
                                    ? "rgb(234, 179, 8)"
                                    : "rgb(239, 68, 68)",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t("waterQuality.nationalRecommendations")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                  <p className="font-medium text-sm text-red-300">{t("waterQuality.criticalPriority")}</p>
                  <p className="text-sm mt-1">
                    {dangerSources.length
                      ? dangerSources
                          .slice(0, 3)
                          .map((s) => `${s.region} (${typeof s.quality_score === "number" ? `${s.quality_score}%` : "—"})`)
                          .join(", ")
                      : "—"}
                  </p>
                </div>
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded">
                  <p className="font-medium text-sm text-orange-300">{t("waterQuality.highPriority")}</p>
                  <p className="text-sm mt-1">
                    {waterSources.some((s) => s.contamination_level === "warning")
                      ? waterSources
                          .filter((s) => s.contamination_level === "warning")
                          .slice(0, 3)
                          .map((s) => `${s.region} (${typeof s.quality_score === "number" ? `${s.quality_score}%` : "—"})`)
                          .join(", ")
                      : "—"}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                  <p className="font-medium text-sm text-green-300">{t("waterQuality.positive")}</p>
                  <p className="text-sm mt-1">
                    {waterSources.some((s) => s.contamination_level === "safe")
                      ? waterSources
                          .filter((s) => s.contamination_level === "safe")
                          .slice(0, 3)
                          .map((s) => `${s.region} (${typeof s.quality_score === "number" ? `${s.quality_score}%` : "—"})`)
                          .join(", ")
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
