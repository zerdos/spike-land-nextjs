/**
 * Weekly Plan Generator Component
 * Generate and display weekly content plan
 * Issue #841
 */

"use client";

import { Button } from "@/components/ui/button";
import type { WeeklyPlan } from "@/types/ai-calendar";
import { addWeeks, format, subWeeks } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ContentSuggestionCard } from "./ContentSuggestionCard";

interface WeeklyPlanGeneratorProps {
  workspaceId: string;
}

export function WeeklyPlanGenerator({
  workspaceId,
}: WeeklyPlanGeneratorProps) {
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    now.setDate(diff);
    now.setHours(0, 0, 0, 0);
    return now;
  });

  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/orbit/${workspaceId}/calendar/weekly-plan?weekStart=${weekStart.toISOString()}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate weekly plan");
      }

      const data = await response.json();
      const weeklyPlan: WeeklyPlan = {
        weekStart: new Date(data.plan.weekStart),
        weekEnd: new Date(data.plan.weekEnd),
        suggestions: data.plan.suggestions,
        coveragePct: data.plan.coveragePct,
        gaps: data.plan.gaps,
      };

      setPlan(weeklyPlan);
      toast.success("Weekly plan generated", {
        description: `Found ${weeklyPlan.suggestions.length} suggestions for this week`,
      });
    } catch (error) {
      toast.error("Generation failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    toast.success("Suggestion accepted");
  };

  const handleReject = () => {
    toast.success("Suggestion rejected");
  };

  const handleEdit = () => {
    toast.info("Edit suggestion");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Weekly Plan</h3>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(weekStart, "MMM d")} - {format(addWeeks(weekStart, 1), "MMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating}>
          <Sparkles
            className={`mr-2 h-4 w-4 ${isGenerating ? "animate-pulse" : ""}`}
          />
          {isGenerating ? "Generating..." : "Generate Plan"}
        </Button>
      </div>

      {plan && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Coverage</p>
                <p className="text-2xl font-bold">{plan.coveragePct}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">Content Gaps</p>
                <p className="text-2xl font-bold">{plan.gaps.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Suggestions</p>
                <p className="text-2xl font-bold">{plan.suggestions.length}</p>
              </div>
            </div>
          </div>

          {plan.gaps.length > 0 && (
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-semibold">Content Gaps</h4>
              <ul className="space-y-1 text-sm">
                {plan.gaps.slice(0, 5).map((gap, idx) => (
                  <li key={idx} className="text-muted-foreground">
                    • Day {gap.day} at {gap.hour}:00 - {gap.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {plan.suggestions.map((suggestion) => (
              <ContentSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={handleAccept}
                onReject={handleReject}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
