/**
 * Weekly Plan Generation Service
 * Generates weekly content plans with AI suggestions
 * Issue #841
 */

import prisma from "@/lib/prisma";
import type { WeeklyPlan } from "@/types/ai-calendar";
import { generateContentSuggestions } from "./ai-content-service";
import { getOptimalTimes } from "./optimal-time-service";

/**
 * Generate a weekly content plan for a workspace
 * Identifies gaps in the calendar and generates AI suggestions
 */
export async function generateWeeklyPlan(
  workspaceId: string,
  weekStart: Date,
): Promise<WeeklyPlan> {
  // 1. Calculate week date range
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // 2. Fetch existing scheduled posts for the week
  const scheduledPosts = await prisma.scheduledPost.findMany({
    where: {
      workspaceId,
      scheduledAt: {
        gte: weekStart,
        lt: weekEnd,
      },
      status: {
        in: ["DRAFT", "PENDING", "SCHEDULED"],
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // 3. Get optimal time slots
  const optimalTimes = await getOptimalTimes({
    workspaceId,
    refreshCache: false,
  });

  // 4. Identify gaps (optimal time slots not filled)
  const gaps: Array<{ day: number; hour: number; reason: string; }> = [];
  const scheduledSlots = new Set(
    scheduledPosts.map((post) => {
      const day = post.scheduledAt.getUTCDay();
      const hour = post.scheduledAt.getUTCHours();
      return `${day}-${hour}`;
    }),
  );

  // Build a map of optimal slots by day/hour
  const optimalSlotMap = new Map<string, number>();
  for (const rec of optimalTimes) {
    const key = `${rec.dayOfWeek}-${rec.hourUtc}`;
    const existing = optimalSlotMap.get(key) || 0;
    if (rec.score > existing) {
      optimalSlotMap.set(key, rec.score);
    }
  }

  // Find top optimal slots not yet scheduled
  const optimalSlotKeys = Array.from(optimalSlotMap.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by score descending
    .slice(0, 21); // Top 21 slots (3 posts per day for 7 days)

  for (const [slotKey, score] of optimalSlotKeys) {
    if (!scheduledSlots.has(slotKey)) {
      const parts = slotKey.split("-");
      const dayStr = parts[0];
      const hourStr = parts[1];
      if (dayStr && hourStr) {
        gaps.push({
          day: parseInt(dayStr, 10),
          hour: parseInt(hourStr, 10),
          reason: `High engagement slot (score: ${Math.round(score)}) not filled`,
        });
      }
    }
  }

  // 5. Generate content suggestions for gaps (max 10 suggestions)
  const suggestionsToGenerate = Math.min(gaps.length, 10);
  let suggestions: WeeklyPlan["suggestions"] = [];

  if (suggestionsToGenerate > 0) {
    const generated = await generateContentSuggestions({
      workspaceId,
      count: suggestionsToGenerate,
      dateRange: {
        start: weekStart,
        end: weekEnd,
      },
    });
    suggestions = generated;
  }

  // 6. Calculate coverage percentage
  const totalOptimalSlots = optimalSlotKeys.length;
  const filledSlots = optimalSlotKeys.filter(([key]) => scheduledSlots.has(key)).length;
  const coveragePct = totalOptimalSlots > 0
    ? Math.round((filledSlots / totalOptimalSlots) * 100)
    : 0;

  return {
    weekStart,
    weekEnd,
    suggestions,
    coveragePct,
    gaps: gaps.slice(0, 10), // Return top 10 gaps
  };
}
