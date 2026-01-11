"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { signOut, useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Bell, MapPin, Download, Trash2, Globe } from "lucide-react"
import { preferencesStorage, UserPreferences } from "@/lib/storage"
import { notificationService } from "@/lib/notifications"
import { ALL_STATES } from "@/lib/all-states"
import { LanguageSwitcher } from "@/components/language-switcher"

export function SettingsPage() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const [preferences, setPreferences] = useState<UserPreferences>(preferencesStorage.get())
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const handleToggleNotification = async () => {
    if (notificationPermission === "default") {
      const permission = await notificationService.requestPermission()
      setNotificationPermission(permission)
      if (permission === "granted") {
        preferencesStorage.save({ notificationsEnabled: true })
        setPreferences(preferencesStorage.get())
      }
    } else {
      const newValue = !preferences.notificationsEnabled
      preferencesStorage.save({ notificationsEnabled: newValue })
      setPreferences(preferencesStorage.get())
    }
  }

  const handleToggleThreshold = (riskLevel: "Low" | "Medium" | "High" | "Critical") => {
    const updated = preferences.alertThresholds.map((t) =>
      t.riskLevel === riskLevel ? { ...t, enabled: !t.enabled } : t
    )
    preferencesStorage.save({ alertThresholds: updated })
    setPreferences(preferencesStorage.get())
  }

  const handleAddFavorite = (location: string) => {
    preferencesStorage.addFavoriteLocation(location)
    setPreferences(preferencesStorage.get())
  }

  const handleRemoveFavorite = (location: string) => {
    preferencesStorage.removeFavoriteLocation(location)
    setPreferences(preferencesStorage.get())
  }

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all stored data? This cannot be undone.")) {
      localStorage.clear()
      window.location.reload()
    }
  }

  const handleExportData = async () => {
    const { reportStorage, historicalStorage } = await import("@/lib/storage")
    const data = {
      preferences: preferencesStorage.get(),
      reports: reportStorage.getAll(),
      historical: historicalStorage.getAll(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `epiguard_backup_${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Settings className="w-8 h-8" />
              {t("settings.title")}
            </h1>
            <p className="text-muted-foreground mt-2">{t("settings.subtitle")}</p>
            {session?.user?.email && (
              <p className="text-xs text-muted-foreground mt-1">Signed in as {session.user.email}</p>
            )}
          </div>

          {session ? (
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
              className="shrink-0"
            >
              Sign out
            </Button>
          ) : (
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Language Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t("settings.language") || "Language"}
          </CardTitle>
          <CardDescription suppressHydrationWarning>
            {t("settings.selectLanguage") || "Choose your preferred language for the application"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-3" suppressHydrationWarning>
              {t("settings.currentLanguage") || "Current Language"}
            </label>
            <div className="flex items-start">
              <LanguageSwitcher />
            </div>
          </div>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            {t("settings.languageNote") || "Your language preference will be saved and applied automatically when you reopen the application."}
          </p>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t("settings.notifications")}
          </CardTitle>
          <CardDescription>{t("settings.configureAlerts")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.browserNotifications")}</p>
              <p className="text-sm text-muted-foreground">
                {notificationPermission === "granted"
                  ? t("settings.notificationsEnabled")
                  : notificationPermission === "denied"
                    ? t("settings.notificationsBlocked")
                    : t("settings.clickToEnable")}
              </p>
            </div>
            <Button
              variant={preferences.notificationsEnabled ? "default" : "outline"}
              onClick={handleToggleNotification}
              disabled={notificationPermission === "denied"}
            >
              {preferences.notificationsEnabled ? t("common.enabled") : t("common.enable")}
            </Button>
          </div>

          <div className="space-y-3">
            <p className="font-medium">{t("settings.alertThresholds")}</p>
            <p className="text-sm text-muted-foreground">
              {t("settings.chooseRiskLevels")}
            </p>
            {preferences.alertThresholds.map((threshold) => (
              <div key={threshold.riskLevel} className="flex items-center justify-between p-3 bg-background rounded border border-border">
                <div>
                  <p className="font-medium">{t(`settings.${threshold.riskLevel.toLowerCase()}Risk`)}</p>
                  <p className="text-xs text-muted-foreground">
                    {threshold.riskLevel === "Critical"
                      ? t("settings.immediateAlerts")
                      : threshold.riskLevel === "High"
                        ? t("settings.alertsForHighRisk")
                        : threshold.riskLevel === "Medium"
                          ? t("settings.alertsForMediumRisk")
                          : t("settings.alertsForLowRisk")}
                  </p>
                </div>
                <Button
                  variant={threshold.enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggleThreshold(threshold.riskLevel)}
                >
                  {threshold.enabled ? t("common.enabled") : t("common.disabled")}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Favorite Locations */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Favorite Locations
          </CardTitle>
          <CardDescription>Quick access to frequently monitored locations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferences.favoriteLocations.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {preferences.favoriteLocations.map((location) => (
                <Badge
                  key={location}
                  variant="outline"
                  className="flex items-center gap-2 px-3 py-1"
                >
                  {location}
                  <button
                    onClick={() => handleRemoveFavorite(location)}
                    className="hover:text-red-400"
                    aria-label={`Remove ${location} from favorites`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No favorite locations added yet.</p>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Add Location</label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddFavorite(e.target.value)
                  e.target.value = ""
                }
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
            >
              <option value="">-- Select a location --</option>
              {ALL_STATES.filter((s) => !preferences.favoriteLocations.includes(s)).map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Data Management
          </CardTitle>
          <CardDescription>Export or clear your stored data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportData} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export All Data
            </Button>
            <Button
              variant="outline"
              onClick={handleClearData}
              className="flex items-center gap-2 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export your data as a backup or clear all stored information including reports, preferences, and
            historical data.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

