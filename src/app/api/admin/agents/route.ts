/**
 * Admin Agents API
 *
 * Provides endpoints for managing external agent sessions (Jules, etc.)
 *
 * GET  - List all agent sessions with optional filters
 * POST - Create a new Jules session
 */

import { auth } from "@/auth";
import {
  buildSourceName,
  createSession,
  extractSessionId,
  isJulesAvailable,
  listSessions as listJulesSessions,
} from "@/lib/agents/jules-client";
import type { JulesSession } from "@/lib/agents/jules-types";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type AgentProvider, ExternalAgentStatus, type Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Valid ExternalAgentStatus values for runtime validation
const VALID_AGENT_STATUSES = Object.values(ExternalAgentStatus);

/**
 * Safely convert a Jules API state to ExternalAgentStatus
 * Falls back to QUEUED if the state is unknown
 */
function toExternalAgentStatus(state: string | undefined): ExternalAgentStatus {
  if (state && VALID_AGENT_STATUSES.includes(state as ExternalAgentStatus)) {
    return state as ExternalAgentStatus;
  }
  return ExternalAgentStatus.QUEUED;
}

/**
 * Sync sessions from Jules API to local database
 * This ensures we see all Jules sessions, including those created externally
 */
async function syncJulesSessionsToDb(): Promise<{ synced: number; errors: string[]; }> {
  if (!isJulesAvailable()) {
    return { synced: 0, errors: [] };
  }

  const errors: string[] = [];
  let synced = 0;

  // Fetch all sessions from Jules API (paginated)
  let pageToken: string | undefined;
  const allJulesSessions: JulesSession[] = [];

  do {
    const { data, error } = await listJulesSessions(50, pageToken);
    if (error) {
      errors.push(`Failed to fetch Jules sessions: ${error}`);
      break;
    }
    if (data?.sessions) {
      allJulesSessions.push(...data.sessions);
    }
    pageToken = data?.nextPageToken;
  } while (pageToken);

  // Sync each session to database
  for (const julesSession of allJulesSessions) {
    // Extract PR URL from outputs if available
    const prOutput = julesSession.outputs?.find((o) => o.url?.includes("pull"));
    const pullRequestUrl = prOutput?.url;

    const { error: upsertError } = await tryCatch(
      prisma.externalAgentSession.upsert({
        where: { externalId: julesSession.name },
        update: {
          status: toExternalAgentStatus(julesSession.state),
          pullRequestUrl,
          planSummary: julesSession.planSummary,
          metadata: {
            julesUrl: julesSession.url,
            title: julesSession.title,
          },
        },
        create: {
          externalId: julesSession.name,
          provider: "JULES",
          name: julesSession.title || extractSessionId(julesSession.name),
          description: "",
          status: toExternalAgentStatus(julesSession.state),
          pullRequestUrl,
          planSummary: julesSession.planSummary,
          metadata: {
            julesUrl: julesSession.url,
            title: julesSession.title,
          },
        },
      }),
    );

    if (upsertError) {
      errors.push(`Failed to sync session ${julesSession.name}: ${upsertError.message}`);
    } else {
      synced++;
    }
  }

  return { synced, errors };
}

// Schema for creating a new session
const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  task: z.string().min(1).max(4000),
  sourceRepo: z.string().optional(),
  startingBranch: z.string().optional().default("main"),
});

// Schema for query params
const querySchema = z.object({
  status: z.nativeEnum(ExternalAgentStatus).optional(),
  provider: z.enum(["JULES", "CODEX", "OTHER"]).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

/**
 * GET /api/admin/agents
 * List all agent sessions with optional filtering
 */
export async function GET(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const queryResult = querySchema.safeParse({
    status: searchParams.get("status") || undefined,
    provider: searchParams.get("provider") || undefined,
    limit: searchParams.get("limit") || undefined,
    offset: searchParams.get("offset") || undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: queryResult.error.flatten() },
      { status: 400 },
    );
  }

  const { status, provider, limit, offset } = queryResult.data;

  // Sync sessions from Jules API first (only if Jules is available)
  const syncResult = await syncJulesSessionsToDb();
  if (syncResult.errors.length > 0) {
    console.warn("Jules sync warnings:", syncResult.errors);
  }

  // Build where clause
  const where: Prisma.ExternalAgentSessionWhereInput = {};
  if (status) where.status = status;
  if (provider) where.provider = provider as AgentProvider;

  // Fetch sessions from database
  const { data: result, error: dbError } = await tryCatch(
    Promise.all([
      prisma.externalAgentSession.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { activities: true },
          },
        },
      }),
      prisma.externalAgentSession.count({ where }),
      // Status counts for quick overview
      prisma.externalAgentSession.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]),
  );

  if (dbError) {
    console.error("Failed to fetch agent sessions:", dbError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const [sessions, total, statusGroups] = result;

  // Convert status groups to object
  const statusCounts = statusGroups.reduce(
    (acc, group) => {
      acc[group.status] = group._count.status;
      return acc;
    },
    {} as Record<ExternalAgentStatus, number>,
  );

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      ...s,
      activityCount: s._count.activities,
      _count: undefined,
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + sessions.length < total,
    },
    statusCounts,
    julesAvailable: isJulesAvailable(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/admin/agents
 * Create a new Jules session
 */
export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if Jules is available
  if (!isJulesAvailable()) {
    return NextResponse.json(
      { error: "Jules API is not configured. Set JULES_API_KEY environment variable." },
      { status: 503 },
    );
  }

  // Parse request body
  const { data: body, error: jsonError } = await tryCatch(request.json());

  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = createSessionSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { title, task, sourceRepo, startingBranch } = parseResult.data;

  // Build source context
  const source = sourceRepo || buildSourceName(
    process.env.GITHUB_OWNER || "zerdos",
    process.env.GITHUB_REPO || "spike-land-nextjs",
  );

  // Create session via Jules API
  const { data: julesSession, error: julesError } = await createSession({
    prompt: task,
    title,
    sourceContext: {
      source,
      githubRepoContext: {
        startingBranch,
      },
    },
    requirePlanApproval: true, // Always require plan approval for safety
  });

  if (julesError || !julesSession) {
    console.error("Failed to create Jules session:", julesError);
    return NextResponse.json(
      { error: julesError || "Failed to create Jules session" },
      { status: 502 },
    );
  }

  // Store session in database
  const { data: dbSession, error: dbError } = await tryCatch(
    prisma.externalAgentSession.create({
      data: {
        externalId: julesSession.name,
        provider: "JULES",
        name: title,
        description: task,
        status: toExternalAgentStatus(julesSession.state),
        sourceRepo: source,
        startingBranch,
        metadata: {
          julesUrl: julesSession.url,
        },
      },
    }),
  );

  if (dbError) {
    console.error("Failed to store session in database:", dbError);
    // Session was created in Jules, but we failed to store it locally
    // Return success but warn about sync issue
    return NextResponse.json({
      success: true,
      session: {
        externalId: julesSession.name,
        id: extractSessionId(julesSession.name),
        status: julesSession.state,
        name: title,
        julesUrl: julesSession.url,
      },
      warning:
        "Session created in Jules but failed to store locally. It will be synced on next fetch.",
    });
  }

  return NextResponse.json({
    success: true,
    session: {
      id: dbSession.id,
      externalId: dbSession.externalId,
      status: dbSession.status,
      name: dbSession.name,
      julesUrl: julesSession.url,
    },
  });
}
