/**
 * Policy Rules API
 *
 * GET /api/orbit/[workspaceSlug]/policy/rules - List all policy rules
 * POST /api/orbit/[workspaceSlug]/policy/rules - Create a new workspace rule
 *
 * Query Parameters for GET:
 * - platform: Filter by platform (TWITTER, FACEBOOK, etc.)
 * - category: Filter by category (CONTENT_GUIDELINES, AD_COMPLIANCE, etc.)
 * - isActive: Filter by active status (true/false)
 *
 * Resolves #584: Build Policy Checker
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { createRule, getRulesForWorkspace } from "@/lib/policy-checker";
import type { PolicyRuleInput } from "@/lib/policy-checker";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { SocialPlatform } from "@prisma/client";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/policy/rules - List policy rules
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

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform") as SocialPlatform | null;
  const category = searchParams.get("category");
  const isActiveParam = searchParams.get("isActive");
  const isActive = isActiveParam === null
    ? undefined
    : isActiveParam === "true";

  // Get rules
  const { data: rules, error: rulesError } = await tryCatch(
    getRulesForWorkspace(workspace.id, {
      platform: platform ?? undefined,
      category: category ?? undefined,
      isActive,
    }),
  );

  if (rulesError) {
    console.error("Error fetching rules:", rulesError);
    return NextResponse.json({ error: "Failed to fetch rules" }, {
      status: 500,
    });
  }

  return NextResponse.json({
    rules,
    total: rules.length,
  });
}

/**
 * POST /api/orbit/[workspaceSlug]/policy/rules - Create a workspace rule
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

  // Parse request body
  const { data: body, error: parseError } = await tryCatch(request.json());
  if (parseError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json(
      { error: "name is required and must be a string" },
      { status: 400 },
    );
  }

  if (!body.description || typeof body.description !== "string") {
    return NextResponse.json(
      { error: "description is required and must be a string" },
      { status: 400 },
    );
  }

  if (!body.category) {
    return NextResponse.json({ error: "category is required" }, {
      status: 400,
    });
  }

  if (!body.ruleType) {
    return NextResponse.json({ error: "ruleType is required" }, {
      status: 400,
    });
  }

  if (!body.conditions || typeof body.conditions !== "object") {
    return NextResponse.json(
      { error: "conditions is required and must be an object" },
      { status: 400 },
    );
  }

  const ruleInput: PolicyRuleInput = {
    name: body.name,
    description: body.description,
    platform: body.platform ?? null,
    category: body.category,
    ruleType: body.ruleType,
    conditions: body.conditions,
    severity: body.severity,
    isBlocking: body.isBlocking,
    isActive: body.isActive,
    sourceUrl: body.sourceUrl,
  };

  // Create rule
  const { data: rule, error: createError } = await tryCatch(
    createRule(workspace.id, ruleInput),
  );

  if (createError) {
    console.error("Error creating rule:", createError);
    return NextResponse.json({ error: "Failed to create rule" }, {
      status: 500,
    });
  }

  return NextResponse.json(rule, { status: 201 });
}
