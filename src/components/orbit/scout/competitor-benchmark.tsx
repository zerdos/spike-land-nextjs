
'use client';

import { useState, useEffect } from 'react';

interface EngagementMetrics {
  averageLikes: number;
  averageComments: number;
  averageShares: number;
  totalPosts: number;
}

interface BenchmarkReport {
  ownMetrics: EngagementMetrics;
  competitorMetrics: EngagementMetrics;
}

interface CompetitorBenchmarkProps {
  workspaceSlug: string;
}

export function CompetitorBenchmark({ workspaceSlug }: CompetitorBenchmarkProps) {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBenchmark() {
      // In a real app, this would fetch a pre-calculated benchmark.
      // For now, we simulate by fetching and aggregating all competitor data.
      // This is inefficient but demonstrates the concept.
      try {
        const response = await fetch(`/api/orbit/${workspaceSlug}/scout/competitors`);
        const competitors = await response.json();

        if (competitors.length === 0) {
          setReport({
            ownMetrics: { averageLikes: 150, averageComments: 25, averageShares: 10, totalPosts: 20 },
            competitorMetrics: { averageLikes: 0, averageComments: 0, averageShares: 0, totalPosts: 0 }
          });
          return;
        }

        let totalLikes = 0, totalComments = 0, totalShares = 0, totalPosts = 0;

        // This is a simplified client-side aggregation for demonstration.
        // The `generateBenchmarkReport` function in the analyzer should be used in a real cron job.
        for (const c of competitors) {
            const metricsRes = await fetch(`/api/orbit/${workspaceSlug}/scout/competitors/${c.id}/metrics`);
            const { engagementMetrics } = await metricsRes.json();
            totalLikes += engagementMetrics.averageLikes * engagementMetrics.totalPosts;
            totalComments += engagementMetrics.averageComments * engagementMetrics.totalPosts;
            totalShares += engagementMetrics.averageShares * engagementMetrics.totalPosts;
            totalPosts += engagementMetrics.totalPosts;
        }

        setReport({
            ownMetrics: { averageLikes: 150, averageComments: 25, averageShares: 10, totalPosts: 20 }, // Mocked data
            competitorMetrics: {
                averageLikes: totalPosts > 0 ? totalLikes / totalPosts : 0,
                averageComments: totalPosts > 0 ? totalComments / totalPosts : 0,
                averageShares: totalPosts > 0 ? totalShares / totalPosts : 0,
                totalPosts: totalPosts
            }
        });

      } catch (err) {
        setError('Could not load benchmark data.');
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
      <h2 className="text-lg font-semibold mb-4">Performance Benchmark (Last 30 Days)</h2>
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
            <td className="p-2">{report.competitorMetrics.averageLikes.toFixed(0)}</td>
          </tr>
          <tr className="border-b">
            <td className="p-2 font-semibold">Avg. Comments per Post</td>
            <td className="p-2">{report.ownMetrics.averageComments.toFixed(0)}</td>
            <td className="p-2">{report.competitorMetrics.averageComments.toFixed(0)}</td>
          </tr>
          <tr className="border-b">
            <td className="p-2 font-semibold">Avg. Shares per Post</td>
            <td className="p-2">{report.ownMetrics.averageShares.toFixed(0)}</td>
            <td className="p-2">{report.competitorMetrics.averageShares.toFixed(0)}</td>
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
