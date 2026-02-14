import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import {
  getSentryIssueDetail,
  getSentryStats,
  listSentryIssues,
} from "@/lib/bridges/sentry";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    if (
      adminError instanceof Error &&
      adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!process.env.SENTRY_MCP_AUTH_TOKEN) {
    return NextResponse.json({ configured: false });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "issues";

  if (action === "stats") {
    const { data: stats, error } = await tryCatch(getSentryStats());
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch Sentry stats" },
        { status: 502 },
      );
    }
    return NextResponse.json({ configured: true, stats });
  }

  if (action === "detail") {
    const issueId = searchParams.get("issueId");
    if (!issueId) {
      return NextResponse.json(
        { error: "issueId is required" },
        { status: 400 },
      );
    }
    const { data: issue, error } = await tryCatch(
      getSentryIssueDetail(issueId),
    );
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch Sentry issue detail" },
        { status: 502 },
      );
    }
    return NextResponse.json({ configured: true, issue });
  }

  // Default: list issues
  const query = searchParams.get("query") || undefined;
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "25", 10)),
  );

  const { data: issues, error } = await tryCatch(
    listSentryIssues({ query, limit }),
  );
  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch Sentry issues" },
      { status: 502 },
    );
  }

  return NextResponse.json({ configured: true, issues });
}
