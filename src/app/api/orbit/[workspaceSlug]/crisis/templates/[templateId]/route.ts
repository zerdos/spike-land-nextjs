/**
 * Crisis Response Template Detail API
 *
 * GET /api/orbit/[workspaceSlug]/crisis/templates/[templateId] - Get template
 * PUT /api/orbit/[workspaceSlug]/crisis/templates/[templateId] - Update template
 * DELETE /api/orbit/[workspaceSlug]/crisis/templates/[templateId] - Delete template
 *
 * Resolves #588: Create Crisis Detection System
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { CrisisResponseTemplates } from "@/lib/crisis";
import type { UpdateTemplateOptions } from "@/lib/crisis";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; templateId: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/crisis/templates/[templateId] - Get template
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, templateId } = await params;

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

  // Get template
  const template = await CrisisResponseTemplates.getById(templateId);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Verify template belongs to this workspace or is a system template
  if (template.workspaceId !== null && template.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

/**
 * PUT /api/orbit/[workspaceSlug]/crisis/templates/[templateId] - Update template
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, templateId } = await params;

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

  // Get existing template
  const existingTemplate = await CrisisResponseTemplates.getById(templateId);

  if (!existingTemplate) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Can only update workspace templates, not system templates
  if (existingTemplate.workspaceId === null) {
    return NextResponse.json(
      { error: "System templates cannot be modified" },
      { status: 403 },
    );
  }

  // Verify template belongs to this workspace
  if (existingTemplate.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, category, platform, content, variables, isActive } = body as Partial<
    UpdateTemplateOptions
  >;

  // Update template
  const updatedTemplate = await CrisisResponseTemplates.update(templateId, {
    name,
    category,
    platform,
    content,
    variables,
    isActive,
  });

  if (!updatedTemplate) {
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 },
    );
  }

  return NextResponse.json(updatedTemplate);
}

/**
 * DELETE /api/orbit/[workspaceSlug]/crisis/templates/[templateId] - Delete template
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, templateId } = await params;

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

  // Get existing template
  const existingTemplate = await CrisisResponseTemplates.getById(templateId);

  if (!existingTemplate) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Can only delete workspace templates, not system templates
  if (existingTemplate.workspaceId === null) {
    return NextResponse.json(
      { error: "System templates cannot be deleted" },
      { status: 403 },
    );
  }

  // Verify template belongs to this workspace
  if (existingTemplate.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Delete template
  const deleted = await CrisisResponseTemplates.delete(templateId);

  if (!deleted) {
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
