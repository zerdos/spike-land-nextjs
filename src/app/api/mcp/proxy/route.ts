import { auth } from "@/auth";
import {
  GATEWAY_TOOL_COUNT,
  getToolsByCategory,
  MCP_CATEGORIES,
  MCP_TOOLS,
  TOTAL_CATEGORY_COUNT,
  TOTAL_TOOL_COUNT,
} from "@/components/mcp/mcp-tool-registry";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ProxyRequestBody {
  tool: string;
  params: Record<string, unknown>;
}

export async function POST(request: Request) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: parseError } = await tryCatch(
    request.json() as Promise<ProxyRequestBody>,
  );
  if (parseError || !body?.tool) {
    return NextResponse.json(
      { error: "Invalid request body: expected { tool, params }" },
      { status: 400 },
    );
  }

  const { tool, params = {} } = body;

  try {
    switch (tool) {
      // ── Gateway-Meta Tools ──────────────────────────────────
      case "list_categories": {
        return NextResponse.json({
          result: { content: [{ type: "text", text: JSON.stringify(MCP_CATEGORIES) }] },
        });
      }

      case "get_status": {
        return NextResponse.json({
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({
                tools: TOTAL_TOOL_COUNT,
                categories: TOTAL_CATEGORY_COUNT,
                gateway: GATEWAY_TOOL_COUNT,
              }),
            }],
          },
        });
      }

      case "get_balance": {
        const origin = new URL(request.url).origin;
        const balanceRes = await fetch(`${origin}/api/mcp/balance`, {
          headers: { cookie: request.headers.get("cookie") ?? "" },
        });
        const balanceData = await balanceRes.json();
        return NextResponse.json({
          result: { content: [{ type: "text", text: JSON.stringify(balanceData) }] },
        });
      }

      case "search_tools": {
        const query = String(params["query"] ?? "").toLowerCase();
        const limit = Number(params["limit"]) || 10;
        const matches = MCP_TOOLS.filter(
          (t) =>
            t.name.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query),
        ).slice(0, limit);
        return NextResponse.json({
          result: { content: [{ type: "text", text: JSON.stringify(matches) }] },
        });
      }

      case "enable_category": {
        const category = String(params["category"] ?? "");
        const tools = getToolsByCategory(category);
        return NextResponse.json({
          result: { content: [{ type: "text", text: JSON.stringify(tools) }] },
        });
      }

      // ── Image Tools ─────────────────────────────────────────
      case "generate_image": {
        const origin = new URL(request.url).origin;
        const res = await fetch(`${origin}/api/mcp/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: request.headers.get("cookie") ?? "",
          },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        return NextResponse.json({ result: { content: [{ type: "text", text: JSON.stringify(data) }] } });
      }

      case "modify_image": {
        const origin = new URL(request.url).origin;
        const res = await fetch(`${origin}/api/mcp/modify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: request.headers.get("cookie") ?? "",
          },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        return NextResponse.json({ result: { content: [{ type: "text", text: JSON.stringify(data) }] } });
      }

      case "check_job": {
        const jobId = String(params["job_id"] ?? "");
        if (!jobId) {
          return NextResponse.json({ error: "job_id is required" }, { status: 400 });
        }
        const origin = new URL(request.url).origin;
        const res = await fetch(`${origin}/api/mcp/jobs/${encodeURIComponent(jobId)}`, {
          headers: { cookie: request.headers.get("cookie") ?? "" },
        });
        const data = await res.json();
        return NextResponse.json({ result: { content: [{ type: "text", text: JSON.stringify(data) }] } });
      }

      // ── Fallback ────────────────────────────────────────────
      default: {
        return NextResponse.json({
          result: {
            content: [{
              type: "text",
              text: "This tool requires a live MCP connection. Install the MCP server to use it.",
            }],
          },
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
