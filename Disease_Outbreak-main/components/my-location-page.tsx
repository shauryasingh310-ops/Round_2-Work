"use client"

import { useState } from "react"
import { ALL_STATES } from "@/lib/all-states"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, AlertTriangle, Droplet, Activity, Hospital, Users } from "lucide-react"


const STATE_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
  "Andaman & Nicobar": { lat: 11.7401, lng: 92.6586, name: "Andaman & Nicobar" },
  "Andhra Pradesh": { lat: 15.9129, lng: 78.6675, name: "Andhra Pradesh" },
  "Arunachal Pradesh": { lat: 28.218, lng: 94.7278, name: "Arunachal Pradesh" },
  Assam: { lat: 26.2006, lng: 92.9376, name: "Assam" },
  Bihar: { lat: 25.0961, lng: 85.3131, name: "Bihar" },
  Chandigarh: { lat: 30.7333, lng: 76.7794, name: "Chandigarh" },
  Chhattisgarh: { lat: 21.2787, lng: 81.8661, name: "Chhattisgarh" },
  "Dadra & Nagar Haveli": { lat: 20.1809, lng: 73.0505, name: "Dadra & Nagar Haveli" },
  "Daman & Diu": { lat: 20.4283, lng: 72.8479, name: "Daman & Diu" },
  Delhi: { lat: 28.7041, lng: 77.1025, name: "Delhi" },
  Goa: { lat: 15.2993, lng: 73.8243, name: "Goa" },
  Gujarat: { lat: 22.2587, lng: 71.1924, name: "Gujarat" },
  Haryana: { lat: 29.0588, lng: 76.0856, name: "Haryana" },
  "Himachal Pradesh": { lat: 31.7433, lng: 77.1205, name: "Himachal Pradesh" },
  "Jammu & Kashmir": { lat: 33.7782, lng: 76.5769, name: "Jammu & Kashmir" },
  Jharkhand: { lat: 23.6102, lng: 85.2799, name: "Jharkhand" },
  Karnataka: { lat: 15.3173, lng: 75.7139, name: "Karnataka" },
  Kerala: { lat: 10.8505, lng: 76.2711, name: "Kerala" },
  Ladakh: { lat: 34.3526, lng: 77.5771, name: "Ladakh" },
  Lakshadweep: { lat: 10.5667, lng: 72.6417, name: "Lakshadweep" },
  "Madhya Pradesh": { lat: 22.9375, lng: 78.6553, name: "Madhya Pradesh" },
  Maharashtra: { lat: 19.7515, lng: 75.7139, name: "Maharashtra" },
  Manipur: { lat: 24.6637, lng: 93.9063, name: "Manipur" },
  Meghalaya: { lat: 25.467, lng: 91.3662, name: "Meghalaya" },
  Mizoram: { lat: 23.1815, lng: 92.9789, name: "Mizoram" },
  Nagaland: { lat: 26.1584, lng: 94.5624, name: "Nagaland" },
  Odisha: { lat: 20.9517, lng: 85.0985, name: "Odisha" },
  Punjab: { lat: 31.1471, lng: 75.3412, name: "Punjab" },
  Rajasthan: { lat: 27.0238, lng: 74.2179, name: "Rajasthan" },
  Sikkim: { lat: 27.533, lng: 88.5122, name: "Sikkim" },
  "Tamil Nadu": { lat: 11.1271, lng: 78.6569, name: "Tamil Nadu" },
  Telangana: { lat: 18.1124, lng: 79.0193, name: "Telangana" },
  Tripura: { lat: 23.4408, lng: 91.9882, name: "Tripura" },
  "Uttar Pradesh": { lat: 26.8467, lng: 80.9462, name: "Uttar Pradesh" },
  Uttarakhand: { lat: 30.0668, lng: 79.0193, name: "Uttarakhand" },
  "West Bengal": { lat: 24.5891, lng: 88.2679, name: "West Bengal" },
}

const findNearestState = (userLat: number, userLng: number): string => {
  let nearestState = "Uttar Pradesh"
  let minDistance = Number.POSITIVE_INFINITY

  Object.entries(STATE_COORDINATES).forEach(([stateName, coords]) => {
    // Simple distance calculation using Haversine formula
    const R = 6371 // Earth's radius in km
    const dLat = ((coords.lat - userLat) * Math.PI) / 180
    const dLng = ((coords.lng - userLng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLat * Math.PI) / 180) *
        Math.cos((coords.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    if (distance < minDistance) {
      minDistance = distance
      nearestState = stateName
    }
  })

  return nearestState
}

export function MyLocationPage() {
  const [selectedState, setSelectedState] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [locError, setLocError] = useState("")
  const [detectedLocation, setDetectedLocation] = useState<{ lat: number; lng: number } | null>(null)

  // All India disease data for filtering by state
  const allDiseaseData = [
    { region: "Uttar Pradesh", cases: 445, severity: "high", hospital_capacity: 62, population: 199812341 },
    { region: "Maharashtra", cases: 412, severity: "high", hospital_capacity: 68, population: 112372972 },
    { region: "Bihar", cases: 378, severity: "high", hospital_capacity: 58, population: 103804637 },
    { region: "Assam", cases: 156, severity: "high", hospital_capacity: 65, population: 31205576 },
    { region: "West Bengal", cases: 289, severity: "high", hospital_capacity: 61, population: 91276115 },
    { region: "Madhya Pradesh", cases: 267, severity: "medium", hospital_capacity: 59, population: 72597565 },
    { region: "Rajasthan", cases: 234, severity: "medium", hospital_capacity: 64, population: 68548437 },
    { region: "Karnataka", cases: 201, severity: "medium", hospital_capacity: 71, population: 61130242 },
    { region: "Gujarat", cases: 198, severity: "medium", hospital_capacity: 66, population: 60439692 },
    { region: "Andhra Pradesh", cases: 187, severity: "medium", hospital_capacity: 63, population: 49504530 },
    { region: "Odisha", cases: 178, severity: "medium", hospital_capacity: 60, population: 41974218 },
    { region: "Telangana", cases: 145, severity: "medium", hospital_capacity: 70, population: 35193978 },
    { region: "Punjab", cases: 134, severity: "medium", hospital_capacity: 69, population: 27743338 },
    { region: "Haryana", cases: 123, severity: "low", hospital_capacity: 75, population: 25353081 },
    { region: "Kerala", cases: 89, severity: "low", hospital_capacity: 82, population: 33387677 },
    { region: "Tamil Nadu", cases: 156, severity: "medium", hospital_capacity: 73, population: 72147030 },
    { region: "Jharkhand", cases: 145, severity: "medium", hospital_capacity: 55, population: 32966238 },
    { region: "Meghalaya", cases: 89, severity: "medium", hospital_capacity: 45, population: 2966889 },
    { region: "Himachal Pradesh", cases: 67, severity: "low", hospital_capacity: 78, population: 6856509 },
    { region: "Uttarakhand", cases: 78, severity: "low", hospital_capacity: 74, population: 10086292 },
    { region: "Manipur", cases: 67, severity: "medium", hospital_capacity: 52, population: 2721756 },
    { region: "Tripura", cases: 95, severity: "high", hospital_capacity: 58, population: 3673917 },
    { region: "Arunachal Pradesh", cases: 42, severity: "low", hospital_capacity: 72, population: 1382611 },
    { region: "Nagaland", cases: 34, severity: "low", hospital_capacity: 88, population: 1978502 },
    { region: "Mizoram", cases: 28, severity: "low", hospital_capacity: 80, population: 1097206 },
    { region: "Sikkim", cases: 12, severity: "low", hospital_capacity: 85, population: 610577 },
    { region: "Goa", cases: 45, severity: "low", hospital_capacity: 81, population: 1457723 },
    { region: "Delhi", cases: 98, severity: "low", hospital_capacity: 79, population: 16753235 },
    { region: "Jammu & Kashmir", cases: 56, severity: "low", hospital_capacity: 67, population: 12258882 },
    { region: "Ladakh", cases: 8, severity: "low", hospital_capacity: 72, population: 274289 },
    { region: "Puducherry", cases: 34, severity: "low", hospital_capacity: 76, population: 1244464 },
    { region: "Chandigarh", cases: 23, severity: "low", hospital_capacity: 80, population: 1055450 },
    { region: "Andaman & Nicobar", cases: 5, severity: "low", hospital_capacity: 65, population: 380581 },
    { region: "Dadar & Nagar Haveli", cases: 3, severity: "low", hospital_capacity: 70, population: 342709 },
    { region: "Daman & Diu", cases: 4, severity: "low", hospital_capacity: 71, population: 242911 },
    { region: "Lakshadweep", cases: 1, severity: "low", hospital_capacity: 60, population: 64473 },
  ]

  // All predictions data for filtering by state
  const allPredictions = [
    {
      id: "1",
      region: "Uttar Pradesh",
      disease: "Cholera",
      risk_level: "Critical",
      confidence: 0.92,
      days_ahead: 10,
      contributing_factors: ["Heavy rainfall detected", "Water contamination spike", "High population density"],
    },
    {
      id: "2",
      region: "Bihar",
      disease: "Typhoid",
      risk_level: "High",
      confidence: 0.87,
      days_ahead: 8,
      contributing_factors: ["Increased water bacterial count", "Temperature rise", "Sanitation concerns"],
    },
    {
      id: "3",
      region: "West Bengal",
      disease: "Diarrhea",
      risk_level: "High",
      confidence: 0.84,
      days_ahead: 7,
      contributing_factors: ["Monsoon season", "Population movement"],
    },
    {
      id: "4",
      region: "Maharashtra",
      disease: "Leptospirosis",
      risk_level: "Medium",
      confidence: 0.78,
      days_ahead: 12,
      contributing_factors: ["Pre-monsoon humidity", "Rat population increase"],
    },
  ]

  // Water quality data for state-level filtering
  const allWaterSources = [
    {
      id: "1",
      name: "Brahmaputra River (Guwahati)",
      type: "river" as const,
      region: "Assam",
      ph_level: 7.2,
      bacterial_count: 2800,
      contamination_level: "danger" as const,
      quality_score: 35,
    },
    {
      id: "2",
      name: "Ganges River (Varanasi)",
      type: "river" as const,
      region: "Uttar Pradesh",
      ph_level: 6.9,
      bacterial_count: 3200,
      contamination_level: "danger" as const,
      quality_score: 28,
    },
    {
      id: "3",
      name: "Yamuna River (Delhi)",
      type: "river" as const,
      region: "Delhi",
      ph_level: 7.1,
      bacterial_count: 2950,
      contamination_level: "danger" as const,
      quality_score: 32,
    },
    {
      id: "4",
      name: "Godavari River (Maharashtra)",
      type: "river" as const,
      region: "Maharashtra",
      ph_level: 7.3,
      bacterial_count: 2100,
      contamination_level: "warning" as const,
      quality_score: 55,
    },
  ]

  // Hospital data for state-level filtering
  const allHospitals = [
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
      name: "AIIMS Patna",
      region: "Bihar",
      beds_available: 65,
      total_beds: 250,
      icu_beds: 12,
      staff_count: 380,
      distance: 0,
      response_time: 0.75,
    },
    {
      id: "3",
      name: "AIIMS Delhi",
      region: "Delhi",
      beds_available: 85,
      total_beds: 350,
      icu_beds: 25,
      staff_count: 520,
      distance: 0,
      response_time: 0.25,
    },
  ]

  // Filter data by selected state
  const locationData = allDiseaseData.find((d) => d.region === selectedState)
  // If no data for selected state, show all data as fallback
  const locationPredictions = allPredictions.filter((p) => p.region === selectedState)
    .length > 0 ? allPredictions.filter((p) => p.region === selectedState) : allPredictions;
  const locationWaterSources = allWaterSources.filter((w) => w.region === selectedState)
    .length > 0 ? allWaterSources.filter((w) => w.region === selectedState) : allWaterSources;
  const locationHospitals = allHospitals.filter((h) => h.region === selectedState)
    .length > 0 ? allHospitals.filter((h) => h.region === selectedState) : allHospitals;

  const detectLocation = () => {
    setLoading(true)
    setLocError("")
    console.log("[v0] Starting geolocation detection")

    if (!("geolocation" in navigator)) {
      setLocError("Geolocation not supported by your browser. Please select your state manually.")
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("[v0] Geolocation successful:", position.coords)
        const { latitude, longitude } = position.coords
        setDetectedLocation({ lat: latitude, lng: longitude })

        const detectedState = findNearestState(latitude, longitude)
        console.log("[v0] User coordinates mapped to state:", detectedState)

        setSelectedState(detectedState)
        setLoading(false)
      },
      (error) => {
        console.log("[v0] Geolocation error:", error.code, error.message)

        let errorMsg = "Unable to detect location. Please select manually."
        if (error.code === 1) {
          errorMsg = "Permission denied. Please enable location access and try again."
        } else if (error.code === 2) {
          errorMsg = "Position unavailable. Please select your state manually."
        } else if (error.code === 3) {
          errorMsg = "Location request timed out. Please select manually or try again."
        }

        setLocError(errorMsg)
        setLoading(false)
      },
      {
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 3600000, // Cache location for 1 hour
      },
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getWaterQualityColor = (level: string) => {
    switch (level) {
      case "danger":
        return "bg-red-500/20 text-red-400"
      case "warning":
        return "bg-yellow-500/20 text-yellow-400"
      case "safe":
        return "bg-green-500/20 text-green-400"
      default:
        return "bg-gray-500/20 text-gray-400"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Critical":
        return "bg-red-500/30 border-red-400"
      case "High":
        return "bg-orange-500/30 border-orange-400"
      case "Medium":
        return "bg-yellow-500/30 border-yellow-400"
      case "Low":
        return "bg-green-500/30 border-green-400"
      default:
        return "bg-gray-500/30 border-gray-400"
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <MapPin className="w-8 h-8" />
          My Location Health Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">Personalized health and water quality information for your area</p>
      </div>

      {/* Location Selection */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Select Your Location</CardTitle>
          <CardDescription>Choose how to identify your location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={detectLocation}
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Activity className="w-4 h-4 mr-2" />
              {loading ? "Detecting..." : "Detect My Location"}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">Or</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Select Your State/Territory</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Choose a state --</option>
              {ALL_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {locError && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">{locError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Location Data Display */}
      {selectedState && locationData ? (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Active Cases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{locationData.cases}</p>
                <p className="text-xs text-muted-foreground mt-1">In {selectedState}</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getSeverityColor(locationData.severity)}>{locationData.severity.toUpperCase()}</Badge>
                <p className="text-xs text-muted-foreground mt-3">Disease severity status</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Hospital className="w-4 h-4" />
                  Hospital Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{locationData.hospital_capacity}%</p>
                <p className="text-xs text-muted-foreground mt-1">Bed availability</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Droplet className="w-4 h-4" />
                  Population
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{(locationData.population / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground mt-1">Total residents</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="water">Water Quality</TabsTrigger>
              <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>{selectedState} - Health Overview</CardTitle>
                  <CardDescription>Current disease and health status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-background rounded-lg border border-border">
                      <h4 className="font-semibold mb-2">Disease Status</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Currently tracking {locationData.cases} active cases across major water-borne diseases
                      </p>
                      <Badge className={getSeverityColor(locationData.severity)}>
                        Severity: {locationData.severity}
                      </Badge>
                    </div>
                    <div className="p-4 bg-background rounded-lg border border-border">
                      <h4 className="font-semibold mb-2">Healthcare Readiness</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Hospital system at {locationData.hospital_capacity}% capacity with available resources
                      </p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${locationData.hospital_capacity}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Predictions Tab */}
            <TabsContent value="predictions" className="space-y-4">
              {locationPredictions.length > 0 ? (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Disease Outbreak Predictions</CardTitle>
                    <CardDescription>ML-based forecasts for {selectedState}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {locationPredictions.map((pred) => (
                      <div key={pred.id} className={`p-4 rounded-lg border ${getRiskColor(pred.risk_level)}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{pred.disease}</h4>
                            <p className="text-sm text-muted-foreground">Prediction in {pred.days_ahead} days</p>
                          </div>
                          <Badge
                            className={`${pred.risk_level === "Critical" ? "bg-red-500/30 text-red-300" : pred.risk_level === "High" ? "bg-orange-500/30 text-orange-300" : "bg-yellow-500/30 text-yellow-300"}`}
                          >
                            {pred.risk_level} Risk
                          </Badge>
                        </div>
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Confidence Score</span>
                            <span className="text-sm text-muted-foreground">{(pred.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${pred.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Contributing Factors:</p>
                          <div className="flex flex-wrap gap-2">
                            {pred.contributing_factors.map((factor, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-background/50 px-3 py-1 rounded-full border border-border"
                              >
                                {factor}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Disease Outbreak Predictions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      No outbreak predictions for {selectedState} in the next 2 weeks.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Water Quality Tab */}
            <TabsContent value="water" className="space-y-4">
              {locationWaterSources.length > 0 ? (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Water Quality Monitoring</CardTitle>
                    <CardDescription>Water sources in {selectedState}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {locationWaterSources.map((source) => (
                      <div key={source.id} className="p-4 bg-background rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{source.name}</h4>
                            <p className="text-sm text-muted-foreground capitalize">{source.type}</p>
                          </div>
                          <Badge className={getWaterQualityColor(source.contamination_level)}>
                            {source.contamination_level}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Quality Score</p>
                            <p className="font-medium">{source.quality_score}/100</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">pH Level</p>
                            <p className="font-medium">{source.ph_level}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Bacterial Count</p>
                            <p className="font-medium">{source.bacterial_count.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Tested</p>
                            <p className="font-medium">Today</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Water Quality Monitoring</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      No water quality data available for {selectedState}.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Hospitals Tab */}
            <TabsContent value="hospitals" className="space-y-4">
              {locationHospitals.length > 0 ? (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Healthcare Facilities</CardTitle>
                    <CardDescription>Major hospitals in {selectedState}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {locationHospitals.map((hospital) => (
                      <div key={hospital.id} className="p-4 bg-background rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{hospital.name}</h4>
                            <p className="text-sm text-muted-foreground">Response time: {hospital.response_time}h</p>
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-400">{hospital.beds_available} beds free</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Beds</p>
                            <p className="font-medium">{hospital.total_beds}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">ICU Beds</p>
                            <p className="font-medium">{hospital.icu_beds}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Staff</p>
                            <p className="font-medium">{hospital.staff_count}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Capacity</p>
                            <p className="font-medium">
                              {Math.round(
                                ((hospital.total_beds - hospital.beds_available) / hospital.total_beds) * 100,
                              )}
                              %
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Healthcare Facilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">No hospital data available for {selectedState}.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>No Location Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Select a location using geolocation or the dropdown above to view personalized health data for your area.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
