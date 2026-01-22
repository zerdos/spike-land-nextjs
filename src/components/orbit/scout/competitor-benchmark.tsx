"use client";

import { useEffect, useState } from "react";

interface EngagementMetrics {
  averageLikes: number;
  averageComments: number;
  averageShares: number;
  totalPosts: number;
  engagementRate?: number;
}

interface BenchmarkReport {
  ownMetrics: EngagementMetrics;
  competitorMetrics: EngagementMetrics;
  period?: {
    startDate: string;
    endDate: string;
  };
}

interface CompetitorBenchmarkProps {
  workspaceSlug: string;
}

export function CompetitorBenchmark(
  { workspaceSlug }: CompetitorBenchmarkProps,
) {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBenchmark() {
      try {
        // Fetch benchmark data from the dedicated API endpoint
        const response = await fetch(
          `/api/orbit/${workspaceSlug}/scout/benchmark`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch benchmark data");
        }

        const data = await response.json();
        setReport(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Could not load benchmark data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchBenchmark();
  }, [workspaceSlug]);

  if (isLoading) return <p>Loading benchmark...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!report) return <p>No benchmark data available.</p>;

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">
        Performance Benchmark (Last 30 Days)
      </h2>
      {report.ownMetrics.totalPosts === 0 && (
        <div className="mb-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
          Note: No social metrics data available yet. Connect social accounts and sync data to see
          your performance metrics.
        </div>
      )}
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Metric</th>
            <th className="p-2">Your Performance</th>
            <th className="p-2">Competitor Average</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-2 font-semibold">Avg. Likes per Post</td>
            <td className="p-2">{report.ownMetrics.averageLikes.toFixed(0)}</td>
            <td className="p-2">
              {report.competitorMetrics.averageLikes.toFixed(0)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="p-2 font-semibold">Avg. Comments per Post</td>
            <td className="p-2">
              {report.ownMetrics.averageComments.toFixed(0)}
            </td>
            <td className="p-2">
              {report.competitorMetrics.averageComments.toFixed(0)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="p-2 font-semibold">Avg. Shares per Post</td>
            <td className="p-2">
              {report.ownMetrics.averageShares.toFixed(0)}
            </td>
            <td className="p-2">
              {report.competitorMetrics.averageShares.toFixed(0)}
            </td>
          </tr>
          <tr>
            <td className="p-2 font-semibold">Total Posts</td>
            <td className="p-2">{report.ownMetrics.totalPosts}</td>
            <td className="p-2">{report.competitorMetrics.totalPosts}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
