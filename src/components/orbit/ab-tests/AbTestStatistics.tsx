"use client";

/**
 * Statistical significance display and visualization
 *
 * Shows real-time significance calculations with confidence levels.
 * Resolves #840
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignificanceResult } from "@/types/ab-test";
import { useCallback, useEffect, useState } from "react";
import { AbTestResultsChart } from "./AbTestResultsChart";

interface AbTestStatisticsProps {
  testId: string;
  workspaceSlug: string;
  status: string;
}

export function AbTestStatistics({
  testId,
  workspaceSlug,
  status,
}: AbTestStatisticsProps) {
  const [significance, setSignificance] = useState<SignificanceResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSignificance = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/ab-tests/${testId}/results`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch significance");
      }
      const data = await response.json();
      setSignificance(data.significance);
    } catch (error) {
      console.error("Failed to fetch significance:", error);
    } finally {
      setLoading(false);
    }
  }, [testId, workspaceSlug]);

  useEffect(() => {
    void fetchSignificance();

    // Poll every 30 seconds for running tests
    if (status === "RUNNING") {
      const interval = setInterval(() => void fetchSignificance(), 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchSignificance, status]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            Loading statistics...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!significance) {
    return null;
  }

  const confidencePercent = (significance.confidenceLevel * 100).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Statistical Significance</CardTitle>
            <CardDescription>
              Confidence: {confidencePercent}%
            </CardDescription>
          </div>
          {significance.isSignificant
            ? <Badge variant="default">Significant</Badge>
            : <Badge variant="secondary">Not Significant</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {significance.metrics.length > 0
          ? <AbTestResultsChart metrics={significance.metrics} />
          : (
            <div className="text-center text-muted-foreground py-4">
              No data available yet
            </div>
          )}

        {!significance.isSignificant && (
          <p className="text-xs text-muted-foreground mt-4">
            Continue running the test to gather more data. At least 100 impressions per variant are
            required for statistical significance.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
