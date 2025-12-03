/**
 * Token Economics Page
 *
 * Displays token purchases, spending, revenue, and circulation metrics.
 */

"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface TokenData {
  tokensByType: Array<{ type: string; total: number }>
  dailyTokens: Array<{ date: string; purchased: number; spent: number }>
  revenue: {
    total: number
  }
  circulation: {
    total: number
    average: number
  }
  regenerationCount: number
  packageSales: Array<{ name: string; tokens: number; sales: number }>
}

export default function TokenEconomicsPage() {
  const [data, setData] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/admin/analytics/tokens")
        if (!response.ok) {
          throw new Error("Failed to fetch token analytics")
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Token Economics</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-neutral-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Token Economics</h1>
        <Card className="p-6">
          <p className="text-red-500">Error: {error || "No data available"}</p>
        </Card>
      </div>
    )
  }

  const totalPurchased = data.tokensByType
    .filter((t) => t.type.startsWith("EARN_"))
    .reduce((sum, t) => sum + t.total, 0)

  const totalSpent = Math.abs(
    data.tokensByType
      .filter((t) => t.type === "SPEND_ENHANCEMENT")
      .reduce((sum, t) => sum + t.total, 0)
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Token Economics</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Token purchase, spending, and revenue metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Total Revenue
          </p>
          <p className="mt-2 text-3xl font-bold">
            ${data.revenue.total.toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-neutral-500">From token sales</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Tokens Purchased
          </p>
          <p className="mt-2 text-3xl font-bold">
            {totalPurchased.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-neutral-500">All time</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Tokens Spent
          </p>
          <p className="mt-2 text-3xl font-bold">
            {totalSpent.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            {((totalSpent / totalPurchased) * 100).toFixed(1)}% utilization
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Avg Tokens/User
          </p>
          <p className="mt-2 text-3xl font-bold">
            {data.circulation.average.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            {data.circulation.total.toLocaleString()} in circulation
          </p>
        </Card>
      </div>

      {/* Daily Tokens Chart */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">
          Token Activity (Last 30 Days)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.dailyTokens}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value)
                return `${date.getMonth() + 1}/${date.getDate()}`
              }}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => {
                const date = new Date(value as string)
                return date.toLocaleDateString()
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="purchased"
              stroke="#10b981"
              name="Purchased"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="spent"
              stroke="#ef4444"
              name="Spent"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Token Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Token Sources</h2>
          <div className="space-y-3">
            {data.tokensByType
              .filter((t) => t.type.startsWith("EARN_"))
              .map((item) => {
                const percentage = (item.total / totalPurchased) * 100
                return (
                  <div key={item.type}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize">
                        {item.type.replace("EARN_", "").replace("_", " ").toLowerCase()}
                      </span>
                      <span className="font-medium">
                        {item.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Package Sales</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.packageSales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Additional Stats */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Additional Statistics</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Token Regenerations
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {data.regenerationCount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Average Purchase Value
            </p>
            <p className="mt-1 text-2xl font-semibold">
              ${(data.revenue.total / (data.packageSales.reduce((sum, p) => sum + p.sales, 0) || 1)).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Burn Rate
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {((totalSpent / totalPurchased) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
