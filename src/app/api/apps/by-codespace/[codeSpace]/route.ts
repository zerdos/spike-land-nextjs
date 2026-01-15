import { auth } from "@/auth";
import { checkCodespaceHasContent, findAppByIdentifier } from "@/lib/app-lookup";
import { tryCatch } from "@/lib/try-catch";
import { isAgentWorking } from "@/lib/upstash";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/apps/by-codespace/[codeSpace]
 *
 * Look up an app by its codespace identifier.
 * Returns the app if it exists, or null if it doesn't (with hasContent info).
 * This allows the frontend to distinguish between "no app yet" and "app exists".
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ codeSpace: string; }>; },
) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { codeSpace } = params;

  // Validate codespace format (alphanumeric, dots, hyphens, underscores, max 50 chars)
  if (!codeSpace || codeSpace.length > 50 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(codeSpace)) {
    return NextResponse.json(
      { error: "Invalid codespace name" },
      { status: 400 },
    );
  }

  // Try to find the app by codespace
  const { data: app, error: fetchError } = await tryCatch(
    findAppByIdentifier(codeSpace, session.user.id),
  );

  if (fetchError) {
    console.error("Error fetching app by codespace:", fetchError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Check if the codespace has actual content
  const { data: hasContent } = await tryCatch(
    checkCodespaceHasContent(codeSpace),
  );

  if (!app) {
    // App doesn't exist yet - return info needed to create it
    return NextResponse.json({
      app: null,
      codeSpace,
      hasContent: hasContent || false,
    });
  }

  // App exists - check if agent is working
  const { data: agentWorking } = await tryCatch(isAgentWorking(app.id));

  return NextResponse.json({
    app: {
      ...app,
      agentWorking: agentWorking || false,
    },
    codeSpace,
    hasContent: hasContent || false,
  });
}
