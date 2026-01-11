"use client"

import type React from "react"

import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, MessageSquare, AlertTriangle, CheckCircle2, Download, Filter, X } from "lucide-react"
import { reportStorage, detectDuplicateReport, detectSpam, StoredReport } from "@/lib/storage"
import { reportSchema, validateForm } from "@/lib/validation"
import { notificationService } from "@/lib/notifications"
import { exportReports } from "@/lib/export"
import { getAriaLabel, getRole } from "@/lib/accessibility"
import { ALL_STATES } from "@/lib/all-states"

export function CommunityReportingPage() {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    report_type: "symptom" as "symptom" | "water" | "sanitation",
    region: "",
    description: "",
    anonymous: false,
  })
  const [reports, setReports] = useState<StoredReport[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "verified" | "resolved">("all")
  const [filterRegion, setFilterRegion] = useState<string>("all")

  const loadReports = useCallback(() => {
    const storedReports = reportStorage.getAll()
    // Merge with initial mock data if storage is empty
    if (storedReports.length === 0) {
      const mockReports: StoredReport[] = [
        {
          id: "1",
          type: "water",
          date: new Date().toISOString().split("T")[0],
          region: "Assam",
          description: "Brown discolored water coming from public tap in Guwahati area",
          status: "verified",
          verified_by: "Health Department",
          responses: 8,
          anonymous: false,
          createdAt: Date.now() - 86400000,
        },
        {
          id: "2",
          type: "symptom",
          date: new Date().toISOString().split("T")[0],
          region: "Meghalaya",
          description: "Cluster of 15 cases with acute diarrhea in Jaintia Hills village",
          status: "verified",
          verified_by: "ASHA Worker",
          responses: 12,
          anonymous: true,
          createdAt: Date.now() - 86400000,
        },
        {
          id: "3",
          type: "sanitation",
          date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          region: "Manipur",
          description: "Sewage backup near community well - potential contamination risk",
          status: "resolved",
          verified_by: "Municipal Corporation",
          responses: 5,
          anonymous: true,
          createdAt: Date.now() - 172800000,
        },
      ]
      mockReports.forEach((r) => reportStorage.save(r))
      setReports(reportStorage.getAll())
    } else {
      setReports(storedReports)
    }
  }, [])

  // Load reports from storage
  useEffect(() => {
    const id = requestAnimationFrame(() => loadReports())
    return () => cancelAnimationFrame(id)
  }, [loadReports])

  const getReportTypeLabel = (type: string) => {
    const labels = {
      symptom: t("communityReports.healthSymptom"),
      water: t("communityReports.waterIssue"),
      sanitation: t("communityReports.sanitationIssue"),
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    setSubmitSuccess(false)

    // Validate form
    const validation = validateForm(reportSchema, formData)
    if (!validation.success) {
      setFormErrors(validation.errors || {})
      return
    }

    // Check for spam
    if (detectSpam(formData.description)) {
      setFormErrors({ description: "Your report contains inappropriate content. Please revise." })
      return
    }

    // Check for duplicates
    const duplicate = detectDuplicateReport(formData)
    if (duplicate) {
      setFormErrors({
        _general: `A similar report was already submitted recently (${new Date(duplicate.createdAt).toLocaleString()}). Please check if your issue is already reported.`,
      })
      return
    }

    // Save report
    const newReport = reportStorage.save({
      type: formData.report_type,
      region: formData.region,
      description: formData.description,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      responses: 0,
      anonymous: formData.anonymous,
    })

    // Show notification
    if (typeof window !== "undefined" && "Notification" in window) {
      notificationService.showNewReport(newReport.id, formData.region)
    }

    // Reset form
    setFormData({ report_type: "symptom", region: "", description: "", anonymous: false })
    setSubmitSuccess(true)
    loadReports()

    // Clear success message after 3 seconds
    setTimeout(() => setSubmitSuccess(false), 3000)
  }

  const handleExport = () => {
    const reportsToExport = getFilteredReports()
    exportReports(reportsToExport)
  }

  const getFilteredReports = () => {
    let filtered = [...reports]
    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === filterStatus)
    }
    if (filterRegion !== "all") {
      filtered = filtered.filter((r) => r.region === filterRegion)
    }
    return filtered.sort((a, b) => b.createdAt - a.createdAt)
  }

  const totalReports = reports.length
  const verifiedReports = reports.filter((r) => r.status === "verified" || r.status === "resolved").length
  const pendingReports = reports.filter((r) => r.status === "pending").length
  const uniqueRegions = Array.from(new Set(reports.map((r) => r.region)))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Users className="w-8 h-8" />
          {t("communityReports.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("communityReports.subtitle")}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("communityReports.totalReports")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{totalReports}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("communityReports.last7Days")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("communityReports.verifiedReports")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{verifiedReports}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("communityReports.confirmationRate")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("communityReports.avgResponseTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">2.3h</p>
            <p className="text-xs text-muted-foreground mt-1">{t("communityReports.verificationTime")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("communityReports.pendingReports")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">{pendingReports}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("communityReports.awaitingVerification")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="report" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="report">{t("communityReports.submitReport")}</TabsTrigger>
          <TabsTrigger value="recent">{t("communityReports.recentReports")}</TabsTrigger>
          <TabsTrigger value="verified">{t("communityReports.verifiedCases")}</TabsTrigger>
        </TabsList>

        {/* Submit Report Tab */}
        <TabsContent value="report" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("communityReports.reportIssue")}</CardTitle>
              <CardDescription>
                {t("communityReports.helpUsTrack")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" aria-label="Community report submission form">
                {formErrors._general && (
                  <Alert className="border-red-500/50 bg-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-300">{formErrors._general}</AlertDescription>
                  </Alert>
                )}

                {submitSuccess && (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-300">
                      {t("communityReports.reportSubmittedSuccessfully")}
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <label htmlFor="report_type" className="block text-sm font-medium mb-2">
                    {t("communityReports.reportType")} <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="report_type"
                    value={formData.report_type}
                    onChange={(e) => {
                      setFormData({ ...formData, report_type: e.target.value as any })
                      setFormErrors({ ...formErrors, report_type: "" })
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-invalid={!!formErrors.report_type}
                    aria-describedby={formErrors.report_type ? "report_type_error" : undefined}
                  >
                    <option value="symptom">{t("communityReports.healthSymptom")}</option>
                    <option value="water">{t("communityReports.waterContaminationIssue")}</option>
                    <option value="sanitation">{t("communityReports.sanitationProblem")}</option>
                  </select>
                  {formErrors.report_type && (
                    <p id="report_type_error" className="text-xs text-red-400 mt-1" role="alert">
                      {formErrors.report_type}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="region" className="block text-sm font-medium mb-2">
                    {t("communityReports.regionVillage")} <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="region"
                    value={formData.region}
                    onChange={(e) => {
                      setFormData({ ...formData, region: e.target.value })
                      setFormErrors({ ...formErrors, region: "" })
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-invalid={!!formErrors.region}
                    aria-describedby={formErrors.region ? "region_error" : undefined}
                  >
                    <option value="">-- {t("communityReports.selectRegion")} --</option>
                    {ALL_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {formErrors.region && (
                    <p id="region_error" className="text-xs text-red-400 mt-1" role="alert">
                      {formErrors.region}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    {t("communityReports.description")} <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="description"
                    placeholder={t("communityReports.describeIssueDetail")}
                    rows={5}
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value })
                      setFormErrors({ ...formErrors, description: "" })
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-invalid={!!formErrors.description}
                    aria-describedby={formErrors.description ? "description_error" : undefined}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.description.length}/1000 {t("communityReports.characters")}
                  </p>
                  {formErrors.description && (
                    <p id="description_error" className="text-xs text-red-400 mt-1" role="alert">
                      {formErrors.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={formData.anonymous}
                    onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
                    className="rounded border-border"
                    aria-label="Report anonymously"
                  />
                  <label htmlFor="anonymous" className="text-sm text-muted-foreground cursor-pointer">
                    {t("communityReports.submitAnonymously")}
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  aria-label={t("communityReports.submitReport")}
                >
                  {t("communityReports.submitReport")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Alert className="border-primary/50 bg-primary/10">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/80">
              {t("communityReports.reportHelpsAuthorities")}
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Recent Reports Tab */}
        <TabsContent value="recent" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("communityReports.recentCommunityReports")}</CardTitle>
                  <CardDescription>{t("communityReports.latestSubmissions")}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="flex items-center gap-2"
                    aria-label="Export reports to CSV"
                  >
                    <Download className="w-4 h-4" />
                    {t("common.export")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("common.filter")}:</span>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-1.5 bg-background border border-border rounded-md text-sm"
                  aria-label={t("communityReports.filterByStatus")}
                >
                  <option value="all">{t("communityReports.allStatus")}</option>
                  <option value="pending">{t("communityReports.pending")}</option>
                  <option value="verified">{t("communityReports.verified")}</option>
                  <option value="resolved">{t("communityReports.resolved")}</option>
                </select>
                <select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className="px-3 py-1.5 bg-background border border-border rounded-md text-sm"
                  aria-label={t("communityReports.filterByRegion")}
                >
                  <option value="all">{t("communityReports.allRegions")}</option>
                  {uniqueRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                {(filterStatus !== "all" || filterRegion !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterStatus("all")
                      setFilterRegion("all")
                    }}
                    className="flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    {t("common.clear")}
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {getFilteredReports().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t("communityReports.noReportsFound")}</p>
                  </div>
                ) : (
                  getFilteredReports().map((report) => (
                    <div
                      key={report.id}
                      className="p-4 bg-background rounded-lg border border-border"
                      role={getRole("report-card")}
                      aria-label={getAriaLabel("report-card", report.region)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{getReportTypeLabel(report.type)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {report.region} • {new Date(report.date).toLocaleDateString()}
                            {report.anonymous && ` • ${t("communityReports.anonymous")}`}
                          </p>
                        </div>
                        <Badge className={getStatusColor(report.status)}>{report.status}</Badge>
                      </div>
                      <p className="text-sm mb-3">{report.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {report.responses} {t("communityReports.responses")}
                        </span>
                        {report.verified_by && <span>{t("communityReports.verifiedBy")} {report.verified_by}</span>}
                        <span className="text-xs">
                          {t("communityReports.submitted")} {new Date(report.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verified Cases Tab */}
        <TabsContent value="verified" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("communityReports.verifiedAndResolvedCases")}</CardTitle>
              <CardDescription>{t("communityReports.confirmedByAuthorities")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports
                .filter((r) => r.status !== "pending")
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((report) => (
                  <div
                    key={report.id}
                    className="p-4 bg-background rounded-lg border border-border"
                    role={getRole("report-card")}
                    aria-label={getAriaLabel("report-card", report.region)}
                  >
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
