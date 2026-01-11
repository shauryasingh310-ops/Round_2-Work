"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { historicalStorage, HistoricalData } from "@/lib/storage"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface HistoricalTrendsProps {
  state?: string
  days?: number
}

export function HistoricalTrends({ state, days = 30 }: HistoricalTrendsProps) {
  const [trendData, setTrendData] = useState<HistoricalData[]>([])
  const [trend, setTrend] = useState<"up" | "down" | "stable">("stable")

  useEffect(() => {
    let cancelled = false
    const id = requestAnimationFrame(() => {
      if (cancelled) return

      if (state) {
        const data = historicalStorage.getTrend(state, days)
        setTrendData(data)

        if (data.length >= 2) {
          const first = data[0].riskScore
          const last = data[data.length - 1].riskScore
          const diff = last - first
          if (diff > 5) setTrend("up")
          else if (diff < -5) setTrend("down")
          else setTrend("stable")
        }
        return
      }

      const all = historicalStorage.getAll()
      const recent = all
        .filter((d) => {
          const date = new Date(d.date)
          const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
          return date.getTime() > cutoff
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Group by date and average
      const grouped = recent.reduce((acc, item) => {
        const date = item.date
        if (!acc[date]) {
          acc[date] = { date, total: 0, count: 0 }
        }
        acc[date].total += item.riskScore
        acc[date].count += 1
        return acc
      }, {} as Record<string, { date: string; total: number; count: number }>)

      const averaged = Object.values(grouped).map((g) => ({
        date: g.date,
        state: "Average",
        riskScore: Math.round(g.total / g.count),
        cases: 0,
        environmentalFactors: {
          temp: 0,
          humidity: 0,
          pm25: 0,
          waterQuality: "Unknown",
        },
      }))

      setTrendData(averaged)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [state, days])

  if (trendData.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Historical Trends</CardTitle>
          <CardDescription>No historical data available yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const chartData = trendData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    "Risk Score": d.riskScore,
    Cases: d.cases,
  }))

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const trendColor = trend === "up" ? "text-red-400" : trend === "down" ? "text-green-400" : "text-yellow-400"

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Historical Trends</CardTitle>
            <CardDescription>
              {state ? `${state} - Last ${days} days` : `National Average - Last ${days} days`}
            </CardDescription>
          </div>
          <div className={`flex items-center gap-2 ${trendColor}`}>
            <TrendIcon className="w-5 h-5" />
            <span className="text-sm font-medium capitalize">{trend}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="#888888" fontSize={12} />
            <YAxis stroke="#888888" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Risk Score"
              stroke="oklch(0.6 0.2 270)"
              strokeWidth={2}
              dot={{ fill: "oklch(0.6 0.2 270)", r: 4 }}
            />
            {chartData.some((d) => d.Cases > 0) && (
              <Line
                type="monotone"
                dataKey="Cases"
                stroke="oklch(0.55 0.18 20)"
                strokeWidth={2}
                dot={{ fill: "oklch(0.55 0.18 20)", r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

