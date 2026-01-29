import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { getUserFavorites, getUserRecentWorkspaces } from "@/lib/workspace/aggregate-queries";
import { WorkspaceService } from "@/lib/workspace/workspace-service";
import { NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for workspace creation
const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(
    50,
    "Name must be at most 50 characters",
  ),
  description: z.string().max(200, "Description must be at most 200 characters").optional(),
  isPersonal: z.boolean().optional().default(false),
});


// GET /api/workspaces - List user's workspaces with favorites and recents
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch workspaces, favorites, and recent access in parallel
  const [membershipsResult, favoritesResult, recentsResult] = await Promise.all([
    tryCatch(
      prisma.workspaceMember.findMany({
        where: {
          userId: session.user.id,
          joinedAt: { not: null }, // Only include accepted memberships
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              avatarUrl: true,
              isPersonal: true,
            },
          },
        },
        orderBy: [
          { workspace: { isPersonal: "desc" } }, // Personal workspace first
          { workspace: { name: "asc" } },
        ],
      }),
    ),
    tryCatch(getUserFavorites(session.user.id)),
    tryCatch(getUserRecentWorkspaces(session.user.id, 10)),
  ]);

  if (membershipsResult.error) {
    console.error("Failed to fetch workspaces:", membershipsResult.error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 },
    );
  }

  // Log but don't fail if favorites/recents fail - they're optional enhancements
  if (favoritesResult.error) {
    console.error("Failed to fetch favorites:", favoritesResult.error);
  }
  if (recentsResult.error) {
    console.error("Failed to fetch recent workspaces:", recentsResult.error);
  }

  const favoriteIds = favoritesResult.data || [];
  const recentIds = recentsResult.data || [];
  const favoriteSet = new Set(favoriteIds);

  return NextResponse.json({
    workspaces: membershipsResult.data.map((m) => ({
      ...m.workspace,
      role: m.role,
      isFavorite: favoriteSet.has(m.workspace.id),
    })),
    favorites: favoriteIds,
    recentIds: recentIds,
  });
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request body
  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = createWorkspaceSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  // Use WorkspaceService to create workspace
  const { data: result, error: createError } = await tryCatch(
    WorkspaceService.createWorkspace(session.user.id, validation.data)
  );

  if (createError) {
    console.error("Failed to create workspace:", createError);
    // Return 400 if it's a limit error, otherwise 500
    const status = createError instanceof Error && createError.message.includes("limit") ? 400 : 500;
    return NextResponse.json(
      { error: createError instanceof Error ? createError.message : "Failed to create workspace" },
      { status: status },
    );
  }

  return NextResponse.json({ workspace: result }, { status: 201 });
}
