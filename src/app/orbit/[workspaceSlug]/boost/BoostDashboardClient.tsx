"use client";

import { CandidateCard } from "@/components/orbit/boost/CandidateCard";
import { PerformanceChart } from "@/components/orbit/boost/PerformanceChart";
import { Button } from "@/components/ui/button";
import type { PostBoostRecommendation } from "@/generated/prisma";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface BoostDashboardClientProps {
  workspaceSlug: string;
}

type EnrichedCandidate = PostBoostRecommendation & {
  postPerformance?: {
    engagementRate: number;
    engagementVelocity: number;
    boostScore: number | null;
    impressions: number;
    engagementCount: number;
    estimatedROI?: number | null;
  } | null;
  postContent?: {
    content: string;
    publishedAt: Date | null;
    assets: {
      asset: {
        r2Key: string;
        fileType: string;
      };
    }[];
  } | null;
};

export function BoostDashboardClient({ workspaceSlug }: BoostDashboardClientProps) {
  const [candidates, setCandidates] = useState<EnrichedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orbit/${workspaceSlug}/boost/candidates?status=PENDING`);
      if (!res.ok) throw new Error("Failed to fetch candidates");
      const data = await res.json();
      setCandidates(data.candidates);
    } catch (error) {
      toast.error("Error loading boost candidates");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleDetect = async () => {
    try {
      setDetecting(true);
      const res = await fetch(`/api/orbit/${workspaceSlug}/boost/detect`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Detection failed");
      const data = await res.json();
      toast.success(`Found ${data.count} new boost opportunities`);
      fetchCandidates();
    } catch (error) {
      toast.error("Failed to run detection");
      console.error(error);
    } finally {
      setDetecting(false);
    }
  };

  const handleBoost = async (_id: string) => {
    // In Phase 1, we might just approve/start the flow.
    // For now, let's just show a toast or navigate to a detail page if it existed.
    // Ideally, this opens the Boost Wizard (Phase 2).
    toast.info("Boost flow starting... (Phase 2 feature)");

    // We can potentially call the apply endpoint if we wanted to auto-apply,
    // but typically UI requires configuration (budget, etc).
  };

  // Prepare chart data
  const chartData = candidates.slice(0, 5).map((c) => ({
    name: c.postContent?.content?.slice(0, 15) + "..." || "Post",
    impressions: c.postPerformance?.impressions || 0,
    engagement: c.postPerformance?.engagementCount || 0,
  }));

  if (loading && candidates.length === 0) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Boost Candidates</h2>
          <p className="text-muted-foreground">
            Top performing organic posts recommended for paid boosting
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDetect}
            disabled={detecting}
          >
            {detecting
              ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )
              : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
            Run Detection
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-full lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {candidates.length === 0
              ? (
                <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                  <h3 className="text-lg font-semibold">No candidates found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try running detection to find new opportunities.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={handleDetect}
                  >
                    Detect Now
                  </Button>
                </div>
              )
              : (
                candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    onBoost={handleBoost}
                  />
                ))
              )}
          </div>
        </div>

        <div className="col-span-full lg:col-span-1">
          <div className="sticky top-6 flex flex-col gap-4">
            <PerformanceChart data={chartData} />
            {/* Additional widgets can go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
