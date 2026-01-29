"use client";

/**
 * Chart visualization for A/B test results
 *
 * Displays conversion rates for each variant using bar charts.
 * Resolves #840
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Metric {
  variantId: string;
  conversionRate: number;
  sampleSize: number;
}

interface AbTestResultsChartProps {
  metrics: Metric[];
}

export function AbTestResultsChart({ metrics }: AbTestResultsChartProps) {
  const chartData = metrics.map((m, idx) => ({
    name: `Variant ${idx + 1}`,
    conversionRate: Number((m.conversionRate * 100).toFixed(2)),
    sampleSize: m.sampleSize,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis label={{ value: "Conversion Rate (%)", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="conversionRate"
          fill="hsl(var(--primary))"
          name="Conversion Rate (%)"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
