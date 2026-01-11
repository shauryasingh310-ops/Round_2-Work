"use client"

import { ALL_STATES } from "@/lib/all-states";

import { useMemo, useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts"
import { AlertTriangle, Activity, Droplet, Wind, CloudRain, ShieldAlert, ThermometerSun, Loader2, Download, Bell } from "lucide-react"
import { calculateLiveRisks, RiskProfile } from "@/lib/live-risk-engine"
import { exportRiskData } from "@/lib/export"
import { notificationService } from "@/lib/notifications"
import { preferencesStorage, historicalStorage } from "@/lib/storage"
import { getAriaLabel, getRole } from "@/lib/accessibility"

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function to01(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max <= min) return 0
  return clamp01((value - min) / (max - min))
}

function triangle01(value: number, min: number, peak: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  if (value <= min || value >= max) return 0
  if (value === peak) return 1
  if (value < peak) return clamp01((value - min) / (peak - min))
  return clamp01((max - value) / (max - peak))
}

export default function Dashboard() {
  const { t } = useTranslation()
  const [currentDate, setCurrentDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [riskData, setRiskData] = useState<any[]>([])
  const [vectorState, setVectorState] = useState<string>("")

  const getAqiColorClass = (aqi: number | null): string => {
    if (typeof aqi !== 'number' || !isFinite(aqi)) return 'text-primary'
    if (aqi <= 1) return 'text-green-500'
    if (aqi === 2) return 'text-yellow-500'
    return 'text-red-500'
  }

  type DiseaseDataApiResponse = {
    updatedAt: string
    states: Array<{
      state: string
      overallRisk?: 'Low' | 'Medium' | 'High' | 'Critical'
      dengueRisk?: number
      respiratoryRisk?: number
      waterRisk?: number
      primaryThreat?: string
      environmentalFactors?: {
        temp: number
        humidity: number
        rain: boolean
        pm25: number
        aqiUS?: number | null
        waterQuality: 'Good' | 'Fair' | 'Poor' | 'Unknown'
      }
      cases?: number
      deaths?: number
    }>
  }

  const buildFallbackRiskData = () =>
    ALL_STATES.map((state, idx) => {
      const diseaseList = ['Cholera', 'Dengue', 'Typhoid', 'Hepatitis A', 'Leptospirosis']
      const disease = diseaseList[idx % diseaseList.length]
      const risk = 0.3 + 0.6 * ((idx % 10) / 10) // 0.3 to 0.9
      return {
        state,
        location: state,
        disease,
        cases: 0,
        deaths: 0,
        risk,
        overallRisk:
          idx % 4 === 0 ? 'Critical' : idx % 3 === 0 ? 'High' : idx % 2 === 0 ? 'Medium' : 'Low',
        dengueRisk: Math.round(risk * 100),
        respiratoryRisk: Math.round(risk * 80),
        waterRisk: Math.round(risk * 60),
        primaryThreat: disease,
        environmentalFactors: {
          temp: 25 + (idx % 5) * 2,
          humidity: 60 + (idx % 4) * 5,
          rain: idx % 3 === 0,
          pm25: 40 + (idx % 5) * 10,
          waterQuality: idx % 4 === 0 ? 'Poor' : 'Good',
        },
      }
    })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/disease-data', { cache: 'no-store' })
        if (!res.ok) throw new Error(`API error ${res.status}`)
        const data = (await res.json()) as DiseaseDataApiResponse

        const normalized = data.states.map(s => ({
          state: s.state,
          location: s.state,
          disease: s.primaryThreat ?? 'Unknown',
          cases: s.cases ?? 0,
          deaths: s.deaths ?? 0,
          overallRisk: s.overallRisk ?? 'Low',
          dengueRisk: typeof s.dengueRisk === 'number' ? s.dengueRisk : 0,
          respiratoryRisk: typeof s.respiratoryRisk === 'number' ? s.respiratoryRisk : 0,
          waterRisk: typeof s.waterRisk === 'number' ? s.waterRisk : 0,
          primaryThreat: s.primaryThreat ?? 'Unknown',
          environmentalFactors: {
            temp: s.environmentalFactors?.temp ?? 25,
            humidity: s.environmentalFactors?.humidity ?? 60,
            rain: s.environmentalFactors?.rain ?? false,
            pm25: s.environmentalFactors?.pm25 ?? 40,
            aqiUS: typeof s.environmentalFactors?.aqiUS === 'number' ? s.environmentalFactors.aqiUS : null,
            waterQuality: s.environmentalFactors?.waterQuality ?? 'Unknown',
          },
        }))

        setRiskData(normalized)
        setCurrentDate(new Date(data.updatedAt).toLocaleString())
      } catch {
        setRiskData(buildFallbackRiskData())
        setCurrentDate(new Date().toLocaleString())
        setError('Live data unavailable. Showing fallback data.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (!riskData || riskData.length === 0) return
    
    // Save historical data
    riskData.forEach((risk) => {
      historicalStorage.save({
        date: new Date().toISOString().split("T")[0],
        state: risk.state || risk.location,
        riskScore: risk.dengueRisk || 0,
        cases: risk.cases || 0,
        environmentalFactors: risk.environmentalFactors || {
          temp: 0,
          humidity: 0,
          pm25: 0,
          waterQuality: "Unknown",
        },
      })
    })

    // Check for risk alerts
    const prefs = preferencesStorage.get()
    if (prefs.notificationsEnabled) {
      riskData.forEach((risk) => {
        const riskLevel = risk.overallRisk as "Low" | "Medium" | "High" | "Critical"
        const threshold = prefs.alertThresholds.find((t) => t.riskLevel === riskLevel)
        if (threshold?.enabled && (riskLevel === "High" || riskLevel === "Critical")) {
          const maxRisk = Math.max(risk.dengueRisk || 0, risk.respiratoryRisk || 0, risk.waterRisk || 0)
          notificationService.showRiskAlert(risk.state || risk.location, riskLevel, maxRisk)
        }
      })
    }
  }, [riskData])

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Critical": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "High": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "Medium": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      default: return "text-green-500 bg-green-500/10 border-green-500/20";
    }
  }

  const getProgressBarColor = (score: number) => {
    if (score > 80) return "bg-red-500";
    if (score > 50) return "bg-orange-500";
    return "bg-green-500";
  }

  const getAqiBarColor = (aqi: number | null | undefined): string => {
    if (typeof aqi !== 'number' || !isFinite(aqi)) return 'bg-green-500'
    if (aqi <= 1) return 'bg-green-500'
    if (aqi === 2) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

  const vectorRadarData = useMemo(() => {
    if (!riskData || riskData.length === 0) {
      return [
        { subject: 'Heat (Temp)', A: 0, fullMark: 100 },
        { subject: 'Humidity', A: 0, fullMark: 100 },
        { subject: 'Rainfall', A: 0, fullMark: 100 },
        { subject: 'Pollution (PM2.5)', A: 0, fullMark: 100 },
        { subject: 'Water Contamination', A: 0, fullMark: 100 },
      ]
    }

    const waterScore = (w: string): number => {
      const v = (w || '').toLowerCase()
      if (v === 'good') return 0
      if (v === 'fair') return 40
      if (v === 'poor') return 85
      return 50
    }

    if (vectorState) {
      const match = riskData.find((r) => r?.location === vectorState || r?.state === vectorState)
      const env = match?.environmentalFactors
      const temp = Number(env?.temp ?? NaN)
      const humidity = Number(env?.humidity ?? NaN)
      const pm25 = Number(env?.pm25 ?? NaN)
      const rain = Boolean(env?.rain)
      const waterQ = (env?.waterQuality ?? 'Unknown') as string

      return [
        { subject: 'Heat (Temp)', A: Math.round(to01(temp, 15, 42) * 100), fullMark: 100 },
        { subject: 'Humidity', A: Math.round(to01(humidity, 30, 95) * 100), fullMark: 100 },
        { subject: 'Rainfall', A: rain ? 100 : 0, fullMark: 100 },
        { subject: 'Pollution (PM2.5)', A: Math.round(to01(pm25, 0, 150) * 100), fullMark: 100 },
        { subject: 'Water Contamination', A: Math.round(clamp01(waterScore(waterQ) / 100) * 100), fullMark: 100 },
      ]
    }

    const temps = riskData.map((r) => r.environmentalFactors?.temp).filter((v: any) => typeof v === 'number') as number[]
    const hums = riskData.map((r) => r.environmentalFactors?.humidity).filter((v: any) => typeof v === 'number') as number[]
    const pm25s = riskData.map((r) => r.environmentalFactors?.pm25).filter((v: any) => typeof v === 'number') as number[]
    const rains = riskData.map((r) => r.environmentalFactors?.rain).filter((v: any) => typeof v === 'boolean') as boolean[]
    const water = riskData.map((r) => r.environmentalFactors?.waterQuality).filter(Boolean) as string[]

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

    const avgTemp = avg(temps)
    const avgHumidity = avg(hums)
    const avgPm25 = avg(pm25s)
    const rainPct = rains.length ? (rains.filter(Boolean).length / rains.length) : 0

    const avgWater = water.length ? water.map(waterScore).reduce((a, b) => a + b, 0) / water.length : 0

    return [
      { subject: 'Heat (Temp)', A: Math.round(to01(avgTemp, 15, 42) * 100), fullMark: 100 },
      { subject: 'Humidity', A: Math.round(to01(avgHumidity, 30, 95) * 100), fullMark: 100 },
      { subject: 'Rainfall', A: Math.round(clamp01(rainPct) * 100), fullMark: 100 },
      { subject: 'Pollution (PM2.5)', A: Math.round(to01(avgPm25, 0, 150) * 100), fullMark: 100 },
      { subject: 'Water Contamination', A: Math.round(clamp01(avgWater / 100) * 100), fullMark: 100 },
    ]
  }, [riskData, vectorState])

  const dengueBreedingData = useMemo(() => {
    if (!riskData || riskData.length === 0) return []

    const breedingIndex = (env: any) => {
      // Suitability-style heuristic using live environmental factors:
      // - Temp: best around ~28°C (falls off toward cooler/hotter extremes)
      // - Humidity: higher is generally better for vector survival
      // - Rain: standing water likelihood
      const temp = Number(env?.temp ?? NaN)
      const humidity = Number(env?.humidity ?? NaN)
      const tempSuit = triangle01(temp, 18, 28, 38)
      const humiditySuit = to01(humidity, 45, 90)
      const rainSuit = env?.rain ? 1 : 0
      return Math.round(clamp01(0.45 * humiditySuit + 0.35 * rainSuit + 0.20 * tempSuit) * 100)
    }

    return riskData
      .map((r) => ({
        location: r.location,
        breedingIndex: breedingIndex(r.environmentalFactors),
      }))
      .sort((a, b) => b.breedingIndex - a.breedingIndex)
      .slice(0, 12)
  }, [riskData])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground" suppressHydrationWarning>{t("system.analyzingLiveFactors")}</p>
        </div>
      </div>
    )
  }

  // Show error if no valid risk data
  if (!riskData || riskData.length === 0 || riskData.every(r => r.location === "Unknown")) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <p className="text-lg text-red-400" suppressHydrationWarning>{t("system.unableToLoadData")}<br/>{t("system.checkApiKey")}</p>
        </div>
      </div>
    );
  }

  // Aggregate stats for top cards
  const criticalZones = riskData.filter(r => r.overallRisk === "Critical" || r.overallRisk === "High");
  const predominantThreat = riskData.sort((a, b) => b.dengueRisk - a.dengueRisk)[0]?.primaryThreat;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Activity className="w-8 h-8" />
          <span suppressHydrationWarning>{t("dashboard.title")}</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-wrap-balance" suppressHydrationWarning>
          {t("dashboard.subtitle")}
        </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && "Notification" in window) {
                notificationService.requestPermission()
              }
            }}
            className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent/10 transition-colors flex items-center gap-2"
            aria-label="Enable notifications"
            suppressHydrationWarning
          >
            <Bell className="w-4 h-4" />
            <span className="hidden md:inline" suppressHydrationWarning>{t("system.notifications")}</span>
          </button>
          <button
            onClick={() => exportRiskData(riskData)}
            className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent/10 transition-colors flex items-center gap-2"
            aria-label={t("common.export")}
            suppressHydrationWarning
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline" suppressHydrationWarning>{t("common.export")}</span>
          </button>
        </div>
      </div>

      {/* MANDATORY DISCLAIMER */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <ShieldAlert className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300" suppressHydrationWarning>
          <strong suppressHydrationWarning>{t("system.liveSpreadRisk")}</strong> <span suppressHydrationWarning>{t("system.liveSpreadRiskDescription")}</span>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200" suppressHydrationWarning>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border group relative">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span
                className="cursor-help outline-none"
                tabIndex={0}
                aria-describedby="high-risk-zones-tooltip"
                suppressHydrationWarning
              >
                {t("dashboard.highRiskZones")}
              </span>
            </CardTitle>

            <div
              id="high-risk-zones-tooltip"
              role="tooltip"
              className="pointer-events-none invisible absolute z-50 top-12 left-4 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card/60 backdrop-blur-xl p-3 text-xs text-muted-foreground shadow-lg opacity-0 translate-y-1 scale-[0.98] transition-[opacity,transform] duration-150 ease-out will-change-transform group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100"
            >
              <div className="text-sm font-medium text-foreground mb-2" suppressHydrationWarning>
                {t("dashboard.highRiskZones")}
              </div>
              {(() => {
                const names = criticalZones
                  .map((z) => (z.location || z.state || '').toString())
                  .filter(Boolean)
                  .sort((a, b) => a.localeCompare(b))

                if (names.length === 0) {
                  return <div suppressHydrationWarning>{t("system.none") ?? 'None'}</div>
                }

                return (
                  <div className="space-y-1">
                    {names.map((n) => (
                      <div key={n} className="text-foreground/90">{n}</div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">{criticalZones.length}</p>
            <p className="text-xs text-muted-foreground mt-1 text-wrap-balance" suppressHydrationWarning>{t("dashboard.citiesWithElevatedRisk")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ThermometerSun className="w-4 h-4" />
              <span suppressHydrationWarning>{t("dashboard.primaryThreat")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-orange-400">{predominantThreat}</p>
            <p className="text-xs text-muted-foreground mt-1 text-wrap-balance" suppressHydrationWarning>{t("dashboard.drivenByWeather")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border group relative">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wind className="w-4 h-4" />
              <span
                className="cursor-help outline-none"
                tabIndex={0}
                aria-describedby="aqi-index-tooltip"
                suppressHydrationWarning
              >
                {t("dashboard.avgAirQuality")}
              </span>
            </CardTitle>

            <div
              id="aqi-index-tooltip"
              role="tooltip"
              className="pointer-events-none invisible absolute z-50 top-12 left-4 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card/70 backdrop-blur-md p-3 text-xs text-muted-foreground shadow-lg opacity-0 translate-y-1 scale-[0.98] transition-[opacity,transform] duration-150 ease-out will-change-transform group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100"
            >
              <div className="text-sm font-medium text-foreground mb-2">AQI Risk Index (US EPA)</div>
              <div className="space-y-1">
                <div><span className="font-medium text-foreground">1</span> — Good</div>
                <div><span className="font-medium text-foreground">2</span> — Satisfactory</div>
                <div><span className="font-medium text-foreground">3</span> — Moderate</div>
                <div><span className="font-medium text-foreground">4</span> — Unhealthy</div>
                <div><span className="font-medium text-foreground">5</span> — Very Unhealthy</div>
                <div><span className="font-medium text-foreground">6</span> — Hazardous</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const aqiValues = riskData
                .map((r) => r.environmentalFactors?.aqiUS)
                .filter((v: any) => typeof v === 'number' && isFinite(v)) as number[]

              if (aqiValues.length > 0) {
                const avgAqi = Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length)
                return (
                  <p className={`text-3xl font-bold ${getAqiColorClass(avgAqi)}`}>
                    {avgAqi}
                  </p>
                )
              }

              const pm25Values = riskData
                .map((r) => r.environmentalFactors?.pm25)
                .filter((v: any) => typeof v === 'number' && isFinite(v)) as number[]

              const avgPm25 =
                pm25Values.length > 0
                  ? Math.round(pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length)
                  : null

              return (
                <p className="text-3xl font-bold text-primary">
                  {avgPm25 ?? 'N/A'}
                </p>
              )
            })()}
            <p className="text-xs text-muted-foreground mt-1 text-wrap-balance" suppressHydrationWarning>{t("dashboard.nationalAvg")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Droplet className="w-4 h-4" />
              <span suppressHydrationWarning>{t("dashboard.waterRiskAlert")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">
              {riskData.filter(r => r.environmentalFactors.waterQuality === "Poor").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1 text-wrap-balance" suppressHydrationWarning>{t("dashboard.citiesWithContamination")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="live-map" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="live-map" suppressHydrationWarning>{t("dashboard.liveRiskMap")}</TabsTrigger>
          <TabsTrigger value="vectors" suppressHydrationWarning>{t("dashboard.vectorAnalysis")}</TabsTrigger>
        </TabsList>

        {/* Live Risk Map (List View) */}
        <TabsContent value="live-map" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle suppressHydrationWarning>{t("dashboard.regionalRiskAssessment")}</CardTitle>
              <CardDescription suppressHydrationWarning>{t("dashboard.liveProbability")} {currentDate}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskData.map((place) => (
                  <div
                    key={place.location}
                    className="p-4 bg-background rounded-lg border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    role={getRole("risk-meter")}
                    aria-label={getAriaLabel("risk-meter", place.location)}
                  >

                    {/* Location Info */}
                    <div className="w-full md:w-1/4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg">{place.location}</h4>
                        <Badge variant="outline" className={getRiskColor(place.overallRisk)} suppressHydrationWarning>
                          {t(`system.${place.overallRisk.toLowerCase()}`)} {t("system.risk")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{place.state}</p>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="flex items-center gap-1"><ThermometerSun className="w-3 h-3" /> {Math.round(place.environmentalFactors.temp)}°C</span>
                        <span className="flex items-center gap-1"><Droplet className="w-3 h-3" /> {place.environmentalFactors.humidity}%</span>
                        {place.environmentalFactors.rain && <span className="flex items-center gap-1 text-blue-400"><CloudRain className="w-3 h-3" /> Rain</span>}
                      </div>
                    </div>

                    {/* Risk Meters */}
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Dengue Meter */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-wrap-balance" suppressHydrationWarning>{t("dashboard.dengueMalaria")}</span>
                          <span className="font-bold">{place.dengueRisk}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${getProgressBarColor(place.dengueRisk)}`} style={{ width: `${place.dengueRisk}%` }}></div>
                        </div>
                      </div>

                      {/* Respiratory Meter */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-wrap-balance" suppressHydrationWarning>{t("dashboard.respiratoryAQI")}</span>
                          <span className="font-bold">{place.respiratoryRisk}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${getAqiBarColor(place.environmentalFactors?.aqiUS)}`} style={{ width: `${place.respiratoryRisk}%` }}></div>
                        </div>
                      </div>

                      {/* Water Meter */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-wrap-balance" suppressHydrationWarning>{t("dashboard.choleraWater")}</span>
                          <span className="font-bold">{place.waterRisk}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${getProgressBarColor(place.waterRisk)}`} style={{ width: `${place.waterRisk}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vector Radar Chart */}
        <TabsContent value="vectors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle suppressHydrationWarning>{t("dashboard.environmentalVulnerability")}</CardTitle>
                <CardDescription className="text-wrap-balance" suppressHydrationWarning>{t("dashboard.averageRiskFactors")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium" suppressHydrationWarning>
                    {t("mlPredictions.stateLabel")}
                  </div>
                  <select
                    value={vectorState}
                    onChange={(e) => setVectorState(e.target.value)}
                    className="h-9 w-full md:w-64 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={t("mlPredictions.stateLabel")}
                  >
                    <option value="">All (average)</option>
                    {ALL_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {vectorState ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9"
                      onClick={() => setVectorState("")}
                      suppressHydrationWarning
                    >
                      {t("common.clear")}
                    </Button>
                  ) : null}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart outerRadius="80%" data={vectorRadarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888888', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.1)" />
                    <Radar
                      name="Risk Factor Intensity"
                      dataKey="A"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle suppressHydrationWarning>{t("dashboard.dengueBreedingIndex")}</CardTitle>
                <CardDescription className="text-wrap-balance" suppressHydrationWarning>{t("dashboard.humidityRainfall")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs text-muted-foreground" suppressHydrationWarning>
                  Click a bar to focus the radar on that state.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dengueBreedingData}> {/* Top states by breeding index */}
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="location" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", borderColor: "rgba(255,255,255,0.1)" }} />
                    <Bar
                      name="Breeding Index"
                      dataKey="breedingIndex"
                      fill="oklch(0.6 0.2 270)"
                      radius={[4, 4, 0, 0]}
                      onClick={(entry: any) => {
                        const next = entry?.location
                        if (typeof next === 'string' && next.trim()) setVectorState(next)
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
        <p className="text-wrap-balance" suppressHydrationWarning>{t("dashboard.dataSources")}</p>
        <p className="mt-1" suppressHydrationWarning>{t("dashboard.lastUpdated")}: {currentDate}</p>
      </div>
    </div>
  )
}
