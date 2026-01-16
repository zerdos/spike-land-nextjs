import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createTopic, createTopicSchema, listTopicsByWorkspace } from "@/lib/scout/topic-config";
import { type NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: {
    workspaceSlug: string;
  };
}

async function getWorkspaceId(
  slug: string,
  userId: string,
): Promise<string | null> {
  const workspace = await prisma.workspace.findFirst({
    where: { slug, members: { some: { userId } } },
    select: { id: true },
  });
  return workspace?.id ?? null;
}

// List all topics for a workspace
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const workspaceId = await getWorkspaceId(
      params.workspaceSlug,
      session.user.id,
    );
    if (!workspaceId) {
      return new Response("Workspace not found", { status: 404 });
    }

    const topics = await listTopicsByWorkspace(workspaceId);
    return NextResponse.json(topics);
  } catch (error) {
    console.error("Error in GET /topics:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Create a new topic
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const workspaceId = await getWorkspaceId(
      params.workspaceSlug,
      session.user.id,
    );
    if (!workspaceId) {
      return new Response("Workspace not found", { status: 404 });
    }

    const body = await req.json();
    const data = createTopicSchema.parse(body);
    const newTopic = await createTopic(workspaceId, data);

    return NextResponse.json(newTopic, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      // Zod error or other
      return new Response(error.message, { status: 400 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}
