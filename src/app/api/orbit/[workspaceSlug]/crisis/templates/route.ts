/**
 * Crisis Response Templates API
 *
 * GET /api/orbit/[workspaceSlug]/crisis/templates - List response templates
 * POST /api/orbit/[workspaceSlug]/crisis/templates - Create template
 *
 * Query Parameters for GET:
 * - category: Filter by category
 * - platform: Filter by platform
 * - activeOnly: Only active templates (default: true)
 *
 * Resolves #588: Create Crisis Detection System
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { CrisisResponseTemplates } from "@/lib/crisis";
import type { CreateTemplateOptions, TemplateCategory, TemplateSearchParams } from "@/lib/crisis";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { SocialPlatform } from "@prisma/client";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/crisis/templates - List response templates
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Parse search parameters
  const searchParams = request.nextUrl.searchParams;

  const searchOptions: TemplateSearchParams = {
    workspaceId: workspace.id,
    isActive: searchParams.get("activeOnly") !== "false",
  };

  const category = searchParams.get("category") as TemplateCategory | null;
  if (category) {
    searchOptions.category = category;
  }

  const platform = searchParams.get("platform") as SocialPlatform | null;
  if (platform) {
    searchOptions.platform = platform;
  }

  const limit = searchParams.get("limit");
  if (limit) {
    searchOptions.limit = Math.min(parseInt(limit, 10) || 50, 100);
  }

  const offset = searchParams.get("offset");
  if (offset) {
    searchOptions.offset = parseInt(offset, 10) || 0;
  }

  // Search templates
  const result = await CrisisResponseTemplates.search(searchOptions);

  return NextResponse.json(result);
}

/**
 * POST /api/orbit/[workspaceSlug]/crisis/templates - Create template
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is admin/owner
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
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or insufficient permissions" },
      { status: 404 },
    );
  }

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, category, platform, content, variables, isActive } = body as Partial<
    CreateTemplateOptions
  >;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  // Create template
  const template = await CrisisResponseTemplates.create({
    workspaceId: workspace.id,
    name,
    category,
    platform,
    content,
    variables: variables || [],
    isActive: isActive ?? true,
  });

  if (!template) {
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }

  return NextResponse.json(template, { status: 201 });
}
