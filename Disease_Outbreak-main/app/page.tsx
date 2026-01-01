"use client"

import { useState } from "react"
import { Activity, Droplet, Users, Ambulance, Brain, BarChart3, Menu, X, MapPin, PanelLeft } from "lucide-react"
import Dashboard from "./dashboard"
import { WaterQualityPage } from "@/components/water-quality-page"
import { CommunityReportingPage } from "@/components/community-reporting-page"
import { HealthcareResponsePage } from "@/components/healthcare-response-page"
import { MLPredictionsPage } from "@/components/ml-predictions-page"
import AnalyticsInsightsPage from "@/components/analytics-insights-page"
import { MyLocationPage } from "@/components/my-location-page"

type PageType = "dashboard" | "mylocation" | "water" | "community" | "healthcare" | "ml" | "analytics"

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "mylocation", label: "My Location", icon: MapPin },
    { id: "water", label: "Water Quality", icon: Droplet },
    { id: "community", label: "Community Reports", icon: Users },
    { id: "healthcare", label: "Healthcare Response", icon: Ambulance },
    { id: "ml", label: "ML Predictions", icon: Brain },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ]

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
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-transparent">
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
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="p-4 border-t border-border mt-auto">
            <div className="bg-primary/10 rounded-lg p-4 text-sm whitespace-nowrap">
              <p className="font-medium text-primary mb-2">System Status</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Database: Connected</p>
                <p>ML Models: Active</p>
                <p>Last sync: 2 mins ago</p>
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
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div key={currentPage} className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">{renderPage()}</div>
      </main>
    </div>
  )
}
