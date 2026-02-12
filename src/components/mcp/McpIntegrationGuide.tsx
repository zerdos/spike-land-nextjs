"use client";

import { McpConfigSnippet } from "@/components/mcp/McpConfigSnippet";
import { Link } from "@/components/ui/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";

const claudeDesktopConfig = `{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["-y", "@spike-npm-land/mcp-server"],
      "env": {
        "SPIKE_LAND_API_KEY": "your-api-key-here"
      }
    }
  }
}`;

const claudeCodeConfig = `claude mcp add spike-land -- npx -y @spike-npm-land/mcp-server`;

const cursorConfig = `{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["-y", "@spike-npm-land/mcp-server"],
      "env": {
        "SPIKE_LAND_API_KEY": "your-api-key-here"
      }
    }
  }
}`;

const npmConfig = `npm install -g @spike-npm-land/mcp-server
SPIKE_LAND_API_KEY=your-api-key spike-land-mcp`;

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
          <TabsTrigger value="npm">npm</TabsTrigger>
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

        <TabsContent value="npm">
          <McpConfigSnippet code={npmConfig} language="bash" />
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
