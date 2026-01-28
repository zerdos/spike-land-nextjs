/**
 * Scout Competitors Collection API
 *
 * Provides endpoints for listing and creating competitors.
 * Supports both legacy (platform + handle) and new (name + socialHandles) formats.
 *
 * Resolves #871
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { addCompetitor } from "@/lib/scout/competitor-tracker";
import {
  createCompetitorRequestSchema,
  legacyAddCompetitorRequestSchema,
} from "@/lib/validations/scout-competitor";
import { SocialPlatform } from "@prisma/client";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

// Helper to convert lowercase platform keys to SocialPlatform enum
function toPlatformEnum(key: string): SocialPlatform {
  const mapping: Record<string, SocialPlatform> = {
    twitter: SocialPlatform.TWITTER,
    linkedin: SocialPlatform.LINKEDIN,
    instagram: SocialPlatform.INSTAGRAM,
    facebook: SocialPlatform.FACEBOOK,
  };
  const platform = mapping[key.toLowerCase()];
  if (!platform) {
    console.warn(
      `Unknown platform "${key}" in competitor request, defaulting to TWITTER`,
    );
    return SocialPlatform.TWITTER;
  }
  return platform;
}

// GET - Fetches all competitors for a workspace with metrics
export async function GET(_request: Request, { params }: RouteParams) {
  const { workspaceSlug } = await params;
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find workspace by slug and verify user is a member
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    const competitors = await prisma.scoutCompetitor.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    // Transform to include metrics
    const result = competitors.map((competitor) => ({
      id: competitor.id,
      workspaceId: competitor.workspaceId,
      platform: competitor.platform,
      handle: competitor.handle,
      name: competitor.name,
      isActive: competitor.isActive,
      createdAt: competitor.createdAt,
      updatedAt: competitor.updatedAt,
      metrics: {
        postsTracked: competitor._count.posts,
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch competitors:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}

// POST - Adds a new competitor to a workspace
// Supports both legacy format (platform + handle) and new format (name + socialHandles)
export async function POST(request: Request, { params }: RouteParams) {
  const { workspaceSlug } = await params;
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find workspace by slug and verify user is a member
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    const body = await request.json();

    // Try to parse as legacy format first
    const legacyResult = legacyAddCompetitorRequestSchema.safeParse(body);
    if (legacyResult.success) {
      // Legacy format: platform + handle
      const { platform, handle } = legacyResult.data;

      const competitor = await addCompetitor(
        workspace.id,
        platform as SocialPlatform,
        handle,
      );

      if (!competitor) {
        return NextResponse.json(
          { error: "Failed to validate or add competitor" },
          { status: 400 },
        );
      }

      return NextResponse.json(competitor, { status: 201 });
    }

    // Try to parse as new format
    const newResult = createCompetitorRequestSchema.safeParse(body);
    if (newResult.success) {
      // New format: name + socialHandles + optional website
      const { name, website, socialHandles } = newResult.data;

      // Create competitors for each provided social handle
      const createdCompetitors = [];
      const errors = [];

      for (const [platformKey, handle] of Object.entries(socialHandles)) {
        if (!handle) continue;

        const platform = toPlatformEnum(platformKey);
        const competitor = await addCompetitor(workspace.id, platform, handle);

        if (competitor) {
          // Update the competitor with the name
          const updated = await prisma.scoutCompetitor.update({
            where: { id: competitor.id },
            data: { name },
          });
          createdCompetitors.push(updated);
        } else {
          errors.push({ platform: platformKey, handle, error: "Failed to add" });
        }
      }

      if (createdCompetitors.length === 0) {
        return NextResponse.json(
          {
            error: "Failed to add any competitors",
            details: errors,
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          competitor: createdCompetitors[0],
          allCompetitors: createdCompetitors,
          website: website || null,
          errors: errors.length > 0 ? errors : undefined,
        },
        { status: 201 },
      );
    }

    // Neither format matched - return validation error
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: legacyResult.error?.issues || newResult.error?.issues,
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Failed to add competitor:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}
