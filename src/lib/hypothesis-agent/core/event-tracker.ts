/**
 * Event Tracker
 * Epic #516
 *
 * Tracks experiment events (impressions, clicks, conversions).
 */

import prisma from "@/lib/prisma";
import type { ExperimentEvent, Prisma } from "@prisma/client";
import type { ExperimentEventData } from "@/types/hypothesis-agent";
import { updateVariantMetrics } from "./variant-manager";

/**
 * Track an experiment event.
 *
 * @param experimentId - Experiment ID
 * @param variantId - Variant ID
 * @param event - Event data
 * @returns Created event
 */
export async function trackEvent(
  experimentId: string,
  variantId: string,
  event: ExperimentEventData
): Promise<ExperimentEvent> {
  // Create event record
  const experimentEvent = await prisma.experimentEvent.create({
    data: {
      experimentId,
      variantId,
      eventType: event.eventType,
      eventName: event.eventName,
      value: event.value,
      metadata: (event.metadata ?? {}) as Prisma.InputJsonValue,
      visitorId: event.visitorId,
      userId: event.userId,
    },
  });

  // Update variant metrics based on event type
  if (event.eventType === "impression") {
    await updateVariantMetrics(variantId, { impressions: 1 });
  } else if (event.eventType === "conversion") {
    await updateVariantMetrics(variantId, {
      conversions: 1,
      ...(event.value && { totalValue: event.value }),
    });
  }

  return experimentEvent;
}

/**
 * Track multiple events in batch.
 *
 * More efficient for high-volume tracking.
 *
 * @param events - Array of events to track
 */
export async function trackEventsBatch(
  events: Array<{
    experimentId: string;
    variantId: string;
    event: ExperimentEventData;
  }>
): Promise<void> {
  // Group events by variant for efficient metric updates
  const variantMetrics: Record<
    string,
    { impressions: number; conversions: number; totalValue: number }
  > = {};

  // Create all event records
  await prisma.experimentEvent.createMany({
    data: events.map((e) => ({
      experimentId: e.experimentId,
      variantId: e.variantId,
      eventType: e.event.eventType,
      eventName: e.event.eventName,
      value: e.event.value,
      metadata: (e.event.metadata ?? {}) as Prisma.InputJsonValue,
      visitorId: e.event.visitorId,
      userId: e.event.userId,
    })),
  });

  // Aggregate metrics
  for (const { variantId, event } of events) {
    if (!variantMetrics[variantId]) {
      variantMetrics[variantId] = { impressions: 0, conversions: 0, totalValue: 0 };
    }

    if (event.eventType === "impression") {
      variantMetrics[variantId].impressions++;
    } else if (event.eventType === "conversion") {
      variantMetrics[variantId].conversions++;
      if (event.value) {
        variantMetrics[variantId].totalValue += event.value;
      }
    }
  }

  // Update variant metrics
  const updates = Object.entries(variantMetrics).map(([variantId, metrics]) =>
    updateVariantMetrics(variantId, metrics)
  );

  await Promise.all(updates);
}

/**
 * Get events for an experiment.
 *
 * @param experimentId - Experiment ID
 * @param filters - Optional filters
 * @returns Array of events
 */
export async function getEvents(
  experimentId: string,
  filters?: {
    variantId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<ExperimentEvent[]> {
  return await prisma.experimentEvent.findMany({
    where: {
      experimentId,
      ...(filters?.variantId && { variantId: filters.variantId }),
      ...(filters?.eventType && { eventType: filters.eventType }),
      ...(filters?.startDate &&
        filters?.endDate && {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 100,
  });
}

/**
 * Get event counts by type for an experiment.
 *
 * @param experimentId - Experiment ID
 * @returns Event counts
 */
export async function getEventCounts(experimentId: string): Promise<
  Record<
    string,
    {
      total: number;
      byVariant: Record<string, number>;
    }
  >
> {
  const events = await prisma.experimentEvent.findMany({
    where: { experimentId },
    select: {
      eventType: true,
      variantId: true,
    },
  });

  const counts: Record<
    string,
    {
      total: number;
      byVariant: Record<string, number>;
    }
  > = {};

  for (const event of events) {
    const eventType = event.eventType;
    if (!counts[eventType]) {
      counts[eventType] = {
        total: 0,
        byVariant: {},
      };
    }

    const typeCount = counts[eventType]!;
    typeCount.total++;

    const variantId = event.variantId;
    if (!variantId) continue;

    if (!typeCount.byVariant[variantId]) {
      typeCount.byVariant[variantId] = 0;
    }
    typeCount.byVariant[variantId]++;
  }

  return counts;
}

/**
 * Get unique visitor count for an experiment.
 *
 * @param experimentId - Experiment ID
 * @returns Unique visitor count
 */
export async function getUniqueVisitorCount(experimentId: string): Promise<number> {
  const result = await prisma.experimentEvent.findMany({
    where: {
      experimentId,
      visitorId: { not: null },
    },
    select: {
      visitorId: true,
    },
    distinct: ["visitorId"],
  });

  return result.length;
}

/**
 * Get event timeline for visualization.
 *
 * Groups events by time period (hour, day, week).
 *
 * @param experimentId - Experiment ID
 * @param groupBy - Time grouping ('hour' | 'day' | 'week')
 * @returns Timeline data
 */
export async function getEventTimeline(
  experimentId: string,
  groupBy: "hour" | "day" | "week" = "day"
): Promise<
  Array<{
    timestamp: Date;
    eventType: string;
    count: number;
  }>
> {
  // This is a simplified version - in production, you'd want to use database
  // aggregation functions for better performance
  const events = await prisma.experimentEvent.findMany({
    where: { experimentId },
    select: {
      createdAt: true,
      eventType: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const timeline: Record<string, Record<string, number>> = {};

  for (const event of events) {
    const timestamp = truncateDate(event.createdAt, groupBy);
    const key = timestamp.toISOString();

    if (!timeline[key]) {
      timeline[key] = {};
    }

    const eventType = event.eventType;
    const typeCounts = timeline[key]!;

    if (!typeCounts[eventType]) {
      typeCounts[eventType] = 0;
    }

    typeCounts[eventType]++;
  }

  // Convert to array format
  const result: Array<{
    timestamp: Date;
    eventType: string;
    count: number;
  }> = [];

  for (const [timestampStr, eventCounts] of Object.entries(timeline)) {
    const timestamp = new Date(timestampStr);
    for (const [eventType, count] of Object.entries(eventCounts)) {
      result.push({ timestamp, eventType, count });
    }
  }

  return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Truncate date to specified granularity.
 */
function truncateDate(date: Date, groupBy: "hour" | "day" | "week"): Date {
  const d = new Date(date);

  if (groupBy === "hour") {
    d.setMinutes(0, 0, 0);
  } else if (groupBy === "day") {
    d.setHours(0, 0, 0, 0);
  } else if (groupBy === "week") {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
  }

  return d;
}

/**
 * Delete old events (for cleanup/GDPR).
 *
 * @param beforeDate - Delete events before this date
 * @returns Number of deleted events
 */
export async function deleteOldEvents(beforeDate: Date): Promise<number> {
  const result = await prisma.experimentEvent.deleteMany({
    where: {
      createdAt: {
        lt: beforeDate,
      },
    },
  });

  return result.count;
}
