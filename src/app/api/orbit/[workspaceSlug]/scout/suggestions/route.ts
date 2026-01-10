/**
 * Scout Content Suggestions API
 *
 * GET: List suggestions with filtering
 * POST: Generate new suggestions
 */

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSuggestions } from "@/lib/scout/suggestion-generator";
import {
  getSuggestionStats,
  querySuggestions,
  saveSuggestionsBatch,
} from "@/lib/scout/suggestion-manager";
import type { ContentType, SuggestionPlatform, SuggestionStatus } from "@/lib/scout/types";

interface RouteContext {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/scout/suggestions
 *
 * List content suggestions with optional filtering
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceSlug } = await context.params;

    // Find workspace
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
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Parse query params
    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.split(",") as SuggestionStatus[] | undefined;
    const contentTypes = url.searchParams.get("contentTypes")?.split(",") as
      | ContentType[]
      | undefined;
    const platforms = url.searchParams.get("platforms")?.split(",") as
      | SuggestionPlatform[]
      | undefined;
    const minScore = url.searchParams.get("minScore")
      ? parseFloat(url.searchParams.get("minScore")!)
      : undefined;
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!, 10)
      : 20;
    const offset = url.searchParams.get("offset")
      ? parseInt(url.searchParams.get("offset")!, 10)
      : 0;
    const sortBy = (url.searchParams.get("sortBy") as "score" | "generatedAt" | "expiresAt") ??
      "score";
    const sortOrder = (url.searchParams.get("sortOrder") as "asc" | "desc") ?? "desc";
    const includeStats = url.searchParams.get("includeStats") === "true";

    // Query suggestions
    const result = await querySuggestions({
      workspaceId: workspace.id,
      status,
      contentTypes,
      platforms,
      minScore,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Optionally include stats
    let stats;
    if (includeStats) {
      stats = await getSuggestionStats(workspace.id);
    }

    return NextResponse.json({
      suggestions: result.suggestions,
      total: result.total,
      limit,
      offset,
      stats,
    });
  } catch (error) {
    console.error("Failed to list suggestions:", error);
    return NextResponse.json({ error: "Failed to list suggestions" }, { status: 500 });
  }
}

/**
 * POST /api/orbit/[workspaceSlug]/scout/suggestions
 *
 * Generate new content suggestions
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceSlug } = await context.params;

    // Find workspace with brand profile
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        brandProfile: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { topics, competitors, maxSuggestions, contentTypes, platforms } = body;

    // Build brand voice context from brand profile
    const brandVoice = workspace.brandProfile
      ? {
        tone: Array.isArray(workspace.brandProfile.toneDescriptors)
          ? (workspace.brandProfile.toneDescriptors as string[]).join(", ")
          : "professional",
        style: "informative",
        values: Array.isArray(workspace.brandProfile.values)
          ? (workspace.brandProfile.values as string[])
          : [],
        keywords: [],
        avoidWords: [],
      }
      : undefined;

    // Generate suggestions
    const result = await generateSuggestions({
      workspaceId: workspace.id,
      brandVoice,
      topics,
      competitors,
      maxSuggestions: maxSuggestions ?? 10,
      contentTypes,
      platforms,
    });

    // Save generated suggestions
    if (result.suggestions.length > 0) {
      await saveSuggestionsBatch(result.suggestions);
    }

    return NextResponse.json({
      suggestions: result.suggestions,
      generatedCount: result.generatedCount,
      processingTimeMs: result.processingTimeMs,
      topicsAnalyzed: result.topicsAnalyzed,
      competitorsAnalyzed: result.competitorsAnalyzed,
    });
  } catch (error) {
    console.error("Failed to generate suggestions:", error);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
