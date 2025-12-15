/**
 * User Analytics Page
 *
 * Displays user registration trends, active users, and auth provider breakdown.
 */

"use client";

import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsData {
  dailyRegistrations: Array<{ date: string; count: number; }>;
  authProviders: Array<{ name: string; count: number; }>;
  activeUsers: {
    last7Days: number;
    last30Days: number;
  };
  totalUsers: number;
  growth: {
    last7Days: number;
    last30Days: number;
  };
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function UserAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/admin/analytics/users");
        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">User Analytics</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Card key={i} className="h-32 animate-pulse bg-neutral-100" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">User Analytics</h1>
        <Card className="p-6">
          <p className="text-red-500">Error: {error || "No data available"}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">User Analytics</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          User registration and activity metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Total Users
          </p>
          <p className="mt-2 text-3xl font-bold">{data.totalUsers}</p>
          <p className="mt-2 text-xs text-neutral-500">
            +{data.growth.last7Days} last 7 days
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Active Users (7d)
          </p>
          <p className="mt-2 text-3xl font-bold">
            {data.activeUsers.last7Days}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            {((data.activeUsers.last7Days / data.totalUsers) * 100).toFixed(1)}% of total
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Active Users (30d)
          </p>
          <p className="mt-2 text-3xl font-bold">
            {data.activeUsers.last30Days}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            {((data.activeUsers.last30Days / data.totalUsers) * 100).toFixed(
              1,
            )}% of total
          </p>
        </Card>
      </div>

      {/* Daily Registrations Chart */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">
          Daily Registrations (Last 30 Days)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.dailyRegistrations}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => {
                const date = new Date(value as string);
                return date.toLocaleDateString();
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              name="New Users"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Auth Provider Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">
            Auth Provider Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.authProviders}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: { name?: string; percent?: number; }) => {
                  const name = props.name ?? "Unknown";
                  const percent = props.percent ?? 0;
                  return `${name} ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.authProviders.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Provider Statistics</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.authProviders}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Users" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
