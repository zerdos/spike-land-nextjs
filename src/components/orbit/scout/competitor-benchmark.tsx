
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
      try {
        const response = await fetch(`/api/orbit/${workspaceSlug}/scout/competitors`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch competitors');
        }
        
        const competitors = await response.json();

        if (competitors.length === 0) {
          setReport({
            // TODO: Replace with real SocialMetrics data from workspace
            ownMetrics: { averageLikes: 0, averageComments: 0, averageShares: 0, totalPosts: 0 },
            competitorMetrics: { averageLikes: 0, averageComments: 0, averageShares: 0, totalPosts: 0 }
          });
          return;
        }

        let totalLikes = 0, totalComments = 0, totalShares = 0, totalPosts = 0;

        // Fetch metrics for all competitors concurrently to avoid sequential N+1 latency
        const metricsResults = await Promise.allSettled(
          competitors.map(async (c: { id: string }) => {
            const metricsRes = await fetch(`/api/orbit/${workspaceSlug}/scout/competitors/${c.id}/metrics`);
            if (!metricsRes.ok) {
              throw new Error(`Failed to fetch metrics for competitor ${c.id}`);
            }
            const { engagementMetrics } = await metricsRes.json();
            return engagementMetrics as EngagementMetrics;
          })
        );

        // Aggregate metrics, skipping failed requests
        for (const result of metricsResults) {
          if (result.status !== 'fulfilled' || !result.value) {
            continue;
          }
          const engagementMetrics = result.value;
          totalLikes += engagementMetrics.averageLikes * engagementMetrics.totalPosts;
          totalComments += engagementMetrics.averageComments * engagementMetrics.totalPosts;
          totalShares += engagementMetrics.averageShares * engagementMetrics.totalPosts;
          totalPosts += engagementMetrics.totalPosts;
        }

        setReport({
          // TODO: Replace with real SocialMetrics data from workspace
          // This should fetch from the SocialMetrics table for the workspace
          ownMetrics: { averageLikes: 0, averageComments: 0, averageShares: 0, totalPosts: 0 },
          competitorMetrics: {
            averageLikes: totalPosts > 0 ? totalLikes / totalPosts : 0,
            averageComments: totalPosts > 0 ? totalComments / totalPosts : 0,
            averageShares: totalPosts > 0 ? totalShares / totalPosts : 0,
            totalPosts: totalPosts
          }
        });

      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Could not load benchmark data.');
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
      <h2 className="text-lg font-semibold mb-4">Performance Benchmark (Last 30 Days)</h2>
      <div className="mb-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
        Note: &quot;Your Performance&quot; metrics are currently placeholder values. Integration with SocialMetrics data is pending.
      </div>
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
