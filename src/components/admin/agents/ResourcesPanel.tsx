/**
 * Resources Panel Component
 *
 * Displays status of development resources (Dev Server, MCP servers, Database)
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ResourceStatus {
  devServer: {
    running: boolean;
    port: number | null;
    url: string | null;
  };
  mcpServers: Array<{
    name: string;
    type: string;
    configured: boolean;
  }>;
  database: {
    connected: boolean;
    provider: string;
  };
  environment: {
    nodeEnv: string;
    julesConfigured: boolean;
    githubConfigured: boolean;
  };
}

interface ResourcesPanelProps {
  resources: ResourceStatus | null;
  loading?: boolean;
  error?: string | null;
}

export function ResourcesPanel({ resources, loading, error }: ResourcesPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="loading animate-pulse space-y-2">
            <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!resources) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No resource data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Dev Server */}
        <div
          data-testid="resource-dev-server"
          className="flex items-center justify-between"
        >
          <span className="text-sm">Dev Server</span>
          <Badge
            className="status-indicator"
            variant={resources.devServer.running ? "success" : "secondary"}
          >
            {resources.devServer.running ? "Running" : "Stopped"}
          </Badge>
        </div>

        {/* MCP Servers */}
        {resources.mcpServers.map((mcp) => (
          <div
            key={mcp.name}
            data-testid={`resource-mcp-${mcp.name}`}
            className="flex items-center justify-between"
          >
            <span className="text-sm">MCP: {mcp.name}</span>
            <Badge
              className="indicator"
              variant={mcp.configured ? "success" : "secondary"}
            >
              {mcp.configured ? "Configured" : "Not Configured"}
            </Badge>
          </div>
        ))}

        {/* Database */}
        <div
          data-testid="resource-database"
          className="flex items-center justify-between"
        >
          <span className="text-sm">Database</span>
          <Badge
            className="status-indicator"
            variant={resources.database.connected ? "success" : "secondary"}
          >
            {resources.database.connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
