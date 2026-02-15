import { NextResponse } from "next/server";

interface McpServerStatus {
  name: string;
  status: "connected" | "disconnected" | "error" | "not_configured";
  lastHeartbeat: string | null;
  responseTimeMs: number | null;
  errorCount: number;
  details?: string;
}

async function checkMcpServer(name: string, checkUrl?: string): Promise<McpServerStatus> {
  if (!checkUrl) {
    return {
      name,
      status: "not_configured",
      lastHeartbeat: null,
      responseTimeMs: null,
      errorCount: 0,
    };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(checkUrl, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const responseTimeMs = Date.now() - start;

    return {
      name,
      status: res.ok ? "connected" : "error",
      lastHeartbeat: new Date().toISOString(),
      responseTimeMs,
      errorCount: res.ok ? 0 : 1,
      details: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (error) {
    return {
      name,
      status: "error",
      lastHeartbeat: null,
      responseTimeMs: Date.now() - start,
      errorCount: 1,
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const servers = await Promise.all([
    checkMcpServer("spike-land", process.env.SPIKE_LAND_API_KEY ? "https://spike.land/api/health" : undefined),
    checkMcpServer("bridgemind", process.env["BRIDGEMIND_MCP_URL"] || undefined),
    checkMcpServer("playwright", undefined), // stdio server, can't health-check
  ]);

  return NextResponse.json({ servers });
}
