import { auth } from "@/auth";
import {
  createGenerationJob,
  type GenerationJobParams,
  processGenerationJob,
} from "@/lib/creative-factory/variant-generator";
import { after, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";

import logger from "@/lib/logger";

const generateSchema = z.object({
  workspaceId: z.string(),
  briefId: z.string().optional(),
  seedContent: z.string().optional(),
  count: z.number().min(1).max(10).default(3),
  tone: z.string().optional(),
  length: z.enum(["short", "medium", "long"]).optional(),
  includeImages: z.boolean().default(false),
  targetAudience: z.string().optional(),
  platform: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const json = await req.json();
    const body = generateSchema.parse(json);

    // Verify workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          userId: session.user.id,
          workspaceId: body.workspaceId,
        },
      },
    });

    if (!membership) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!body.briefId && !body.seedContent) {
      return new NextResponse("Brief ID or seed content is required", { status: 400 });
    }

    const jobParams: GenerationJobParams = {
      userId: session.user.id,
      briefId: body.briefId,
      seedContent: body.seedContent,
      count: body.count,
      tone: body.tone,
      targetLength: body.length,
      includeImages: body.includeImages,
      targetAudience: body.targetAudience,
      platform: body.platform,
    };

    const { id, contentToUse, audienceToUse } = await createGenerationJob(jobParams);

    // Use Next.js `after` to ensure background task completes
    after(async () => {
      await processGenerationJob(id, jobParams, contentToUse, audienceToUse);
    });

    return NextResponse.json({ setId: id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    logger.error("Variant generation error:", { error });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
