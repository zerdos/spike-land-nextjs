import prisma from "@/lib/prisma";
import { type CreativePerformance, type FatigueSeverity } from "@prisma/client";

interface FatigueMetrics {
  ctrDecayPercent?: number;
  daysActive?: number;
  currentCTR?: number;
  peakCTR?: number;
}

// Stub for date utility
function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function calculateCTRTrend(performance: CreativePerformance[]): number[] {
  // Moving average to smooth out noise
  const window = 3;
  const smoothed: number[] = [];

  for (let i = 0; i < performance.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = performance.slice(start, i + 1);
    const avg = slice.length > 0
      ? slice.reduce((sum, p) => sum + p.ctr, 0) / slice.length
      : 0;
    smoothed.push(avg);
  }

  return smoothed;
}

function detectDecayPattern(ctrTrend: number[]): {
  percentDecline: number;
  consecutiveDeclineDays: number;
} {
  if (ctrTrend.length === 0) return { percentDecline: 0, consecutiveDeclineDays: 0 };

  const peak = Math.max(...ctrTrend);
  const current = ctrTrend[ctrTrend.length - 1];

  if (current === undefined || peak === 0) return { percentDecline: 0, consecutiveDeclineDays: 0 };

  const percentDecline = ((peak - current) / peak) * 100;

  // Count consecutive declining days
  let consecutiveDeclineDays = 0;
  for (let i = ctrTrend.length - 1; i > 0; i--) {
    const currentVal = ctrTrend[i];
    const prevVal = ctrTrend[i - 1];

    if (currentVal !== undefined && prevVal !== undefined && currentVal < prevVal) {
      consecutiveDeclineDays++;
    } else {
      break;
    }
  }

  return { percentDecline, consecutiveDeclineDays };
}

export async function detectCreativeFatigue(variantId: string): Promise<{
  hasFatigue: boolean;
  severity?: FatigueSeverity;
  metrics: FatigueMetrics;
}> {
  // 1. Get performance history (last 30 days)
  const performance = await prisma.creativePerformance.findMany({
    where: {
      variantId,
      date: {
        gte: subDays(new Date(), 30),
      },
    },
    orderBy: { date: "asc" },
  });

  if (performance.length < 7) {
    return { hasFatigue: false, metrics: {} };
  }

  // 2. Calculate CTR trend
  const ctrTrend = calculateCTRTrend(performance);

  // 3. Detect decay patterns
  const decay = detectDecayPattern(ctrTrend);

  // 4. Determine severity
  let severity: FatigueSeverity | undefined;
  let hasFatigue = false;

  if (decay.percentDecline >= 40) {
    severity = "HIGH";
    hasFatigue = true;
  } else if (decay.percentDecline >= 20) {
    severity = "MEDIUM";
    hasFatigue = true;
  } else if (decay.percentDecline >= 10) {
    severity = "LOW";
    hasFatigue = true;
  }

  // 5. Check for critical pattern (consistent decline over 7 days)
  if (decay.consecutiveDeclineDays >= 7) {
    severity = "CRITICAL";
    hasFatigue = true;
  }

  // Handle potential empty array for performance.map
  const maxCtr = performance.length > 0
    ? Math.max(...performance.map((p: CreativePerformance) => p.ctr))
    : 0;

  // Get last element safely
  const lastPerformance = performance[performance.length - 1];

  return {
    hasFatigue,
    severity,
    metrics: {
      ctrDecayPercent: decay.percentDecline,
      daysActive: performance.length,
      currentCTR: lastPerformance?.ctr,
      peakCTR: maxCtr,
    },
  };
}
