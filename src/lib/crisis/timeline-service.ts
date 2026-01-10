/**
 * Crisis Timeline Service
 *
 * Provides timeline aggregation and history for crisis events.
 *
 * Resolves #588: Create Crisis Detection System
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { SocialPlatform } from "@prisma/client";

import type { CrisisTimeline, CrisisTimelineEvent } from "./types";

/**
 * Crisis Timeline Service
 */
export class CrisisTimelineService {
  /**
   * Get timeline for a specific crisis
   */
  static async getCrisisTimeline(crisisId: string): Promise<CrisisTimeline | null> {
    // Get crisis event
    const { data: crisis, error } = await tryCatch(
      prisma.crisisDetectionEvent.findUnique({
        where: { id: crisisId },
        include: {
          workspace: {
            select: { settings: true },
          },
        },
      }),
    );

    if (error || !crisis) {
      return null;
    }

    // Get affected accounts info
    const { data: accounts } = await tryCatch(
      prisma.socialAccount.findMany({
        where: { id: { in: crisis.affectedAccountIds } },
        select: { id: true, platform: true, accountName: true },
      }),
    );

    // Get timeline events from workspace settings
    const settings = crisis.workspace.settings as Record<string, unknown> | null;
    const allEvents = (settings?.crisisTimeline as Array<Record<string, unknown>>) || [];

    // Filter events for this crisis
    const crisisEvents = allEvents
      .filter((e) => e.crisisId === crisisId)
      .map((e) => ({
        id: String(e.id),
        type: e.type as CrisisTimelineEvent["type"],
        timestamp: new Date(e.timestamp as string),
        actorId: e.actorId as string | undefined,
        actorName: e.actorName as string | undefined,
        crisisId: e.crisisId as string | undefined,
        severity: e.severity as CrisisTimelineEvent["severity"],
        details: e.details as Record<string, unknown> | undefined,
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Add base events from crisis record
    const baseEvents: CrisisTimelineEvent[] = [
      {
        id: `detected-${crisis.id}`,
        type: "crisis_detected",
        timestamp: crisis.detectedAt,
        severity: crisis.severity,
        crisisId: crisis.id,
        details: {
          triggerType: crisis.triggerType,
          triggerData: crisis.triggerData,
        },
      },
    ];

    if (crisis.acknowledgedAt) {
      baseEvents.push({
        id: `acknowledged-${crisis.id}`,
        type: "crisis_acknowledged",
        timestamp: crisis.acknowledgedAt,
        actorId: crisis.acknowledgedById || undefined,
        crisisId: crisis.id,
        details: { notes: crisis.responseNotes },
      });
    }

    if (crisis.resolvedAt) {
      baseEvents.push({
        id: `resolved-${crisis.id}`,
        type: crisis.status === "FALSE_ALARM" ? "crisis_resolved" : "crisis_resolved",
        timestamp: crisis.resolvedAt,
        actorId: crisis.resolvedById || undefined,
        crisisId: crisis.id,
        details: {
          notes: crisis.responseNotes,
          falseAlarm: crisis.status === "FALSE_ALARM",
        },
      });
    }

    // Merge and sort all events
    const allTimelineEvents = [...baseEvents, ...crisisEvents].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    return {
      crisisId: crisis.id,
      startedAt: crisis.detectedAt,
      endedAt: crisis.resolvedAt || undefined,
      status: crisis.status,
      severity: crisis.severity,
      events: allTimelineEvents,
      affectedAccounts: (accounts || []).map((a) => ({
        id: a.id,
        platform: a.platform as SocialPlatform,
        accountName: a.accountName,
      })),
    };
  }

  /**
   * Get overall timeline for a workspace
   */
  static async getWorkspaceTimeline(
    workspaceId: string,
    options: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      types?: CrisisTimelineEvent["type"][];
    } = {},
  ): Promise<CrisisTimelineEvent[]> {
    const limit = options.limit || 100;

    // Get timeline from workspace settings
    const { data: workspace, error } = await tryCatch(
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      }),
    );

    if (error || !workspace) {
      return [];
    }

    const settings = workspace.settings as Record<string, unknown> | null;
    const allEvents = (settings?.crisisTimeline as Array<Record<string, unknown>>) || [];

    let events = allEvents.map((e) => ({
      id: String(e.id),
      type: e.type as CrisisTimelineEvent["type"],
      timestamp: new Date(e.timestamp as string),
      actorId: e.actorId as string | undefined,
      actorName: e.actorName as string | undefined,
      crisisId: e.crisisId as string | undefined,
      severity: e.severity as CrisisTimelineEvent["severity"],
      details: e.details as Record<string, unknown> | undefined,
    }));

    // Apply filters
    if (options.startDate) {
      events = events.filter((e) => e.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      events = events.filter((e) => e.timestamp <= options.endDate!);
    }

    if (options.types && options.types.length > 0) {
      events = events.filter((e) => options.types!.includes(e.type));
    }

    // Sort and limit
    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get timeline summary for dashboard
   */
  static async getTimelineSummary(
    workspaceId: string,
    days = 7,
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByDay: Array<{ date: string; count: number; }>;
    recentEvents: CrisisTimelineEvent[];
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await this.getWorkspaceTimeline(workspaceId, {
      startDate,
      limit: 500,
    });

    // Count by type
    const eventsByType: Record<string, number> = {};
    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }

    // Count by day
    const eventsByDayMap: Record<string, number> = {};
    for (const event of events) {
      const dateKey = event.timestamp.toISOString().split("T")[0]!;
      eventsByDayMap[dateKey] = (eventsByDayMap[dateKey] || 0) + 1;
    }

    const eventsByDay = Object.entries(eventsByDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByDay,
      recentEvents: events.slice(0, 10),
    };
  }

  /**
   * Get actor names for timeline events
   */
  static async enrichTimelineWithActors(
    events: CrisisTimelineEvent[],
  ): Promise<CrisisTimelineEvent[]> {
    const actorIdSet = new Set<string>();
    for (const event of events) {
      if (event.actorId) {
        actorIdSet.add(event.actorId);
      }
    }
    const actorIds = Array.from(actorIdSet);

    if (actorIds.length === 0) {
      return events;
    }

    const { data: users } = await tryCatch(
      prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      }),
    );

    if (!users) {
      return events;
    }

    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return events.map((event) => ({
      ...event,
      actorName: event.actorId ? (userMap.get(event.actorId) ?? undefined) : undefined,
    }));
  }
}
