import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { runTopicMonitoring } from "@/lib/scout/topic-monitor";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

// Trigger the topic monitoring process for a workspace
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: { some: { userId: session.user.id } },
      },
      select: { id: true },
    });

    if (!workspace) return new Response("Workspace not found", { status: 404 });

    // Although the monitoring is triggered, we don't wait for it to complete.
    // In a real-world scenario, this would be a long-running task,
    // so we trigger it asynchronously.
    runTopicMonitoring(workspace.id);

    return NextResponse.json({
      message: "Topic monitoring has been triggered.",
    });
  } catch (error) {
    console.error("Error in POST /trigger:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
