"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertTriangle, Ambulance, CheckCircle2, Clock, Phone, Truck } from "lucide-react"

interface Hospital {
  id: string
  name: string
  region: string
  beds_available: number
  total_beds: number
  icu_beds: number
  staff_count: number
  distance: number
  response_time: number
}

interface ResourceAllocation {
  id: string
  type: "medicine" | "water" | "team"
  item: string
  quantity: number
  destination: string
  status: "dispatched" | "in_transit" | "delivered"
  departure: string
  estimated_arrival: string
}

interface ResponseMetric {
  date: string
  beds_available: number
  ventilators_available: number
  resources_dispatched: number
  contacts: number
  fetch_latency_ms: number
  cases_handled?: number
  avg_response_time_hours?: number
}

type HealthcareApiResponse = {
  updatedAt: string
  sourceUrl?: string
  states: Array<{
    state: string
    bedsAvailable?: number
    totalBeds?: number
    ventilatorsAvailable?: number
    resourcesDispatched?: number
    casesHandled?: number
    avgResponseTimeHours?: number
    emergencyContacts: Array<{ label: string; phone: string }>
    lastUpdated?: string
    sourceUrl?: string
    hospitals?: Array<{ name: string; bedsAvailable?: number; totalBeds?: number; lastUpdated?: string; sourceUrl?: string }>
  }>
  source?: string
  error?: string
  message?: string
}

function getCapacityStatus(available: number, total: number): "Adequate" | "Strained" | "Critical" {
  const percentage = total > 0 ? (available / total) * 100 : 0
  if (percentage > 40) return "Adequate"
  if (percentage > 20) return "Strained"
  return "Critical"
}

function getStatusColor(status: string): string {
  switch (status) {
    case "delivered":
      return "bg-green-500/20 text-green-400 border-green-500/30"
    case "in_transit":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "dispatched":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30"
  }
}

export function HealthcareResponsePage() {
  const { t } = useTranslation()

  const [healthcareLoading, setHealthcareLoading] = useState(true)
  const [healthcareError, setHealthcareError] = useState<string | null>(null)
  const [healthcareUpdatedAt, setHealthcareUpdatedAt] = useState<string>("")
  const [healthcareSourceUrl, setHealthcareSourceUrl] = useState<string>("")
  const [healthcareStates, setHealthcareStates] = useState<HealthcareApiResponse["states"]>([])
  const [selectedCapacityState, setSelectedCapacityState] = useState<string | null>(null)
  const [healthcareTrend, setHealthcareTrend] = useState<ResponseMetric[]>([])

  const hospitals: Hospital[] = useMemo(
    () => [
      {
        id: "1",
        name: "Guwahati Medical College Hospital",
        region: "Assam",
        beds_available: 45,
        total_beds: 150,
        icu_beds: 8,
        staff_count: 240,
        distance: 0,
        response_time: 0.5,
      },
      {
        id: "2",
        name: "Shillong Civil Hospital",
        region: "Meghalaya",
        beds_available: 18,
        total_beds: 85,
        icu_beds: 3,
        staff_count: 95,
        distance: 85,
        response_time: 1.2,
      },
      {
        id: "3",
        name: "Imphal Tertiary Care Centre",
        region: "Manipur",
        beds_available: 12,
        total_beds: 120,
        icu_beds: 5,
        staff_count: 145,
        distance: 650,
        response_time: 8.5,
      },
      {
        id: "4",
        name: "Agartala Government Medical College",
        region: "Tripura",
        beds_available: 35,
        total_beds: 110,
        icu_beds: 4,
        staff_count: 120,
        distance: 280,
        response_time: 3.2,
      },
      {
        id: "5",
        name: "Itanagar Primary Health Centre",
        region: "Arunachal Pradesh",
        beds_available: 8,
        total_beds: 45,
        icu_beds: 0,
        staff_count: 35,
        distance: 1200,
        response_time: 15.0,
      },
    ],
    []
  )

  const resourceAllocations: ResourceAllocation[] = useMemo(
    () => [
      {
        id: "1",
        type: "medicine",
        item: "Antibiotic Courses (500x)",
        quantity: 500,
        destination: "Assam - Guwahati",
        status: "delivered",
        departure: "2024-12-26",
        estimated_arrival: "2024-12-27",
      },
      {
        id: "2",
        type: "water",
        item: "Clean Water Tankers",
        quantity: 8,
        destination: "Manipur - Imphal",
        status: "in_transit",
        departure: "2024-12-26",
        estimated_arrival: "2024-12-28",
      },
      {
        id: "3",
        type: "team",
        item: "Medical Response Team (12 staff)",
        quantity: 12,
        destination: "Meghalaya - Jaintia Hills",
        status: "dispatched",
        departure: "2024-12-27",
        estimated_arrival: "2024-12-27",
      },
      {
        id: "4",
        type: "medicine",
        item: "IV Fluids (1000L)",
        quantity: 1000,
        destination: "Tripura - Agartala",
        status: "dispatched",
        departure: "2024-12-27",
        estimated_arrival: "2024-12-27",
      },
      {
        id: "5",
        type: "water",
        item: "Water Purification Units",
        quantity: 5,
        destination: "Arunachal Pradesh",
        status: "dispatched",
        departure: "2024-12-27",
        estimated_arrival: "2024-12-29",
      },
    ],
    []
  )

  const addTrendPoint = (states: HealthcareApiResponse["states"], fetchLatencyMs: number) => {
    const bedsAvailable = states.reduce((sum, s) => sum + (typeof s.bedsAvailable === "number" ? s.bedsAvailable : 0), 0)
    const ventilators = states.reduce(
      (sum, s) => sum + (typeof s.ventilatorsAvailable === "number" ? s.ventilatorsAvailable : 0),
      0
    )
    const resources = states.reduce(
      (sum, s) => sum + (typeof s.resourcesDispatched === "number" ? s.resourcesDispatched : 0),
      0
    )
    const contacts = states.reduce((sum, s) => sum + (Array.isArray(s.emergencyContacts) ? s.emergencyContacts.length : 0), 0)

    const casesHandledTotal = states.reduce((sum, s) => sum + (typeof s.casesHandled === "number" ? s.casesHandled : 0), 0)

    const responseTimeValues = states
      .map((s) => (typeof s.avgResponseTimeHours === "number" ? s.avgResponseTimeHours : null))
      .filter((v): v is number => typeof v === "number")
    const avgResponseTimeHours = responseTimeValues.length
      ? responseTimeValues.reduce((sum, v) => sum + v, 0) / responseTimeValues.length
      : undefined

    const point: ResponseMetric = {
      date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      beds_available: bedsAvailable,
      ventilators_available: ventilators,
      resources_dispatched: resources,
      contacts,
      fetch_latency_ms: Math.max(0, Math.round(fetchLatencyMs)),
      ...(casesHandledTotal > 0 ? { cases_handled: casesHandledTotal } : null),
      ...(typeof avgResponseTimeHours === "number" ? { avg_response_time_hours: avgResponseTimeHours } : null),
    }

    setHealthcareTrend((prev) => {
      const next = [...prev, point]
      return next.length > 48 ? next.slice(next.length - 48) : next
    })
  }

  useEffect(() => {
    let active = true
    let timer: any

    const load = async () => {
      setHealthcareLoading(true)
      setHealthcareError(null)
      try {
        const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now()
        const res = await fetch("/api/healthcare", { cache: "no-store" })
        const data = (await res.json().catch(() => null)) as HealthcareApiResponse | null
        const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now()

        if (!res.ok) {
          const msg = [data?.error, data?.message].filter(Boolean).join("\n")
          throw new Error(msg || `Request failed (${res.status})`)
        }

        const states = Array.isArray(data?.states) ? data!.states : []
        if (!active) return

        setHealthcareStates(states)
        setHealthcareUpdatedAt(data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : new Date().toLocaleString())
        setHealthcareSourceUrl(typeof data?.sourceUrl === "string" ? data.sourceUrl : "")
        addTrendPoint(states, t1 - t0)
      } catch (e: any) {
        if (!active) return
        setHealthcareError(e?.message ? String(e.message) : "Failed to load healthcare data.")
      } finally {
        if (!active) return
        setHealthcareLoading(false)
      }
    }

    void load()
    timer = setInterval(load, 5 * 60 * 1000)

    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [])

  const fallbackTotalBeds = hospitals.reduce((sum, h) => sum + h.beds_available, 0)
  const fallbackAvgResponseTime = (hospitals.reduce((sum, h) => sum + h.response_time, 0) / hospitals.length).toFixed(1)

  const liveTotals = useMemo(() => {
    const totalBedsAvailable = healthcareStates.reduce((sum, s) => sum + (typeof s.bedsAvailable === "number" ? s.bedsAvailable : 0), 0)
    const totalVentilators = healthcareStates.reduce(
      (sum, s) => sum + (typeof s.ventilatorsAvailable === "number" ? s.ventilatorsAvailable : 0),
      0
    )
    const totalResources = healthcareStates.reduce(
      (sum, s) => sum + (typeof s.resourcesDispatched === "number" ? s.resourcesDispatched : 0),
      0
    )
    const totalContacts = healthcareStates.reduce(
      (sum, s) => sum + (Array.isArray(s.emergencyContacts) ? s.emergencyContacts.length : 0),
      0
    )
    const totalCasesHandled = healthcareStates.reduce((sum, s) => sum + (typeof s.casesHandled === "number" ? s.casesHandled : 0), 0)

    const responseTimes = healthcareStates
      .map((s) => (typeof s.avgResponseTimeHours === "number" ? s.avgResponseTimeHours : null))
      .filter((v): v is number => typeof v === "number")
    const avgResponseTimeHours = responseTimes.length ? responseTimes.reduce((sum, v) => sum + v, 0) / responseTimes.length : undefined

    return { totalBedsAvailable, totalVentilators, totalResources, totalContacts, totalCasesHandled, avgResponseTimeHours }
  }, [healthcareStates])

  const capacityCriticalCount = useMemo(() => {
    if (healthcareStates.length > 0) {
      return healthcareStates.filter((s) => {
        if (typeof s.bedsAvailable !== "number") return false
        if (typeof s.totalBeds !== "number" || s.totalBeds <= 0) return false
        return getCapacityStatus(s.bedsAvailable, s.totalBeds) === "Critical"
      }).length
    }
    return hospitals.filter((h) => getCapacityStatus(h.beds_available, h.total_beds) === "Critical").length
  }, [healthcareStates, hospitals])

  const selectedStateLive = useMemo(() => {
    if (!selectedCapacityState) return null
    return healthcareStates.find((s) => s.state === selectedCapacityState) ?? null
  }, [healthcareStates, selectedCapacityState])

  const hospitalsForSelectedState = useMemo(() => {
    if (!selectedCapacityState) return []

    const live = selectedStateLive?.hospitals
    if (Array.isArray(live) && live.length > 0) {
      return live.map((h, idx) => ({
        id: `${selectedCapacityState}-${idx}`,
        name: h.name,
        region: selectedCapacityState,
        beds_available: typeof h.bedsAvailable === "number" ? h.bedsAvailable : 0,
        total_beds: typeof h.totalBeds === "number" ? h.totalBeds : 0,
      }))
    }

    return hospitals
      .filter((h) => h.region === selectedCapacityState)
      .map((h) => ({ id: h.id, name: h.name, region: h.region, beds_available: h.beds_available, total_beds: h.total_beds }))
  }, [hospitals, selectedCapacityState, selectedStateLive])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Ambulance className="w-8 h-8" />
          {t("healthcare.title")}
        </h1>
        <p className="text-muted-foreground mt-2">{t("healthcare.subtitle")}</p>
        <p className="text-xs text-muted-foreground mt-2">Last updated: {healthcareUpdatedAt || "—"} • Polling: 5 min</p>
        {healthcareSourceUrl ? (
          <p className="text-xs text-muted-foreground mt-1">
            Source:{" "}
            <a href={healthcareSourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {healthcareSourceUrl}
            </a>
          </p>
        ) : null}
      </div>

      {healthcareError ? (
        <Alert className="border-yellow-500/40 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200">
            {healthcareError}
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => location.reload()}>
                Reload
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {capacityCriticalCount > 0 ? (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <strong>Capacity Alert:</strong> {capacityCriticalCount} hospital(s) approaching maximum capacity.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Beds Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {healthcareStates.length ? liveTotals.totalBedsAvailable : fallbackTotalBeds}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Resources Dispatched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{healthcareStates.length ? liveTotals.totalResources : 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{healthcareStates.length ? liveTotals.totalContacts : 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {typeof liveTotals.avgResponseTimeHours === "number" ? `${liveTotals.avgResponseTimeHours.toFixed(1)}h` : `${fallbackAvgResponseTime}h`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="capacity" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="trend">Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="capacity" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>State Capacity</CardTitle>
              <CardDescription>Click a state to view hospitals and emergency contacts.</CardDescription>
            </CardHeader>
            <CardContent>
              {healthcareStates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No live healthcare feed available. Showing limited fallback hospitals.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {healthcareStates.map((s) => {
                    const beds = typeof s.bedsAvailable === "number" ? s.bedsAvailable : null
                    const total = typeof s.totalBeds === "number" ? s.totalBeds : null
                    const status = beds !== null && total !== null ? getCapacityStatus(beds, total) : "Adequate"
                    return (
                      <button
                        key={s.state}
                        onClick={() => setSelectedCapacityState(s.state)}
                        className={`text-left rounded-lg border border-border p-3 hover:bg-accent/10 transition-colors ${selectedCapacityState === s.state ? "bg-accent/10" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-foreground">{s.state}</div>
                          <Badge variant="outline" className={status === "Critical" ? "border-red-500/30 text-red-300" : status === "Strained" ? "border-yellow-500/30 text-yellow-300" : "border-green-500/30 text-green-300"}>
                            {status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Beds: {beds ?? "—"} / {total ?? "—"}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedCapacityState ? (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{selectedCapacityState}</div>
                      <div className="text-sm text-muted-foreground">Hospitals and contacts</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedCapacityState(null)}>
                      Clear
                    </Button>
                  </div>

                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-base">Hospitals</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {hospitalsForSelectedState.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No hospitals available for this state.</div>
                      ) : (
                        hospitalsForSelectedState.map((h) => (
                          <div key={h.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">{h.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Beds: {h.beds_available} / {h.total_beds || "—"}
                              </div>
                            </div>
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              {h.total_beds ? getCapacityStatus(h.beds_available, h.total_beds) : "—"}
                            </Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-base">Emergency Contacts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(selectedStateLive?.emergencyContacts ?? []).length === 0 ? (
                        <div className="text-sm text-muted-foreground">No contacts listed.</div>
                      ) : (
                        (selectedStateLive?.emergencyContacts ?? []).map((c, idx) => (
                          <div key={`${c.phone}-${idx}`} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="text-sm text-foreground">{c.label}</div>
                            <div className="text-sm text-muted-foreground">{c.phone}</div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Resource Allocation</CardTitle>
              <CardDescription>Operational dispatch list (fallback demo data).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resourceAllocations.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{r.item}</div>
                    <div className="text-xs text-muted-foreground">{r.destination}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(r.status)}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Live Trend</CardTitle>
              <CardDescription>Recent snapshots (from polling).</CardDescription>
            </CardHeader>
            <CardContent>
              {healthcareTrend.length < 2 ? (
                <div className="text-sm text-muted-foreground">Trend will appear after a few polls.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={healthcareTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                    <Line type="monotone" dataKey="beds_available" name="Beds" stroke="oklch(0.6 0.2 270)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ventilators_available" name="Ventilators" stroke="oklch(0.55 0.18 20)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="resources_dispatched" name="Resources" stroke="oklch(0.72 0.17 145)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {healthcareLoading ? (
                <div className="mt-3 text-xs text-muted-foreground">Loading…</div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
