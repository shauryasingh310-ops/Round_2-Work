"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, MessageSquare, AlertTriangle, CheckCircle2 } from "lucide-react"

interface CommunityReport {
  id: string
  type: "symptom" | "water" | "sanitation"
  date: string
  region: string
  description: string
  status: "pending" | "verified" | "resolved"
  verified_by?: string
  responses: number
  anonymous: boolean
}

export function CommunityReportingPage() {
  const [formData, setFormData] = useState({
    report_type: "symptom",
    region: "",
    description: "",
  })

  const reports: CommunityReport[] = [
    {
      id: "1",
      type: "water",
      date: "2024-12-27",
      region: "Assam",
      description: "Brown discolored water coming from public tap in Guwahati area",
      status: "verified",
      verified_by: "Health Department",
      responses: 8,
      anonymous: false,
    },
    {
      id: "2",
      type: "symptom",
      date: "2024-12-27",
      region: "Meghalaya",
      description: "Cluster of 15 cases with acute diarrhea in Jaintia Hills village",
      status: "verified",
      verified_by: "ASHA Worker",
      responses: 12,
      anonymous: true,
    },
    {
      id: "3",
      type: "sanitation",
      date: "2024-12-26",
      region: "Manipur",
      description: "Sewage backup near community well - potential contamination risk",
      status: "resolved",
      verified_by: "Municipal Corporation",
      responses: 5,
      anonymous: true,
    },
    {
      id: "4",
      type: "water",
      date: "2024-12-26",
      region: "Tripura",
      description: "Chlorine smell too strong in tap water",
      status: "pending",
      responses: 3,
      anonymous: true,
    },
    {
      id: "5",
      type: "symptom",
      date: "2024-12-25",
      region: "Arunachal Pradesh",
      description: "Fever and vomiting cases in remote settlement",
      status: "verified",
      verified_by: "Health Worker",
      responses: 7,
      anonymous: false,
    },
  ]

  const getReportTypeLabel = (type: string) => {
    const labels = { symptom: "Health Symptom", water: "Water Issue", sanitation: "Sanitation Issue" }
    return labels[type as keyof typeof labels] || type
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "verified":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Report submitted:", formData)
    setFormData({ report_type: "symptom", region: "", description: "" })
  }

  const totalReports = reports.length
  const verifiedReports = reports.filter((r) => r.status === "verified" || r.status === "resolved").length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Users className="w-8 h-8" />
          Community Reporting System
        </h1>
        <p className="text-muted-foreground mt-2">
          Citizen-powered disease and contamination reporting with anonymous options
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{totalReports}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{verifiedReports}</p>
            <p className="text-xs text-muted-foreground mt-1">Confirmation rate</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">2.3h</p>
            <p className="text-xs text-muted-foreground mt-1">Verification time</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Community Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">847</p>
            <p className="text-xs text-muted-foreground mt-1">Active reporters</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="report" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="report">Submit Report</TabsTrigger>
          <TabsTrigger value="recent">Recent Reports</TabsTrigger>
          <TabsTrigger value="verified">Verified Cases</TabsTrigger>
        </TabsList>

        {/* Submit Report Tab */}
        <TabsContent value="report" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Report Issue</CardTitle>
              <CardDescription>
                Help us track disease outbreaks and water quality issues. Choose anonymous reporting for privacy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Report Type</label>
                  <select
                    value={formData.report_type}
                    onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="symptom">Health Symptom (Fever, Diarrhea, etc.)</option>
                    <option value="water">Water Contamination Issue</option>
                    <option value="sanitation">Sanitation Problem</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Region/Village</label>
                  <Input
                    placeholder="Enter your location or village name"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    placeholder="Describe the issue in detail..."
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="anonymous" className="rounded border-border" />
                  <label htmlFor="anonymous" className="text-sm text-muted-foreground cursor-pointer">
                    Report anonymously to protect privacy
                  </label>
                </div>

                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Submit Report
                </Button>
              </form>
            </CardContent>
          </Card>

          <Alert className="border-primary/50 bg-primary/10">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/80">
              Your report helps health authorities prevent disease outbreaks. All information is treated confidentially.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Recent Reports Tab */}
        <TabsContent value="recent" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Recent Community Reports</CardTitle>
              <CardDescription>Latest submissions from community members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="p-4 bg-background rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{getReportTypeLabel(report.type)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {report.region} • {report.date}
                        {report.anonymous && " • Anonymous"}
                      </p>
                    </div>
                    <Badge className={getStatusColor(report.status)}>{report.status}</Badge>
                  </div>
                  <p className="text-sm mb-3">{report.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {report.responses} responses
                    </span>
                    {report.verified_by && <span>Verified by {report.verified_by}</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verified Cases Tab */}
        <TabsContent value="verified" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Verified and Resolved Cases</CardTitle>
              <CardDescription>Community reports confirmed by health authorities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports
                .filter((r) => r.status !== "pending")
                .map((report) => (
                  <div key={report.id} className="p-4 bg-background rounded-lg border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {report.status === "resolved" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-blue-400" />
                          )}
                          {getReportTypeLabel(report.type)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {report.region} • {report.date}
                        </p>
                      </div>
                      <Badge
                        className={
                          report.status === "resolved"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }
                      >
                        {report.status}
                      </Badge>
                    </div>
                    <p className="text-sm mb-3">{report.description}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Verified By</p>
                        <p className="font-medium">{report.verified_by}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Community Responses</p>
                        <p className="font-medium">{report.responses} reports</p>
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
