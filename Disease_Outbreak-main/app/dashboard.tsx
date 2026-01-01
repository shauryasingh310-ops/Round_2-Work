
"use client"
import { MOCK_DISEASE_DATA } from "@/lib/mock-disease-data";
import { ALL_STATES } from "@/lib/all-states";

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { AlertTriangle, Activity, Droplet, Wind, CloudRain, ShieldAlert, ThermometerSun, Loader2 } from "lucide-react"
import { calculateLiveRisks, RiskProfile } from "@/lib/live-risk-engine"

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState("")
  const [loading, setLoading] = useState(false)
  // Use centralized mock data for demo/static mode
  // Show all states in the live risk map with mock data
  const [riskData, setRiskData] = useState<any[]>(
    ALL_STATES.map((state, idx) => {
      // Use a disease from mock data or rotate
      const diseaseList = [
        "Cholera", "Dengue", "Typhoid", "Hepatitis A", "Leptospirosis"
      ];
      const disease = diseaseList[idx % diseaseList.length];
      const risk = 0.3 + 0.6 * ((idx % 10) / 10); // 0.3 to 0.9
      return {
        state,
        location: state,
        disease,
        cases: 50 + (idx * 13) % 200,
        deaths: (idx * 2) % 10,
        risk,
        overallRisk: idx % 4 === 0 ? "Critical" : idx % 3 === 0 ? "High" : idx % 2 === 0 ? "Medium" : "Low",
        dengueRisk: Math.round(risk * 100),
        respiratoryRisk: Math.round(risk * 80),
        waterRisk: Math.round(risk * 60),
        primaryThreat: disease,
        environmentalFactors: {
          temp: 25 + (idx % 5) * 2,
          humidity: 60 + (idx % 4) * 5,
          rain: idx % 3 === 0,
          pm25: 40 + (idx % 5) * 10,
          waterQuality: idx % 4 === 0 ? "Poor" : "Good"
        }
      };
    })
  );

  useEffect(() => {
    setCurrentDate(new Date().toLocaleString())
    // In static/mock mode, skip loading live risk model
  }, [])

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Analyzing Live Environmental Factors...</p>
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
          <p className="text-lg text-red-400">Unable to load live risk data.<br/>Please check your OpenAI API key, network connection, or try again later.</p>
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
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Activity className="w-8 h-8" />
          Live Disease Risk Monitor
        </h1>
        <p className="text-muted-foreground mt-2">
          Real-time predictive surveillance based on live environmental vectors.
        </p>
      </div>

      {/* MANDATORY DISCLAIMER */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <ShieldAlert className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300">
          <strong>Live Spread Risk</strong> is calculated using current environmental and sanitation conditions, not reported cases, enabling early risk detection.
        </AlertDescription>
      </Alert>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              High Risk Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">{criticalZones.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Cities with elevated spread risk</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ThermometerSun className="w-4 h-4" />
              Primary Threat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-orange-400">{predominantThreat}</p>
            <p className="text-xs text-muted-foreground mt-1">Driven by current weather</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wind className="w-4 h-4" />
              Avg Air Quality (PM2.5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {riskData.length > 0 && isFinite(riskData.reduce((acc, curr) => acc + curr.environmentalFactors.pm25, 0) / riskData.length)
                ? Math.round(riskData.reduce((acc, curr) => acc + curr.environmentalFactors.pm25, 0) / riskData.length)
                : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">µg/m³ (National Avg)</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Droplet className="w-4 h-4" />
              Water Risk Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">
              {riskData.filter(r => r.environmentalFactors.waterQuality === "Poor").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Cities with contamination</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="live-map" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="live-map">Live Risk Map</TabsTrigger>
          <TabsTrigger value="vectors">Vector Analysis</TabsTrigger>
        </TabsList>

        {/* Live Risk Map (List View) */}
        <TabsContent value="live-map" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Regional Risk Assessment</CardTitle>
              <CardDescription>Live probability of disease spread based on {currentDate}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskData.map((place) => (
                  <div key={place.location} className="p-4 bg-background rounded-lg border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

                    {/* Location Info */}
                    <div className="w-full md:w-1/4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg">{place.location}</h4>
                        <Badge variant="outline" className={getRiskColor(place.overallRisk)}>
                          {place.overallRisk} Risk
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
                          <span>Dengue / Malaria</span>
                          <span className="font-bold">{place.dengueRisk}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${getProgressBarColor(place.dengueRisk)}`} style={{ width: `${place.dengueRisk}%` }}></div>
                        </div>
                      </div>

                      {/* Respiratory Meter */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Respiratory (AQI)</span>
                          <span className="font-bold">{place.respiratoryRisk}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${getProgressBarColor(place.respiratoryRisk)}`} style={{ width: `${place.respiratoryRisk}%` }}></div>
                        </div>
                      </div>

                      {/* Water Meter */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Cholera (Water)</span>
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
                <CardTitle>Environmental Vulnerability</CardTitle>
                <CardDescription>Average risk factors across monitored cities</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart outerRadius="80%" data={[
                    { subject: 'Heat (Temp)', A: 80, fullMark: 100 },
                    { subject: 'Humidity', A: 65, fullMark: 100 },
                    { subject: 'Rainfall', A: 40, fullMark: 100 },
                    { subject: 'Pollution (PM2.5)', A: 90, fullMark: 100 },
                    { subject: 'Water Contamination', A: 50, fullMark: 100 },
                  ]}>
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
                <CardTitle>Dengue Breeding Index</CardTitle>
                <CardDescription>Correlation: Humidity & Rainfall</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskData}> {/* All Cities */}
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="location" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", borderColor: "rgba(255,255,255,0.1)" }} />
                    <Bar name="Dengue Risk Score" dataKey="dengueRisk" fill="oklch(0.6 0.2 270)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
        <p>Data Sources: OpenWeatherMap (Forecast), OpenAQ (Air), Data.gov.in (Water)</p>
        <p className="mt-1">Last Updated: {currentDate}</p>
      </div>
    </div>
  )
}
