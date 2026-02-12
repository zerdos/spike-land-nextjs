"use client";

import { McpConfigSnippet } from "@/components/mcp/McpConfigSnippet";
import { Link } from "@/components/ui/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";

const claudeDesktopConfig = `{
  "mcpServers": {
    "spike-land": {
      "url": "https://spike.land/api/mcp"
    }
  }
}`;

const claudeCodeConfig = `claude mcp add --transport http spike-land https://spike.land/api/mcp`;

const cursorConfig = `{
  "mcpServers": {
    "spike-land": {
      "url": "https://spike.land/api/mcp"
    }
  }
}`;

const httpConfig = `curl -X POST https://spike.land/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'`;

export function McpIntegrationGuide() {
  return (
    <section className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Get Started</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Connect your AI agent to spike.land in seconds
        </p>
      </div>

      <Tabs defaultValue="claude-desktop" className="max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
          <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
          <TabsTrigger value="cursor">Cursor</TabsTrigger>
          <TabsTrigger value="http">HTTP</TabsTrigger>
        </TabsList>

        <TabsContent value="claude-desktop">
          <McpConfigSnippet code={claudeDesktopConfig} language="json" />
        </TabsContent>

        <TabsContent value="claude-code">
          <McpConfigSnippet code={claudeCodeConfig} language="bash" />
        </TabsContent>

        <TabsContent value="cursor">
          <McpConfigSnippet code={cursorConfig} language="json" />
        </TabsContent>

        <TabsContent value="http">
          <McpConfigSnippet code={httpConfig} language="bash" />
        </TabsContent>
      </Tabs>

      <div className="text-center">
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          Get your API key
        </Link>
      </div>
    </section>
  );
}
