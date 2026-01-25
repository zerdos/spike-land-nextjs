import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { addCompetitor } from "@/lib/scout/competitor-tracker";
import { SocialPlatform } from "@prisma/client";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

// GET - Fetches all competitors for a workspace
export async function GET(
  _request: Request,
  { params }: RouteParams,
) {
  const { workspaceSlug } = await params;
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find workspace by slug and verify user is a member
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    const competitors = await prisma.scoutCompetitor.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(competitors);
  } catch (error) {
    console.error("Failed to fetch competitors:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}

// POST - Adds a new competitor to a workspace
export async function POST(
  request: Request,
  { params }: RouteParams,
) {
  const { workspaceSlug } = await params;
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find workspace by slug and verify user is a member
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    const { platform, handle } = await request.json();

    if (!platform || !handle) {
      return NextResponse.json({ error: "Platform and handle are required" }, {
        status: 400,
      });
    }

    // Validate platform enum value
    const validPlatforms = Object.values(SocialPlatform);
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform value" }, {
        status: 400,
      });
    }

    // Validate handle is not empty
    if (typeof handle !== "string" || handle.trim() === "") {
      return NextResponse.json({ error: "Handle must be a non-empty string" }, {
        status: 400,
      });
    }

    const competitor = await addCompetitor(
      workspace.id,
      platform as SocialPlatform,
      handle.trim(),
    );

    if (!competitor) {
      return NextResponse.json({
        error: "Failed to validate or add competitor",
      }, { status: 400 });
    }

    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error("Failed to add competitor:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}
