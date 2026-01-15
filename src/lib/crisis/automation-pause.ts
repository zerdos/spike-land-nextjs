/**
 * Automation Pause Manager
 *
 * Provides kill switch functionality to pause all automations during a crisis.
 * Stores pause status in workspace settings.
 *
 * Resolves #588: Create Crisis Detection System
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { Prisma } from "@prisma/client";

import type { AutomationPauseStatus, PauseAutomationOptions } from "./types";

/**
 * Automation Pause Manager
 *
 * Controls the pause/resume state of all automations for a workspace.
 * Integrates with scheduled posts, relay drafts, and other automated systems.
 */
export class AutomationPauseManager {
  /**
   * Check if automations are paused for a workspace
   */
  static async isPaused(workspaceId: string): Promise<boolean> {
    const status = await this.getStatus(workspaceId);
    return status.isPaused;
  }

  /**
   * Get full pause status for a workspace
   */
  static async getStatus(workspaceId: string): Promise<AutomationPauseStatus> {
    const { data: workspace, error } = await tryCatch(
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      }),
    );

    if (error || !workspace) {
      return { isPaused: false };
    }

    const settings = workspace.settings as Record<string, unknown> | null;
    const crisisSettings = settings?.["crisis"] as Record<string, unknown> | undefined;

    if (!crisisSettings?.["automationPaused"]) {
      return { isPaused: false };
    }

    return {
      isPaused: true,
      pausedAt: crisisSettings["pausedAt"]
        ? new Date(crisisSettings["pausedAt"] as string)
        : undefined,
      pausedById: crisisSettings["pausedById"] as string | undefined,
      pauseReason: crisisSettings["pauseReason"] as string | undefined,
      relatedCrisisId: crisisSettings["relatedCrisisId"] as string | undefined,
      scheduledResume: crisisSettings["scheduledResume"]
        ? new Date(crisisSettings["scheduledResume"] as string)
        : undefined,
    };
  }

  /**
   * Pause all automations for a workspace
   */
  static async pauseAutomations(
    options: PauseAutomationOptions,
  ): Promise<boolean> {
    const { workspaceId, userId, reason, relatedCrisisId, scheduledResumeAt } = options;

    // Get current settings
    const { data: workspace, error: fetchError } = await tryCatch(
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      }),
    );

    if (fetchError || !workspace) {
      console.error("Failed to fetch workspace for pause:", fetchError);
      return false;
    }

    const currentSettings = (workspace.settings as Record<string, unknown>) || {};

    // Update settings with pause status
    const updatedSettings = {
      ...currentSettings,
      crisis: {
        ...(currentSettings["crisis"] as Record<string, unknown> | undefined),
        automationPaused: true,
        pausedAt: new Date().toISOString(),
        pausedById: userId,
        pauseReason: reason || "Crisis detected",
        relatedCrisisId,
        scheduledResume: scheduledResumeAt?.toISOString(),
      },
    };

    const { error: updateError } = await tryCatch(
      prisma.workspace.update({
        where: { id: workspaceId },
        data: { settings: updatedSettings as Prisma.InputJsonValue },
      }),
    );

    if (updateError) {
      console.error("Failed to pause automations:", updateError);
      return false;
    }

    return true;
  }

  /**
   * Resume all automations for a workspace
   */
  static async resumeAutomations(
    workspaceId: string,
    userId: string,
    notes?: string,
  ): Promise<boolean> {
    // Get current settings
    const { data: workspace, error: fetchError } = await tryCatch(
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      }),
    );

    if (fetchError || !workspace) {
      console.error("Failed to fetch workspace for resume:", fetchError);
      return false;
    }

    const currentSettings = (workspace.settings as Record<string, unknown>) || {};
    const crisisSettings = (currentSettings["crisis"] as Record<string, unknown>) || {};

    // Update settings to clear pause status
    const updatedSettings = {
      ...currentSettings,
      crisis: {
        ...crisisSettings,
        automationPaused: false,
        pausedAt: null,
        pausedById: null,
        pauseReason: null,
        relatedCrisisId: null,
        scheduledResume: null,
        lastResumedAt: new Date().toISOString(),
        lastResumedById: userId,
        resumeNotes: notes,
      },
    };

    const { error: updateError } = await tryCatch(
      prisma.workspace.update({
        where: { id: workspaceId },
        data: { settings: updatedSettings as Prisma.InputJsonValue },
      }),
    );

    if (updateError) {
      console.error("Failed to resume automations:", updateError);
      return false;
    }

    return true;
  }

  /**
   * Check if scheduled resume time has passed and auto-resume if needed
   */
  static async checkScheduledResume(workspaceId: string): Promise<boolean> {
    const status = await this.getStatus(workspaceId);

    if (!status.isPaused || !status.scheduledResume) {
      return false;
    }

    if (new Date() >= status.scheduledResume) {
      return this.resumeAutomations(
        workspaceId,
        "system",
        "Scheduled auto-resume",
      );
    }

    return false;
  }

  /**
   * Get pause history for a workspace (from audit logs)
   */
  static async getPauseHistory(
    workspaceId: string,
    limit = 10,
  ): Promise<
    Array<{
      action: "paused" | "resumed";
      timestamp: Date;
      userId: string;
      reason?: string;
    }>
  > {
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
    const crisisSettings = settings?.["crisis"] as Record<string, unknown> | undefined;
    const history = (crisisSettings?.["pauseHistory"] as Array<{
      action: "paused" | "resumed";
      timestamp: string;
      userId: string;
      reason?: string;
    }>) || [];

    return history.slice(0, limit).map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }));
  }
}
