/**
 * Account Health Alerts API
 *
 * GET /api/orbit/[workspaceSlug]/accounts/health/alerts - Get health alert configuration
 * POST /api/orbit/[workspaceSlug]/accounts/health/alerts - Update health alert configuration
 *
 * Resolves #586: Implement Account Health Monitor
 */

import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getRecentHealthEvents, sendHealthAlerts } from "@/lib/health-monitor";
import type { HealthAlertConfig } from "@/lib/health-monitor";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * Build default alert config for a workspace
 */
function getDefaultAlertConfig(workspaceId: string): HealthAlertConfig {
  return {
    workspaceId,
    minSeverity: "WARNING",
    alertOnScoreBelow: 50,
    alertOnRateLimit: true,
    alertOnTokenExpiry: true,
    alertOnStatusChange: true,
    notifyChannels: ["email", "in_app"],
  };
}

/**
 * GET /api/orbit/[workspaceSlug]/accounts/health/alerts - Get alert config and recent alerts
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is a member
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        settings: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Get alert config from workspace settings (or use defaults)
  const settings = workspace.settings as Record<string, unknown> | null;
  const alertConfig: HealthAlertConfig = settings?.["healthAlerts"]
    ? (settings["healthAlerts"] as HealthAlertConfig)
    : getDefaultAlertConfig(workspace.id);

  // Get recent health events
  const recentEvents = await getRecentHealthEvents(workspace.id, 20);

  return NextResponse.json({
    config: alertConfig,
    recentEvents,
  });
}

/**
 * POST /api/orbit/[workspaceSlug]/accounts/health/alerts - Update alert config
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  const body = (await request.json()) as Partial<HealthAlertConfig>;

  // Find workspace and verify user is an admin/owner
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
            role: { in: ["OWNER", "ADMIN"] },
          },
        },
      },
      select: {
        id: true,
        settings: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Merge with existing settings
  const currentSettings = (workspace.settings as Record<string, unknown>) || {};
  const currentAlertConfig = currentSettings["healthAlerts"]
    ? (currentSettings["healthAlerts"] as HealthAlertConfig)
    : getDefaultAlertConfig(workspace.id);

  const newAlertConfig: HealthAlertConfig = {
    ...currentAlertConfig,
    ...body,
  };

  // Update workspace settings
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      settings: {
        ...currentSettings,
        healthAlerts: newAlertConfig,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    success: true,
    config: newAlertConfig,
  });
}

/**
 * PUT /api/orbit/[workspaceSlug]/accounts/health/alerts - Trigger alerts manually
 */
export async function PUT(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace and verify user is an admin/owner
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
            role: { in: ["OWNER", "ADMIN"] },
          },
        },
      },
      select: {
        id: true,
        settings: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Get alert config
  const settings = workspace.settings as Record<string, unknown> | null;
  const alertConfig: HealthAlertConfig = settings?.["healthAlerts"]
    ? (settings["healthAlerts"] as HealthAlertConfig)
    : getDefaultAlertConfig(workspace.id);

  // Check if alerts are enabled (via notification channels)
  if (!alertConfig.notifyChannels || alertConfig.notifyChannels.length === 0) {
    return NextResponse.json({
      success: false,
      message: "Alerts are disabled for this workspace",
      alertsSent: 0,
    });
  }

  // Send alerts
  const alertsSent = await sendHealthAlerts(workspace.id, alertConfig);

  return NextResponse.json({
    success: true,
    message: `Sent ${alertsSent} health alert(s)`,
    alertsSent,
  });
}
