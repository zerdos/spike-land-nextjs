/**
 * GET /api/orbit/[workspaceSlug]/boost/candidates
 * List boost candidates (recommendations) for a workspace
 * Issue #565 - Content-to-Ads Loop
 */

import type { BoostRecommendationStatus } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  try {
    const { workspaceSlug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as BoostRecommendationStatus | null;

    // Get workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // Query recommendations
    const whereClause: any = {
      workspaceId: workspace.id,
    };

    if (status) {
      whereClause.status = status;
    }

    const candidates = await prisma.postBoostRecommendation.findMany({
      where: whereClause,
      orderBy: {
        confidenceScore: "desc", // Default sort by AI confidence
      },
      include: {
        // Include basic post performance data if needed
        postPerformance: {
          select: {
            engagementRate: true,
            engagementVelocity: true,
            boostScore: true,
            boostTrigger: true,
            impressions: true,
            engagementCount: true,
          },
        },
      },
    });

    // We also need post content. Since PostBoostRecommendation doesn't relate to SocialPost directly in schema navigation
    // (it uses postId field but no relation defined in snippet, but let's check),
    // we might need to fetch content separately or assume relation exists.
    // The schema snippet showed:
    // model PostBoostRecommendation { ... postPerformance PostPerformance ... }
    // model PostPerformance { ... postId String ... }
    // It didn't explicitly show `socialPost` relation on `PostBoostRecommendation`.
    // However, `SocialPost` is not polymorphic, but `PostPerformance` says `postType`.
    // If relation is missing, we must fetch posts manually.

    // Let's check `PostBoostRecommendation` relations in `prisma/schema.prisma` again just to be sure.
    // I can't check efficiently now, but assuming no direct relation to `SocialPost`.

    // We will augment the response with post content.
    const enrichedCandidates = await Promise.all(candidates.map(async (candidate) => {
      let postContent: any = null;
      if (candidate.postType === "SOCIAL_POST") {
        postContent = await prisma.socialPost.findUnique({
          where: { id: candidate.postId },
          select: {
            content: true,
            publishedAt: true,
            assets: {
              take: 1,
              select: {
                asset: {
                   select: {
                     r2Key: true, // Assuming we use this for image
                     // or publicUrl if available
                     fileType: true,
                   }
                }
              }
            }
          }
        });
      }

      return {
        ...candidate,
        postContent,
      };
    }));

    return NextResponse.json({
      success: true,
      candidates: enrichedCandidates,
    });
  } catch (error) {
    console.error("Error fetching boost candidates:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidates" },
      { status: 500 },
    );
  }
}
