/**
 * POST /api/orbit/[workspaceSlug]/calendar/generate-content
 * Generate AI content suggestions
 * Issue #841
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateContentSuggestions } from "@/lib/calendar/ai-content-service";
import { SOCIAL_PLATFORMS } from "@/lib/constants/social-platforms";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { z } from "zod";

const generateContentSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS).optional(),
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
  // 1. Authenticate user
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceSlug } = await params;

  // 2. Verify workspace membership
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    }),
  );

  if (workspaceError) {
    return NextResponse.json(
      { error: "Failed to fetch workspace" },
      { status: 500 },
    );
  }

  if (!workspace || workspace.members.length === 0) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 403 },
    );
  }

  // 3. Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());
  if (bodyError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parseResult = generateContentSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: parseResult.error.issues },
      { status: 400 },
    );
  }

  const validatedData = parseResult.data;

  // 4. Call generateContentSuggestions
  const { data: suggestions, error: suggestionsError } = await tryCatch(
    generateContentSuggestions({
      workspaceId: workspace.id,
      platform: validatedData.platform,
      count: validatedData.count,
      dateRange: validatedData.dateRange
        ? {
            start: new Date(validatedData.dateRange.start),
            end: new Date(validatedData.dateRange.end),
          }
        : undefined,
    }),
  );

  if (suggestionsError) {
    return NextResponse.json(
      {
        error: suggestionsError instanceof Error
          ? suggestionsError.message
          : "Failed to generate content suggestions",
      },
      { status: 500 },
    );
  }

  // 5. Return suggestions JSON
  return NextResponse.json({
    success: true,
    suggestions,
    count: suggestions.length,
  });
}
