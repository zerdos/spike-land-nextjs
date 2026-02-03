import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { PostBoostRecommendation } from "@/generated/prisma";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, TrendingUp } from "lucide-react";

interface CandidateCardProps {
  candidate: PostBoostRecommendation & {
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
  onBoost: (id: string) => void;
}

export function CandidateCard({ candidate, onBoost }: CandidateCardProps) {
  const score = candidate.postPerformance?.boostScore ?? 0;
  const engagementRate = (candidate.postPerformance?.engagementRate ?? 0) * 100;

  // Format reasoning text (take first sentence)
  const reasoning = candidate.reasoning.split(".")[0] + ".";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                Score: {score}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {candidate.postContent?.publishedAt &&
                  formatDistanceToNow(new Date(candidate.postContent.publishedAt), {
                    addSuffix: true,
                  })}
              </span>
            </div>
          </div>
          <Badge variant={score > 80 ? "default" : "outline"}>
            {score > 80 ? "High Potential" : "Qualified"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex gap-4">
          {/* Image Preview if available */}
          {candidate.postContent?.assets?.[0] && (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
              {/* In a real app we would resolve R2 key to URL, assuming we have a helper or it's public */}
              {/* Using placeholder for now if no URL resolution logic in component */}
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                Media
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {candidate.postContent?.content || "No content available"}
            </p>

            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {reasoning}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Impressions</span>
            <span className="font-semibold">
              {candidate.postPerformance?.impressions.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Engagement</span>
            <span className="font-semibold">{engagementRate.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Est. ROI</span>
            <span className="font-semibold text-emerald-600">
              {candidate.postPerformance?.estimatedROI
                ? `${(candidate.postPerformance.estimatedROI * 100).toFixed(0)}%`
                : "N/A"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 pt-3">
        <Button
          className="w-full gap-2"
          onClick={() => onBoost(candidate.id)}
          disabled={candidate.status !== "PENDING"}
        >
          {candidate.status === "PENDING"
            ? (
              <>
                Boost Post <ArrowUpRight className="h-4 w-4" />
              </>
            )
            : (
              candidate.status
            )}
        </Button>
      </CardFooter>
    </Card>
  );
}
