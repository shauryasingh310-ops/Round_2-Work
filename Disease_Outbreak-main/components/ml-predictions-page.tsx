"use client"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { ALL_STATES } from "@/lib/all-states"
import {
  MOCK_DISEASE_DATA,
  MOCK_DEMOGRAPHIC_DATA,
  MOCK_SEASONAL_INSIGHTS,
  MOCK_VULNERABLE_DEMOGRAPHICS
} from "../lib/mock-disease-data";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  BarChart,
  Bar,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  XAxis,
} from "recharts"
// (Removed duplicate and misplaced code)
import { AlertTriangle, Brain, TrendingUp, BarChart3 } from "lucide-react"

interface MLModel {
  name: string
  accuracy: number
  features_used: string[]
  last_trained: string
  predictions_this_week: number
}

interface RiskScoring {
  region: string
  disease: string
  baseline_risk: number
  current_risk: number
  trend: "increasing" | "stable" | "decreasing"
  days_to_peak: number
  confidence: number
}

interface FeatureImportance {
  feature: string
  importance: number
}

export function MLPredictionsPage() {
  const { t } = useTranslation()
  // --- Real-Time AI Analysis State ---
  const [aiResult, setAIResult] = useState<string>("");
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");

  function getTopRiskForState(stateName: string): RiskScoring | null {
    const candidates = riskScores.filter((r) => r.region === stateName);
    if (candidates.length === 0) return null;
    return candidates.slice().sort((a, b) => b.current_risk - a.current_risk)[0];
  }

  async function handleAnalyze() {
    setAILoading(true);
    setAIError("");
    setAIResult("");
    try {
      const region = selectedState || "";
      const topRisk = region ? getTopRiskForState(region) : null;
      const disease = topRisk?.disease || "Unknown";
      const risk = typeof topRisk?.current_risk === 'number' ? topRisk.current_risk : undefined;
      const trend = topRisk?.trend || "stable";

      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          disease,
          risk,
          trend,
        }),
      });

      const data = await res.json().catch(() => null) as any;
      if (!res.ok) {
        const parts = [data?.error, data?.message, data?.retryAfter ? `Retry-After: ${data.retryAfter}` : null]
          .filter(Boolean)
          .map(String);
        throw new Error(parts.length ? parts.join("\n") : `Request failed (${res.status})`);
      }

      setAIResult(data?.analysis || "No response.");
    } catch (err: any) {
      setAIError(err.message || "Failed to get a response from the AI provider.");
    } finally {
      setAILoading(false);
    }
  }

  // --- Real-time data state ---
  // Map MOCK_DISEASE_DATA to RiskScoring[] shape for static/mock mode
  const [riskScores, setRiskScores] = useState<RiskScoring[]>(
    MOCK_DISEASE_DATA.map((item: any) => ({
      region: item.state,
      disease: item.disease,
      baseline_risk: item.risk,
      current_risk: item.risk,
      trend: "stable",
      days_to_peak: 7,
      confidence: 0.8,
    }))
  );
  const [mlModels, setMLModels] = useState<MLModel[]>([]); // Not in mock data, keep empty
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>([{ feature: "Rainfall", importance: 0.28 }, { feature: "Water Quality", importance: 0.24 }, { feature: "Population Density", importance: 0.18 }, { feature: "Temperature", importance: 0.14 }]);
  const [correlationData, setCorrelationData] = useState<any[]>([{ rainfall: 100, cases: 20 }, { rainfall: 200, cases: 40 }, { rainfall: 300, cases: 60 }, { rainfall: 400, cases: 80 }, { rainfall: 500, cases: 100 }]);
  const [riskTrendData, setRiskTrendData] = useState<any[]>([{ date: "2025-12-24", avg_risk: 0.45 }, { date: "2025-12-25", avg_risk: 0.48 }, { date: "2025-12-26", avg_risk: 0.52 }, { date: "2025-12-27", avg_risk: 0.55 }, { date: "2025-12-28", avg_risk: 0.60 }, { date: "2025-12-29", avg_risk: 0.62 }, { date: "2025-12-30", avg_risk: 0.65 }, { date: "2025-12-31", avg_risk: 0.68 }, { date: "2026-01-01", avg_risk: 0.70 }]);
  const [loadingData, setLoadingData] = useState(false);

  // Helper functions
  const getTrendIcon = (trend: string) => {
    if (trend === "increasing") return "↑";
    if (trend === "decreasing") return "↓";
    return "→";
  };
  const getTrendColor = (trend: string) => {
    if (trend === "increasing") return "text-red-400";
    if (trend === "decreasing") return "text-green-400";
    return "text-yellow-400";
  };

  useEffect(() => {
    // In static/mock mode, skip fetching and use centralized mock data
  }, []);

  useEffect(() => {
    if (selectedState) return;
    const defaultState = riskScores[0]?.region || ALL_STATES[0] || "";
    setSelectedState(defaultState);
  }, [riskScores, selectedState]);

  const criticalPredictions = riskScores.filter((r) => r.current_risk > 0.7);

  if (loadingData) {
    return <div className="flex h-screen items-center justify-center"><div className="text-lg text-muted-foreground">Loading real-time data from OpenRouter and live APIs...</div></div>;
  }

  // Main return block
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Brain className="w-8 h-8" />
          {t("mlPredictions.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          <b>{t("mlPredictions.subtitle")}</b>
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>{t("mlPredictions.analysisTitle")}</CardTitle>
          <CardDescription>{t("mlPredictions.analysisDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("mlPredictions.stateLabel")}</div>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t("mlPredictions.stateLabel")}
            >
              <option value="" disabled>
                {t("mlPredictions.statePlaceholder")}
              </option>
              {ALL_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {selectedState ? (
              <div className="text-sm text-muted-foreground">
                {(() => {
                  const top = getTopRiskForState(selectedState);
                  if (!top) return null;
                  return (
                    <span>
                      {top.disease} • {(top.current_risk * 100).toFixed(0)}% risk
                    </span>
                  );
                })()}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleAnalyze} disabled={aiLoading || !selectedState}>
              {aiLoading ? t("mlPredictions.analyzingButton") : t("mlPredictions.analyzeButton")}
            </Button>
          </div>

          {aiError ? (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>{t("mlPredictions.analysisErrorTitle")}</AlertTitle>
              <AlertDescription>
                <p className="whitespace-pre-wrap">{aiError}</p>
              </AlertDescription>
            </Alert>
          ) : null}

          {aiResult ? (
            <Alert>
              <TrendingUp />
              <AlertTitle>{t("mlPredictions.analysisResultTitle")}</AlertTitle>
              <AlertDescription>
                <p className="whitespace-pre-wrap">{aiResult}</p>
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="risk">
        <TabsList>
          <TabsTrigger value="risk">{t("mlPredictions.riskScores")}</TabsTrigger>
          <TabsTrigger value="features">{t("mlPredictions.featureImportance")}</TabsTrigger>
          <TabsTrigger value="correlation">{t("mlPredictions.correlation")}</TabsTrigger>
        </TabsList>
        {/* Risk Scores Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("mlPredictions.regionalRiskAssessment")}</CardTitle>
              <CardDescription>{t("mlPredictions.currentRiskScores")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {riskScores.map((risk, idx) => {
                const riskIncrease = (((risk.current_risk - risk.baseline_risk) / (risk.baseline_risk || 1)) * 100).toFixed(0);
                return (
                  <div key={idx} className="p-4 bg-background rounded-lg border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">
                          {risk.region} - {risk.disease}
                        </h4>
                        <p className="text-sm text-muted-foreground">Risk increase: {riskIncrease}% from baseline</p>
                      </div>
                      <Badge
                        className={`${risk.current_risk > 0.7 ? "bg-red-500/30 text-red-300" : risk.current_risk > 0.5 ? "bg-orange-500/30 text-orange-300" : "bg-yellow-500/30 text-yellow-300"}`}
                      >
                        <span className={`mr-1 ${getTrendColor(risk.trend)}`}>{getTrendIcon(risk.trend)}</span>
                        {(risk.current_risk * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">Baseline Risk</p>
                        <p className="font-semibold">{(risk.baseline_risk * 100).toFixed(0)}%</p>
                      </div>
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">Peak in</p>
                        <p className="font-semibold">{risk.days_to_peak} days</p>
                      </div>
                      <div className="bg-card p-2 rounded border border-border">
                        <p className="text-muted-foreground text-xs">Confidence</p>
                        <p className="font-semibold">{(risk.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${risk.current_risk * 100}%`,
                          backgroundColor:
                            risk.current_risk > 0.7
                              ? "rgb(239, 68, 68)"
                              : risk.current_risk > 0.5
                                ? "rgb(249, 115, 22)"
                                : "rgb(234, 179, 8)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Feature Importance Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("mlPredictions.featureImportance")} {t("common.analytics")}</CardTitle>
              <CardDescription>{t("mlPredictions.whichFactorsInfluence")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={featureImportance}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
                  <XAxis type="number" stroke="oklch(0.7 0 0)" />
                  <YAxis dataKey="feature" type="category" width={190} stroke="oklch(0.7 0 0)" />
                  <Tooltip contentStyle={{ backgroundColor: "oklch(0.12 0 0)", border: "1px solid oklch(0.2 0 0)" }} />
                  <Bar dataKey="importance" fill="oklch(0.5 0.15 200)" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 space-y-2">
                <p className="text-sm font-medium">Key Insights:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Rainfall is the strongest predictor (28% importance) - monsoon season critical</li>
                  <li>• Water quality metrics (24%) directly correlate with disease outbreaks</li>
                  <li>• Population density (18%) indicates transmission potential</li>
                  <li>• Temperature (14%) affects bacterial growth rates</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Correlation Analysis Tab */}
        <TabsContent value="correlation" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("mlPredictions.rainfallVsCases")}</CardTitle>
              <CardDescription>{t("mlPredictions.strongPositiveCorrelation")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
                  <XAxis dataKey="rainfall" name="Rainfall (mm)" type="number" stroke="oklch(0.7 0 0)" />
                  <YAxis dataKey="cases" name="Cases" type="number" stroke="oklch(0.7 0 0)" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ backgroundColor: "oklch(0.12 0 0)", border: "1px solid oklch(0.2 0 0)" }}
                  />
                  <Scatter name="Rainfall vs Cases" data={correlationData} fill="oklch(0.5 0.15 200)" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("mlPredictions.regionalRiskTrend")}</CardTitle>
              <CardDescription>{t("mlPredictions.averageRegionalRisk")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={riskTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
                  <XAxis dataKey="date" stroke="oklch(0.7 0 0)" />
                  <YAxis stroke="oklch(0.7 0 0)" domain={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: "oklch(0.12 0 0)", border: "1px solid oklch(0.2 0 0)" }} />
                  <Line
                    type="monotone"
                    dataKey="avg_risk"
                    stroke="oklch(0.55 0.18 20)"
                    strokeWidth={2}
                    dot={{ fill: "oklch(0.55 0.18 20)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
