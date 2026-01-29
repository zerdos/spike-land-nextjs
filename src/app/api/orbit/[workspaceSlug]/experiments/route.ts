/**
 * Experiments API - Epic #516
 *
 * CRUD operations for generic experiments with pluggable adapters.
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import {
  createExperiment,
  listExperiments,
} from "@/lib/hypothesis-agent/core/experiment-manager";
import type { ExperimentStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ workspaceSlug: string }>;
}

// Validation schemas
const createExperimentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  contentType: z.string(),
  adapterConfig: z.record(z.unknown()).optional(),
  significanceLevel: z.number().min(0.8).max(0.999).default(0.95),
  minimumSampleSize: z.number().int().min(10).default(100),
  winnerStrategy: z
    .enum(["IMMEDIATE", "CONSERVATIVE", "ECONOMIC", "SAFETY_FIRST"])
    .default("CONSERVATIVE"),
  autoSelectWinner: z.boolean().default(false),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        content: z.record(z.unknown()),
        splitPercentage: z.number().min(0).max(100).optional(),
        isControl: z.boolean().optional(),
      })
    )
    .min(2)
    .max(10),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/orbit/[workspaceSlug]/experiments
 * List all experiments for workspace
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace and verify membership
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: { userId: session.user.id },
        },
      },
      select: { id: true },
    })
  );

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Query parameters
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") as ExperimentStatus | null;
  const contentType = searchParams.get("contentType");
  const tagsParam = searchParams.get("tags");
  const tags = tagsParam ? tagsParam.split(",") : undefined;

  // Fetch experiments
  const { data: experiments, error: experimentsError } = await tryCatch(
    listExperiments(workspace.id, {
      ...(status && { status }),
      ...(contentType && { contentType }),
      ...(tags && { tags }),
    })
  );

  if (experimentsError) {
    return NextResponse.json({ error: "Failed to fetch experiments" }, { status: 500 });
  }

  return NextResponse.json({ experiments });
}

/**
 * POST /api/orbit/[workspaceSlug]/experiments
 * Create a new experiment
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify workspace permission
  const { data: workspace, error: permissionError } = await requireWorkspacePermission(
    workspaceSlug,
    session.user.id,
    "CREATE_EXPERIMENT"
  );

  if (permissionError || !workspace) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate request
  const validation = createExperimentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const data = validation.data;

  // Create experiment
  const { data: experiment, error: createError } = await tryCatch(
    createExperiment(workspace.id, data)
  );

  if (createError) {
    return NextResponse.json(
      { error: "Failed to create experiment", details: createError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ experiment }, { status: 201 });
}
