/**
 * Performance Chart
 *
 * Displays campaign performance metrics (ROAS, CPA, conversions) using Recharts.
 * Supports filtering and comparison between campaigns.
 *
 * Resolves #552
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CampaignPerformanceAnalysis } from "@/lib/allocator/allocator-types";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PerformanceChartProps {
  campaignAnalyses: CampaignPerformanceAnalysis[];
  lookbackDays: number;
}

const platformColors: Record<string, string> = {
  FACEBOOK: "#1877F2",
  GOOGLE_ADS: "#4285F4",
  LINKEDIN: "#0A66C2",
  TWITTER: "#1DA1F2",
  TIKTOK: "#000000",
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; platform: string; };
  }>;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  if (!item) return null;

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
      <p className="text-white font-medium">{item.payload.name}</p>
      <p className="text-white/60 text-xs mb-2">{item.payload.platform}</p>
      <p className="text-white">
        {item.name}: {item.name === "CPA"
          ? formatCurrency(item.value)
          : item.value.toFixed(2)}
        {item.name === "ROAS" ? "x" : ""}
      </p>
    </div>
  );
}

function TrendBadge(
  { trend }: { trend: "improving" | "stable" | "declining"; },
) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
        trend === "improving" && "bg-emerald-500/10 text-emerald-500",
        trend === "stable" && "bg-yellow-500/10 text-yellow-500",
        trend === "declining" && "bg-red-500/10 text-red-500",
      )}
    >
      {trend === "improving" && <TrendingUp className="h-3 w-3" />}
      {trend === "declining" && <TrendingDown className="h-3 w-3" />}
      {trend.charAt(0).toUpperCase() + trend.slice(1)}
    </span>
  );
}

export function PerformanceChart({
  campaignAnalyses,
  lookbackDays,
}: PerformanceChartProps) {
  if (campaignAnalyses.length === 0) {
    return (
      <Card variant="default">
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No campaign data available. Connect your ad accounts to see performance metrics.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const roasData = campaignAnalyses.map((campaign) => ({
    name: campaign.campaignName.slice(0, 20) +
      (campaign.campaignName.length > 20 ? "..." : ""),
    fullName: campaign.campaignName,
    platform: campaign.platform,
    value: campaign.metrics.roas,
    trend: campaign.trend.roas,
  })).sort((a, b) => b.value - a.value);

  const cpaData = campaignAnalyses.map((campaign) => ({
    name: campaign.campaignName.slice(0, 20) +
      (campaign.campaignName.length > 20 ? "..." : ""),
    fullName: campaign.campaignName,
    platform: campaign.platform,
    value: campaign.metrics.cpa,
    trend: campaign.trend.cpa,
  })).sort((a, b) => a.value - b.value); // Lower CPA is better

  const conversionData = campaignAnalyses.map((campaign) => ({
    name: campaign.campaignName.slice(0, 20) +
      (campaign.campaignName.length > 20 ? "..." : ""),
    fullName: campaign.campaignName,
    platform: campaign.platform,
    value: campaign.metrics.conversions,
    trend: campaign.trend.conversions,
  })).sort((a, b) => b.value - a.value);

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Campaign Performance</CardTitle>
          <span className="text-sm text-muted-foreground">
            Last {lookbackDays} days
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="roas">
          <TabsList className="mb-4">
            <TabsTrigger value="roas">ROAS</TabsTrigger>
            <TabsTrigger value="cpa">CPA</TabsTrigger>
            <TabsTrigger value="conversions">Conversions</TabsTrigger>
          </TabsList>

          <TabsContent value="roas">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roasData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={12}
                  tickFormatter={(v) => `${v}x`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  width={120}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="value" name="ROAS" radius={[0, 4, 4, 0]}>
                  {roasData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={platformColors[entry.platform] || "#8884d8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {roasData.slice(0, 3).map((campaign) => (
                <div
                  key={campaign.name}
                  className="flex items-center justify-between p-2 rounded bg-white/5"
                >
                  <span className="text-sm truncate">{campaign.fullName}</span>
                  <TrendBadge trend={campaign.trend} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cpa">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cpaData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={12}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  width={120}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="value" name="CPA" radius={[0, 4, 4, 0]}>
                  {cpaData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={platformColors[entry.platform] || "#8884d8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {cpaData.slice(0, 3).map((campaign) => (
                <div
                  key={campaign.name}
                  className="flex items-center justify-between p-2 rounded bg-white/5"
                >
                  <span className="text-sm truncate">{campaign.fullName}</span>
                  <TrendBadge trend={campaign.trend} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="conversions">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  width={120}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="value" name="Conversions" radius={[0, 4, 4, 0]}>
                  {conversionData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={platformColors[entry.platform] || "#8884d8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {conversionData.slice(0, 3).map((campaign) => (
                <div
                  key={campaign.name}
                  className="flex items-center justify-between p-2 rounded bg-white/5"
                >
                  <span className="text-sm truncate">{campaign.fullName}</span>
                  <TrendBadge trend={campaign.trend} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
