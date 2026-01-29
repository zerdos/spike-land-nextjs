/**
 * Create Boost API
 *
 * Creates a new boost from an organic post
 *
 * POST /api/orbit/boost/create
 *
 * Resolves #521
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createBoost } from "@/lib/orbit/boost/boost-service";
import { generateAdCreative } from "@/lib/orbit/boost/ad-creative-generator";
import { generateTargetingSuggestions } from "@/lib/orbit/boost/targeting-suggestions";
import { NextResponse } from "next/server";
import type { SocialPlatform } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      originalPostId,
      platform,
      budget,
      currency,
      duration,
      workspaceSlug,
      destinationUrl,
    } = body;

    // Validate required fields
    if (!originalPostId || !platform || !budget || !duration || !workspaceSlug) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: originalPostId, platform, budget, duration, workspaceSlug",
        },
        { status: 400 },
      );
    }

    // Get workspace and verify access
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 404 },
      );
    }

    // Get the original post
    const originalPost = await db.socialPost.findUnique({
      where: { id: originalPostId },
      include: {
        performance: true,
      },
    });

    if (!originalPost) {
      return NextResponse.json(
        { error: "Original post not found" },
        { status: 404 },
      );
    }

    // Generate ad creative
    const creative = generateAdCreative(
      originalPost,
      platform as SocialPlatform,
      destinationUrl,
    );

    // Generate targeting suggestions
    const targetingSuggestions = generateTargetingSuggestions(
      originalPost.content,
      platform as SocialPlatform,
      originalPost.performance
        ? {
            engagementRate: Number(originalPost.performance.engagementRate),
          }
        : undefined,
    );

    // Create the boost
    const boost = await createBoost({
      originalPostId,
      platform: platform as SocialPlatform,
      budget: Number(budget),
      currency: currency || "USD",
      duration: Number(duration),
      workspaceId: workspace.id,
      createdById: session.user.id,
      targetingData: targetingSuggestions as unknown as Record<string, unknown>,
    });

    // Store audience suggestions
    await db.boostedPost.update({
      where: { id: boost.id },
      data: {
        audienceSuggestions: {
          creative,
          targeting: targetingSuggestions,
        } as Record<string, unknown>,
      },
    });

    return NextResponse.json({
      success: true,
      boost: {
        ...boost,
        creative,
        targetingSuggestions,
      },
    });
  } catch (error) {
    console.error("Error creating boost:", error);
    return NextResponse.json(
      {
        error: "Failed to create boost",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
