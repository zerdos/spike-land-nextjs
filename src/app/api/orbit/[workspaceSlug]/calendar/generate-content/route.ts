/**
 * POST /api/orbit/[workspaceSlug]/calendar/generate-content
 * Generate AI content suggestions
 * Issue #841
 */

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateContentSuggestions } from "@/lib/calendar/ai-content-service";
import { z } from "zod";
import prisma from "@/lib/prisma";

const generateContentSchema = z.object({
  platform: z.enum(["LINKEDIN", "TWITTER", "FACEBOOK", "INSTAGRAM"]).optional(),
  count: z.number().min(1).max(20).optional().default(5),
  dateRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceSlug } = await params;

    // 2. Verify workspace membership
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 },
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const validatedData = generateContentSchema.parse(body);

    // 4. Call generateContentSuggestions
    const suggestions = await generateContentSuggestions({
      workspaceId: workspace.id,
      platform: validatedData.platform,
      count: validatedData.count,
      dateRange: validatedData.dateRange
        ? {
          start: new Date(validatedData.dateRange.start),
          end: new Date(validatedData.dateRange.end),
        }
        : undefined,
    });

    // 5. Return suggestions JSON
    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
