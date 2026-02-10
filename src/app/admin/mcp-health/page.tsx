import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "MCP Health | Admin",
  description: "Monitor MCP server connections and health",
};

interface McpServerStatus {
  name: string;
  status: "connected" | "disconnected" | "error" | "not_configured";
  lastHeartbeat: string | null;
  responseTimeMs: number | null;
  errorCount: number;
  details?: string;
}

export default async function McpHealthPage() {
  let servers: McpServerStatus[] = [];
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/mcp-health`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      servers = data.servers ?? [];
    }
  } catch {
    // Use defaults
  }

  // Default servers if API unavailable
  if (servers.length === 0) {
    servers = [
      { name: "spike-land", status: "not_configured", lastHeartbeat: null, responseTimeMs: null, errorCount: 0 },
      { name: "bridgemind", status: "not_configured", lastHeartbeat: null, responseTimeMs: null, errorCount: 0 },
      { name: "playwright", status: "not_configured", lastHeartbeat: null, responseTimeMs: null, errorCount: 0 },
    ];
  }

  const statusColors: Record<string, string> = {
    connected: "bg-green-500/10 text-green-700",
    disconnected: "bg-yellow-500/10 text-yellow-700",
    error: "bg-red-500/10 text-red-700",
    not_configured: "bg-gray-500/10 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MCP Health</h1>
        <p className="text-muted-foreground">
          Monitor MCP server connections and health status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => (
          <Card key={server.name}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{server.name}</CardTitle>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[server.status] || statusColors["not_configured"]}`}>
                  {server.status}
                </span>
              </div>
              <CardDescription>MCP Server</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last heartbeat</dt>
                  <dd>{server.lastHeartbeat ? new Date(server.lastHeartbeat).toLocaleString() : "\u2014"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Response time</dt>
                  <dd>{server.responseTimeMs !== null ? `${server.responseTimeMs}ms` : "\u2014"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Errors</dt>
                  <dd>{server.errorCount}</dd>
                </div>
                {server.details && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground">{server.details}</p>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
