import { auth } from "@/auth";
import { listInboxItems } from "@/lib/inbox/inbox-manager";
import type { InboxItemFilter } from "@/lib/inbox/types";
import { InboxItemStatus, InboxItemType, InboxSentiment, SocialPlatform } from "@/lib/inbox/types";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

const schema = z.object({
  status: z.union([
    z.enum(Object.values(InboxItemStatus) as [string, ...string[]]),
    z.array(z.enum(Object.values(InboxItemStatus) as [string, ...string[]])),
  ]).optional(),
  type: z.union([
    z.enum(Object.values(InboxItemType) as [string, ...string[]]),
    z.array(z.enum(Object.values(InboxItemType) as [string, ...string[]])),
  ]).optional(),
  platform: z.union([
    z.enum(Object.values(SocialPlatform) as [string, ...string[]]),
    z.array(z.enum(Object.values(SocialPlatform) as [string, ...string[]])),
  ]).optional(),
  assignedToId: z.string().optional(),
  accountId: z.string().optional(),
  receivedAfter: z.string().optional(),
  receivedBefore: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.string().optional(),
  sentiment: z.union([
    z.enum(Object.values(InboxSentiment) as [string, ...string[]]),
    z.array(z.enum(Object.values(InboxSentiment) as [string, ...string[]])),
  ]).optional(),
  minPriority: z.string().optional(),
  maxPriority: z.string().optional(),
  escalated: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: RouteParams,
) {
  const { workspaceSlug } = await params;
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());

  const validated = schema.safeParse(query);
  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.issues },
      { status: 400 },
    );
  }
  const {
    status,
    type,
    platform,
    assignedToId,
    accountId,
    receivedAfter,
    receivedBefore,
    page,
    limit,
    orderBy,
    orderDirection,
    sentiment,
    minPriority,
    maxPriority,
    escalated,
  } = validated.data;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    await requireWorkspacePermission(session, workspace.id, "inbox:view");

    const filter: InboxItemFilter = { workspaceId: workspace.id };
    if (status) {
      filter.status = (Array.isArray(status) ? status : [status]) as InboxItemStatus[];
    }
    if (type) {
      filter.type = (Array.isArray(type) ? type : [type]) as InboxItemType[];
    }
    if (platform) {
      filter.platform = (Array.isArray(platform) ? platform : [platform]) as SocialPlatform[];
    }
    if (assignedToId) filter.assignedToId = assignedToId;
    if (accountId) filter.accountId = accountId;
    if (receivedAfter) filter.receivedAfter = new Date(receivedAfter);
    if (receivedBefore) filter.receivedBefore = new Date(receivedBefore);
    if (sentiment) {
      filter.sentiment = (Array.isArray(sentiment)
        ? sentiment
        : [sentiment]) as InboxSentiment[];
    }
    if (minPriority) filter.minPriority = parseInt(minPriority, 10);
    if (maxPriority) filter.maxPriority = parseInt(maxPriority, 10);
    if (escalated) filter.escalated = escalated === "true";

    const pagination = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      orderBy: orderBy as "receivedAt" | "createdAt" | "updatedAt" | undefined,
      orderDirection: orderDirection as "asc" | "desc" | undefined,
    };

    const data = await listInboxItems(filter, pagination);

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error(error);

    let status = 500;
    let message = "Failed to list inbox items";

    if (error instanceof Error) {
      const errWithStatus = error as Error & {
        status?: number;
        statusCode?: number;
      };
      if (typeof errWithStatus.status === "number") {
        status = errWithStatus.status;
      } else if (typeof errWithStatus.statusCode === "number") {
        status = errWithStatus.statusCode;
      }
      if (error.message) {
        message = error.message;
      }
    }

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
