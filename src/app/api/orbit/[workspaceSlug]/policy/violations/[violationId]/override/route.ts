/**
 * Policy Violation Override API
 *
 * POST /api/orbit/[workspaceSlug]/policy/violations/[violationId]/override - Override a violation
 * DELETE /api/orbit/[workspaceSlug]/policy/violations/[violationId]/override - Remove override
 *
 * Request Body for POST:
 * - reason: string (required)
 *
 * Resolves #584: Build Policy Checker
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getViolation, overrideViolation, removeOverride } from "@/lib/policy-checker";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; violationId: string; }>;
}

/**
 * POST /api/orbit/[workspaceSlug]/policy/violations/[violationId]/override - Override a violation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, violationId } = await params;

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
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Get violation
  const { data: violation, error: violationError } = await tryCatch(
    getViolation(violationId),
  );

  if (violationError || !violation) {
    return NextResponse.json({ error: "Violation not found" }, { status: 404 });
  }

  // Verify violation belongs to this workspace
  if (violation.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Violation not found" }, { status: 404 });
  }

  // Parse request body
  const { data: body, error: parseError } = await tryCatch(request.json());
  if (parseError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (!body.reason || typeof body.reason !== "string") {
    return NextResponse.json(
      { error: "reason is required and must be a string" },
      { status: 400 },
    );
  }

  // Override violation
  const { data: updatedViolation, error: overrideError } = await tryCatch(
    overrideViolation(violationId, session.user.id, body.reason),
  );

  if (overrideError) {
    console.error("Error overriding violation:", overrideError);
    return NextResponse.json({ error: "Failed to override violation" }, {
      status: 500,
    });
  }

  return NextResponse.json(updatedViolation);
}

/**
 * DELETE /api/orbit/[workspaceSlug]/policy/violations/[violationId]/override - Remove override
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, violationId } = await params;

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
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Get violation
  const { data: violation, error: violationError } = await tryCatch(
    getViolation(violationId),
  );

  if (violationError || !violation) {
    return NextResponse.json({ error: "Violation not found" }, { status: 404 });
  }

  // Verify violation belongs to this workspace
  if (violation.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Violation not found" }, { status: 404 });
  }

  // Remove override
  const { data: updatedViolation, error: removeError } = await tryCatch(
    removeOverride(violationId),
  );

  if (removeError) {
    console.error("Error removing override:", removeError);
    return NextResponse.json({ error: "Failed to remove override" }, {
      status: 500,
    });
  }

  return NextResponse.json(updatedViolation);
}
