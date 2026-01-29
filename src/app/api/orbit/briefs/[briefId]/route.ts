import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BriefService } from "@/lib/briefs/brief-service";

/**
 * GET /api/orbit/briefs/[briefId]
 * Get a specific brief by ID
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ briefId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { briefId } = await params;

    const brief = await BriefService.getBrief(briefId, session.user.id);

    if (!brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    return NextResponse.json(brief);
  } catch (error) {
    console.error("Error getting brief:", error);
    return NextResponse.json(
      { error: "Failed to get brief" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orbit/briefs/[briefId]
 * Update a brief
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ briefId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { briefId } = await params;
    const body = await request.json();

    const brief = await BriefService.updateBrief(
      briefId,
      session.user.id,
      body
    );

    return NextResponse.json(brief);
  } catch (error) {
    console.error("Error updating brief:", error);

    if (error instanceof Error && error.message === "Brief not found") {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update brief" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orbit/briefs/[briefId]
 * Delete (archive) a brief
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ briefId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { briefId } = await params;

    await BriefService.deleteBrief(briefId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting brief:", error);

    if (error instanceof Error && error.message === "Brief not found") {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete brief" },
      { status: 500 }
    );
  }
}
