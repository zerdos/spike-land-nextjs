import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

/**
 * List folders for workspace (with asset counts)
 * GET /api/orbit/assets/folders?workspaceId=xxx
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Missing required parameter: workspaceId" },
      { status: 400 },
    );
  }

  // Check read permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "asset:read"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Fetch folders with asset counts and nested structure
  const { data: folders, error: foldersError } = await tryCatch(
    prisma.assetFolder.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            assets: true,
            children: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  );

  if (foldersError || !folders) {
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 },
    );
  }

  return NextResponse.json({ folders });
}

/**
 * Create new folder
 * POST /api/orbit/assets/folders
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { workspaceId, name, parentId } = body as {
    workspaceId: string;
    name: string;
    parentId?: string;
  };

  if (!workspaceId || !name) {
    return NextResponse.json(
      { error: "Missing required fields: workspaceId and name" },
      { status: 400 },
    );
  }

  // Check write permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "asset:write"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Validate parent folder if provided
  if (parentId) {
    const { data: parent, error: parentError } = await tryCatch(
      prisma.assetFolder.findUnique({
        where: { id: parentId, workspaceId },
      }),
    );

    if (parentError || !parent) {
      return NextResponse.json(
        { error: "Invalid parent folder ID" },
        { status: 400 },
      );
    }
  }

  // Check for duplicate folder name in same parent
  const { data: existingFolder } = await tryCatch(
    prisma.assetFolder.findFirst({
      where: {
        workspaceId,
        name: name.trim(),
        parentId: parentId || null,
      },
    }),
  );

  if (existingFolder) {
    return NextResponse.json(
      {
        error: parentId
          ? "A folder with this name already exists in the parent folder"
          : "A folder with this name already exists at root level",
      },
      { status: 409 },
    );
  }

  // Create folder
  const { data: folder, error: createError } = await tryCatch(
    prisma.assetFolder.create({
      data: {
        workspaceId,
        name: name.trim(),
        parentId: parentId || null,
        createdById: session!.user!.id,
      },
      include: {
        _count: {
          select: {
            assets: true,
            children: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  );

  if (createError || !folder) {
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 },
    );
  }

  return NextResponse.json({ folder }, { status: 201 });
}

/**
 * Update folder (rename)
 * PATCH /api/orbit/assets/folders
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { folderId, name } = body as {
    folderId: string;
    name: string;
  };

  if (!folderId || !name) {
    return NextResponse.json(
      { error: "Missing required fields: folderId and name" },
      { status: 400 },
    );
  }

  // Fetch folder to get workspaceId
  const { data: existingFolder, error: fetchError } = await tryCatch(
    prisma.assetFolder.findUnique({
      where: { id: folderId },
      select: { workspaceId: true, parentId: true },
    }),
  );

  if (fetchError || !existingFolder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Check write permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(
      session,
      existingFolder.workspaceId,
      "asset:write",
    ),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Check for duplicate name in same parent
  const { data: duplicateFolder } = await tryCatch(
    prisma.assetFolder.findFirst({
      where: {
        workspaceId: existingFolder.workspaceId,
        name: name.trim(),
        parentId: existingFolder.parentId,
        id: { not: folderId }, // Exclude current folder
      },
    }),
  );

  if (duplicateFolder) {
    return NextResponse.json(
      { error: "A folder with this name already exists in the same location" },
      { status: 409 },
    );
  }

  // Update folder
  const { data: folder, error: updateError } = await tryCatch(
    prisma.assetFolder.update({
      where: { id: folderId },
      data: { name: name.trim() },
      include: {
        _count: {
          select: {
            assets: true,
            children: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  );

  if (updateError || !folder) {
    return NextResponse.json(
      { error: "Failed to update folder" },
      { status: 500 },
    );
  }

  return NextResponse.json({ folder });
}

/**
 * Delete folder
 * DELETE /api/orbit/assets/folders?folderId=xxx&cascade=true
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  const folderId = searchParams.get("folderId");
  const cascade = searchParams.get("cascade") === "true";

  if (!folderId) {
    return NextResponse.json(
      { error: "Missing required parameter: folderId" },
      { status: 400 },
    );
  }

  // Fetch folder to get workspaceId and check if empty
  const { data: folder, error: fetchError } = await tryCatch(
    prisma.assetFolder.findUnique({
      where: { id: folderId },
      include: {
        _count: {
          select: {
            assets: true,
            children: true,
          },
        },
      },
    }),
  );

  if (fetchError || !folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Check delete permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, folder.workspaceId, "asset:write"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Check if folder is empty (unless cascade is enabled)
  if (!cascade && (folder._count.assets > 0 || folder._count.children > 0)) {
    return NextResponse.json(
      {
        error:
          "Folder is not empty. Move assets and subfolders first, or use cascade=true to delete everything",
      },
      { status: 400 },
    );
  }

  // Delete folder (cascade is handled by Prisma schema)
  const { error: deleteError } = await tryCatch(
    prisma.assetFolder.delete({
      where: { id: folderId },
    }),
  );

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
