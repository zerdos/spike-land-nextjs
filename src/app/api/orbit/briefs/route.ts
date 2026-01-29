import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BriefService } from "@/lib/briefs/brief-service";
import { completeBriefSchema } from "@/lib/validation/brief";

/**
 * GET /api/orbit/briefs
 * List all briefs for the current user
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const { briefs, total } = await BriefService.listBriefs(session.user.id, {
      status,
      limit,
      offset,
    });

    return NextResponse.json({ briefs, total });
  } catch (error) {
    console.error("Error listing briefs:", error);
    return NextResponse.json(
      { error: "Failed to list briefs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orbit/briefs
 * Create a new brief
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the input
    const validationResult = completeBriefSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { name, targetAudience, campaignObjectives, creativeRequirements } = validationResult.data;

    const brief = await BriefService.createBrief({
      name,
      userId: session.user.id,
      targetAudience,
      campaignObjectives,
      creativeRequirements,
    });

    return NextResponse.json(brief, { status: 201 });
  } catch (error) {
    console.error("Error creating brief:", error);
    return NextResponse.json(
      { error: "Failed to create brief" },
      { status: 500 }
    );
  }
}
