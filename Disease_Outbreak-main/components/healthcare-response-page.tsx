"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertTriangle, Ambulance, Clock, CheckCircle2, Truck, Phone } from "lucide-react"

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
  response_time: number
  cases_handled: number
  interventions: number
}

export function HealthcareResponsePage() {
  const hospitals: Hospital[] = [
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
  ]

  const resourceAllocations: ResourceAllocation[] = [
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
  ]

  const responseMetrics: ResponseMetric[] = [
    { date: "Dec 19", response_time: 3.2, cases_handled: 45, interventions: 12 },
    { date: "Dec 20", response_time: 3.1, cases_handled: 52, interventions: 15 },
    { date: "Dec 21", response_time: 2.9, cases_handled: 68, interventions: 18 },
    { date: "Dec 22", response_time: 2.5, cases_handled: 87, interventions: 22 },
    { date: "Dec 23", response_time: 2.2, cases_handled: 102, interventions: 28 },
    { date: "Dec 24", response_time: 1.8, cases_handled: 125, interventions: 35 },
    { date: "Dec 25", response_time: 1.5, cases_handled: 156, interventions: 42 },
    { date: "Dec 26", response_time: 1.3, cases_handled: 178, interventions: 48 },
    { date: "Dec 27", response_time: 1.1, cases_handled: 198, interventions: 56 },
  ]

  const getCapacityStatus = (available: number, total: number) => {
    const percentage = (available / total) * 100
    if (percentage > 40) return "Adequate"
    if (percentage > 20) return "Strained"
    return "Critical"
  }

  const getStatusColor = (status: string) => {
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

  const totalBeds = hospitals.reduce((sum, h) => sum + h.beds_available, 0)
  const avgResponseTime = (hospitals.reduce((sum, h) => sum + h.response_time, 0) / hospitals.length).toFixed(1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Ambulance className="w-8 h-8" />
          Healthcare Response Coordination
        </h1>
        <p className="text-muted-foreground mt-2">Real-time hospital capacity and emergency resource allocation</p>
      </div>

      {/* Critical Alerts */}
      {hospitals.filter((h) => getCapacityStatus(h.beds_available, h.total_beds) === "Critical").length > 0 && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <strong>Capacity Alert:</strong>{" "}
            {hospitals.filter((h) => getCapacityStatus(h.beds_available, h.total_beds) === "Critical").length}{" "}
            hospital(s) approaching maximum capacity. Emergency overflow protocols activated.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Available Beds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{totalBeds}</p>
            <p className="text-xs text-muted-foreground mt-1">Across 5 hospitals</p>
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
            <p className="text-3xl font-bold text-primary">{avgResponseTime}h</p>
            <p className="text-xs text-muted-foreground mt-1">To outbreak location</p>
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
            <p className="text-3xl font-bold text-primary">{resourceAllocations.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active allocations</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Interventions This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">56</p>
            <p className="text-xs text-muted-foreground mt-1">Community interventions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="hospitals" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="hospitals">Hospital Capacity</TabsTrigger>
          <TabsTrigger value="resources">Resource Allocation</TabsTrigger>
          <TabsTrigger value="contacts">Emergency Contacts</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
        </TabsList>

        {/* Hospital Capacity Tab */}
        <TabsContent value="hospitals" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Hospital Capacity Status</CardTitle>
              <CardDescription>Real-time bed availability and staffing levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hospitals.map((hospital) => {
                  const capacityStatus = getCapacityStatus(hospital.beds_available, hospital.total_beds)
                  const occupancy = (
                    ((hospital.total_beds - hospital.beds_available) / hospital.total_beds) *
                    100
                  ).toFixed(0)
                  return (
                    <div key={hospital.id} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{hospital.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {hospital.region} • {hospital.distance}km from incident
                          </p>
                        </div>
                        <Badge
                          className={`${capacityStatus === "Critical" ? "bg-red-500/30 text-red-300" : capacityStatus === "Strained" ? "bg-yellow-500/30 text-yellow-300" : "bg-green-500/30 text-green-300"}`}
                        >
                          {capacityStatus}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">General Beds</p>
                          <p className="font-semibold">
                            {hospital.beds_available}/{hospital.total_beds}
                          </p>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                            <div
                              className="bg-primary h-1.5 rounded-full"
                              style={{
                                width: `${(hospital.beds_available / hospital.total_beds) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">ICU Beds</p>
                          <p className="font-semibold text-primary">{hospital.icu_beds}</p>
                          <p className="text-xs text-muted-foreground">Available</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Staff</p>
                          <p className="font-semibold">{hospital.staff_count}</p>
                          <p className="text-xs text-muted-foreground">Personnel</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Response</p>
                          <p className="font-semibold text-primary">{hospital.response_time}h</p>
                          <p className="text-xs text-muted-foreground">Arrival time</p>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{occupancy}%</span> occupied
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Allocation Tab */}
        <TabsContent value="resources" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Emergency Resource Allocation</CardTitle>
              <CardDescription>Tracking medicines, water, and medical teams dispatch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resourceAllocations.map((resource) => (
                <div key={resource.id} className={`p-4 rounded-lg border ${getStatusColor(resource.status)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {resource.type === "medicine" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : resource.type === "water" ? (
                          <Truck className="w-4 h-4" />
                        ) : (
                          <Ambulance className="w-4 h-4" />
                        )}
                        {resource.item}
                      </h4>
                      <p className="text-sm text-muted-foreground">To: {resource.destination}</p>
                    </div>
                    <Badge className="bg-background/50">
                      {resource.quantity} {resource.type === "team" ? "staff" : "units"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Departed</p>
                      <p className="font-medium">{resource.departure}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">ETA</p>
                      <p className="font-medium">{resource.estimated_arrival}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <p className="font-medium capitalize">{resource.status.replace("_", " ")}</p>
                    </div>
                  </div>

                  {resource.status === "in_transit" && (
                    <div className="mt-3 w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: "65%" }} />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hospitals.map((hospital) => (
              <Card key={hospital.id} className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">{hospital.name}</CardTitle>
                  <CardDescription>{hospital.region}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Emergency Hotline</p>
                    <p className="text-lg font-semibold flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4" />
                      +91 (Placeholder)
                    </p>
                  </div>
                  <div className="bg-background rounded p-3 border border-border text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Director:</span> Dr. Name
                    </p>
                    <p>
                      <span className="text-muted-foreground">Epidemic Officer:</span> Name
                    </p>
                    <p>
                      <span className="text-muted-foreground">State Hotline:</span> 1800-XXX-XXXX
                    </p>
                  </div>
                  <Button variant="outline" className="w-full bg-transparent">
                    View Full Contact Info
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Response Performance Trend</CardTitle>
              <CardDescription>Response time improvement and intervention scaling</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={responseMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
                  <XAxis dataKey="date" stroke="oklch(0.7 0 0)" />
                  <YAxis stroke="oklch(0.7 0 0)" yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" stroke="oklch(0.7 0 0)" />
                  <Tooltip contentStyle={{ backgroundColor: "oklch(0.12 0 0)", border: "1px solid oklch(0.2 0 0)" }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="response_time"
                    stroke="oklch(0.5 0.15 200)"
                    strokeWidth={2}
                    name="Avg Response Time (hours)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cases_handled"
                    stroke="oklch(0.55 0.18 20)"
                    strokeWidth={2}
                    name="Cases Handled"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Weekly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-background rounded border border-border text-center">
                  <p className="text-2xl font-bold text-primary">1.1h</p>
                  <p className="text-xs text-muted-foreground mt-1">Avg Response Time</p>
                </div>
                <div className="p-3 bg-background rounded border border-border text-center">
                  <p className="text-2xl font-bold text-primary">198</p>
                  <p className="text-xs text-muted-foreground mt-1">Cases Handled</p>
                </div>
                <div className="p-3 bg-background rounded border border-border text-center">
                  <p className="text-2xl font-bold text-primary">56</p>
                  <p className="text-xs text-muted-foreground mt-1">Community Interventions</p>
                </div>
                <div className="p-3 bg-background rounded border border-border text-center">
                  <p className="text-2xl font-bold text-primary">89%</p>
                  <p className="text-xs text-muted-foreground mt-1">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
