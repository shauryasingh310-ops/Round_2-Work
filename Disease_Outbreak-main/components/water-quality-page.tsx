"use client"
import { ALL_STATES } from "@/lib/all-states"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertTriangle, Droplet, MapPin } from "lucide-react"

interface WaterSource {
  id: string
  name: string
  type: "river" | "well" | "tap" | "reservoir"
  region: string
  ph_level: number
  bacterial_count: number
  contamination_level: "safe" | "warning" | "danger"
  last_tested: string
  quality_score: number
}

interface ContaminationEvent {
  id: string
  source: string
  region: string
  date: string
  contaminant: string
  severity: "low" | "medium" | "high" | "critical"
  health_risk: string
}

export function WaterQualityPage() {
  const waterSources: WaterSource[] = [
    {
      id: "1",
      name: "Brahmaputra River (Guwahati)",
      type: "river",
      region: "Assam",
      ph_level: 7.2,
      bacterial_count: 2800,
      contamination_level: "danger",
      last_tested: "2024-12-27",
      quality_score: 35,
    },
    {
      id: "2",
      name: "Ganges River (Varanasi)",
      type: "river",
      region: "Uttar Pradesh",
      ph_level: 6.9,
      bacterial_count: 3200,
      contamination_level: "danger",
      last_tested: "2024-12-27",
      quality_score: 28,
    },
    {
      id: "3",
      name: "Yamuna River (Delhi)",
      type: "river",
      region: "Delhi",
      ph_level: 7.3,
      bacterial_count: 2950,
      contamination_level: "danger",
      last_tested: "2024-12-27",
      quality_score: 32,
    },
    {
      id: "4",
      name: "Godavari River (Telangana)",
      type: "river",
      region: "Telangana",
      ph_level: 7.1,
      bacterial_count: 1800,
      contamination_level: "warning",
      last_tested: "2024-12-27",
      quality_score: 58,
    },
    {
      id: "5",
      name: "Jaintia Hills Public Well",
      type: "well",
      region: "Meghalaya",
      ph_level: 6.8,
      bacterial_count: 450,
      contamination_level: "warning",
      last_tested: "2024-12-27",
      quality_score: 68,
    },
    {
      id: "6",
      name: "Chennai Municipal Tap",
      type: "tap",
      region: "Tamil Nadu",
      ph_level: 7.0,
      bacterial_count: 180,
      contamination_level: "safe",
      last_tested: "2024-12-27",
      quality_score: 86,
    },
    {
      id: "7",
      name: "Imphal City Well System",
      type: "well",
      region: "Manipur",
      ph_level: 6.5,
      bacterial_count: 1950,
      contamination_level: "danger",
      last_tested: "2024-12-27",
      quality_score: 42,
    },
    {
      id: "8",
      name: "Narmada Reservoir (Madhya Pradesh)",
      type: "reservoir",
      region: "Madhya Pradesh",
      ph_level: 7.4,
      bacterial_count: 920,
      contamination_level: "warning",
      last_tested: "2024-12-26",
      quality_score: 65,
    },
    {
      id: "9",
      name: "Trivandrum Municipal Water",
      type: "tap",
      region: "Kerala",
      ph_level: 6.9,
      bacterial_count: 95,
      contamination_level: "safe",
      last_tested: "2024-12-27",
      quality_score: 92,
    },
    {
      id: "10",
      name: "Kolkata Public Well System",
      type: "well",
      region: "West Bengal",
      ph_level: 6.7,
      bacterial_count: 1650,
      contamination_level: "warning",
      last_tested: "2024-12-27",
      quality_score: 54,
    },
    {
      id: "11",
      name: "Mumbai Tap Water System",
      type: "tap",
      region: "Maharashtra",
      ph_level: 7.2,
      bacterial_count: 230,
      contamination_level: "safe",
      last_tested: "2024-12-27",
      quality_score: 84,
    },
    {
      id: "12",
      name: "Bangalore Well Network",
      type: "well",
      region: "Karnataka",
      ph_level: 7.1,
      bacterial_count: 680,
      contamination_level: "warning",
      last_tested: "2024-12-27",
      quality_score: 71,
    },
  ]

  const contaminationEvents: ContaminationEvent[] = [
    {
      id: "1",
      source: "Brahmaputra River (Guwahati)",
      region: "Assam",
      date: "2024-12-27",
      contaminant: "E. coli",
      severity: "critical",
      health_risk: "Acute diarrhea, cholera transmission",
    },
    {
      id: "2",
      source: "Ganges River (Varanasi)",
      region: "Uttar Pradesh",
      date: "2024-12-27",
      contaminant: "Vibrio cholerae",
      severity: "critical",
      health_risk: "Cholera outbreak risk",
    },
    {
      id: "3",
      source: "Imphal City Well System",
      region: "Manipur",
      date: "2024-12-26",
      contaminant: "Vibrio cholerae",
      severity: "high",
      health_risk: "Cholera outbreak risk",
    },
    {
      id: "4",
      source: "Yamuna River (Delhi)",
      region: "Delhi",
      date: "2024-12-26",
      contaminant: "Salmonella typhi",
      severity: "high",
      health_risk: "Typhoid infection",
    },
    {
      id: "5",
      source: "Jaintia Hills Public Well",
      region: "Meghalaya",
      date: "2024-12-25",
      contaminant: "Salmonella typhi",
      severity: "medium",
      health_risk: "Typhoid infection",
    },
  ]

  const qualityTrendData = [
    { date: "Dec 19", score: 62 },
    { date: "Dec 20", score: 58 },
    { date: "Dec 21", score: 54 },
    { date: "Dec 22", score: 50 },
    { date: "Dec 23", score: 46 },
    { date: "Dec 24", score: 42 },
    { date: "Dec 25", score: 39 },
    { date: "Dec 26", score: 36 },
    { date: "Dec 27", score: 34 },
  ]

  const phDistributionData = waterSources.map((source) => ({
    name: source.name.split("(")[0].trim().substring(0, 15),
    ph: source.ph_level,
  }))

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

  const dangerSources = waterSources.filter((s) => s.contamination_level === "danger")
  const avgQualityScore = Math.round(waterSources.reduce((sum, s) => sum + s.quality_score, 0) / waterSources.length)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Droplet className="w-8 h-8" />
          Water Quality Monitoring - All India
        </h1>
        <p className="text-muted-foreground mt-2">Real-time contamination tracking and quality assessment</p>
      </div>

      {/* Critical Alerts */}
      {dangerSources.length > 0 && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <strong>Water Safety Alert:</strong> {dangerSources.length} water source(s) showing critical contamination
            levels across India. Immediate action required - boil water advisories recommended.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sources Monitored</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{waterSources.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all India</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{avgQualityScore}%</p>
            <p className="text-xs text-muted-foreground mt-1">Overall water quality</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">{dangerSources.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Danger level contamination</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-400">{contaminationEvents.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="sources">Water Sources</TabsTrigger>
          <TabsTrigger value="contaminants">Contamination Events</TabsTrigger>
          <TabsTrigger value="quality">Quality Trends</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Water Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>All-India Water Source Status</CardTitle>
              <CardDescription>Real-time monitoring of water quality indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {waterSources.map((source) => (
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
                        {source.contamination_level.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">pH Level</p>
                        <p className="font-semibold">{source.ph_level}</p>
                        <p className="text-xs text-muted-foreground">
                          {source.ph_level < 6.5 || source.ph_level > 8.5 ? "Abnormal" : "Normal"}
                        </p>
                      </div>
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">Bacterial Count</p>
                        <p className="font-semibold">{source.bacterial_count}</p>
                        <p className="text-xs text-muted-foreground">CFU/ml</p>
                      </div>
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">Quality Score</p>
                        <p className="font-semibold text-primary">{source.quality_score}%</p>
                        <div className="w-full bg-muted rounded-full h-1 mt-1">
                          <div
                            className="bg-primary h-1 rounded-full"
                            style={{
                              width: `${source.quality_score}%`,
                              backgroundColor:
                                source.quality_score > 75
                                  ? "rgb(34, 197, 94)"
                                  : source.quality_score > 50
                                    ? "rgb(234, 179, 8)"
                                    : "rgb(239, 68, 68)",
                            }}
                          />
                        </div>
                      </div>
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">Last Tested</p>
                        <p className="font-semibold text-xs">{source.last_tested}</p>
                        <p className="text-xs text-muted-foreground">Recently</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contamination Events Tab */}
        <TabsContent value="contaminants" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Recent Contamination Events - All India</CardTitle>
              <CardDescription>Detected contaminants and associated health risks</CardDescription>
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
                      <p className="text-sm font-medium text-muted-foreground">Severity</p>
                      <p className="font-semibold capitalize">{event.severity}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Health Risk</p>
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
              <CardTitle>National Water Quality Trend</CardTitle>
              <CardDescription>Average quality score over past 9 days</CardDescription>
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
              <CardTitle>pH Level Distribution</CardTitle>
              <CardDescription>pH levels across water sources (safe range: 6.5-8.5)</CardDescription>
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
                <CardTitle>Quality Assessment by Region</CardTitle>
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
                <CardTitle>National Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                  <p className="font-medium text-sm text-red-300">Critical Priority</p>
                  <p className="text-sm mt-1">
                    Implement boiling water protocols for major rivers (Ganges, Yamuna, Brahmaputra)
                  </p>
                </div>
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded">
                  <p className="font-medium text-sm text-orange-300">High Priority</p>
                  <p className="text-sm mt-1">
                    Deploy water purification systems in major urban centers with high contamination
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                  <p className="font-medium text-sm text-green-300">Positive</p>
                  <p className="text-sm mt-1">Southern and coastal states maintain better water quality standards</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
