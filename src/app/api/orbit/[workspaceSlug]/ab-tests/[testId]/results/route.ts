/**
 * A/B Test Results & Significance Calculation
 *
 * Calculates statistical significance using two-proportion z-test.
 * Resolves #840
 */

import { auth } from "@/auth";
import { calculateSignificance } from "@/lib/ab-test/significance-calculator";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { SignificanceResult } from "@/types/ab-test";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; testId: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/ab-tests/[testId]/results
 * Calculate and return statistical significance for A/B test
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { workspaceSlug, testId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: { userId: session.user.id },
        },
      },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    await requireWorkspacePermission(session, workspace.id, "analytics:view");

    // Fetch test with variants
    const { data: test, error: testError } = await tryCatch(
      prisma.socialPostAbTest.findFirst({
        where: {
          id: testId,
          workspaceId: workspace.id,
        },
        include: {
          variants: true,
        },
      }),
    );

    if (testError || !test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Calculate significance
    const significance: SignificanceResult = calculateSignificance(
      test.variants,
      test.significanceLevel,
    );

    // Auto-declare winner if significant and test is running
    if (
      significance.isSignificant &&
      significance.winnerVariantId &&
      test.status === "RUNNING"
    ) {
      await prisma.socialPostAbTest.update({
        where: { id: testId },
        data: {
          winnerVariantId: significance.winnerVariantId,
          status: "COMPLETED",
        },
      });
    }

    return NextResponse.json({
      test,
      significance,
    });
  } catch (error: unknown) {
    console.error("Failed to get test results:", error);
    return NextResponse.json(
      { error: "Failed to get test results" },
      { status: 500 },
    );
  }
}
