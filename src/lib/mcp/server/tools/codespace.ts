/**
 * CodeSpace Tools (Server-Side)
 *
 * Uses a service-level token for testing.spike.land API calls.
 * The user identity comes from the OAuth token's userId.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";

const TESTING_BASE_URL = process.env["TESTING_SPIKE_LAND_URL"] || "https://testing.spike.land";
const SPIKE_LAND_BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] || "https://spike.land";

const CODESPACE_ID_PATTERN = /^[a-zA-Z0-9_.-]+$/;

function validateCodeSpaceId(id: string): void {
  if (!CODESPACE_ID_PATTERN.test(id)) {
    throw new Error(`Invalid codespace ID format: ${id}`);
  }
}

async function codespaceRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  try {
    // Use server-side service token if available, otherwise make unauthenticated requests
    const serviceToken = process.env["SPIKE_LAND_SERVICE_TOKEN"] || process.env["SPIKE_LAND_API_KEY"];
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (serviceToken) {
      headers["Authorization"] = `Bearer ${serviceToken}`;
    }

    const url = `${TESTING_BASE_URL}${endpoint}`;
    const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });

    if (endpoint.includes("/screenshot")) {
      if (!response.ok) return { data: null, error: `API error: ${response.status}` };
      const buf = await response.arrayBuffer();
      return { data: { base64: Buffer.from(buf).toString("base64"), mimeType: "image/jpeg" } as T, error: null };
    }

    const json = await response.json();
    if (!response.ok) return { data: null, error: (json as { error?: string })?.error || `API error: ${response.status}` };
    return { data: json as T, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function spikeLandRequest<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  try {
    const url = `${SPIKE_LAND_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    const json = await response.json();
    if (!response.ok) return { data: null, error: (json as { error?: string })?.error || `API error: ${response.status}` };
    return { data: json as T, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

const UpdateCodeSchema = z.object({
  codespace_id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
  code: z.string().min(1),
  run: z.boolean().optional().default(true),
});

const CodeSpaceIdSchema = z.object({
  codespace_id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
});

const LinkAppSchema = z.object({
  codespace_id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
  app_id: z.string().optional(),
  app_name: z.string().min(3).max(50).optional(),
  app_description: z.string().min(10).max(500).optional(),
});

export function registerCodeSpaceTools(registry: ToolRegistry, _userId: string): void {
  const serviceToken = process.env["SPIKE_LAND_SERVICE_TOKEN"] || process.env["SPIKE_LAND_API_KEY"] || "";

  registry.register({
    name: "codespace_update",
    description: "Create or update a live React application on testing.spike.land.\nThe app is available at: https://testing.spike.land/live/{codespace_id}",
    category: "codespace",
    tier: "free",
    inputSchema: UpdateCodeSchema.shape,
    handler: async ({ codespace_id, code, run }: z.infer<typeof UpdateCodeSchema>): Promise<CallToolResult> => {
      validateCodeSpaceId(codespace_id);
      const result = await codespaceRequest<{ codeSpace: string; hash: string; updated: string[] }>(`/live/${codespace_id}/api/code`, {
        method: "PUT", body: JSON.stringify({ code, run }),
      });
      if (result.error) return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: "text", text: `**CodeSpace Updated!**\n\n**ID:** ${result.data?.codeSpace}\n**Hash:** ${result.data?.hash}\n**Live URL:** ${TESTING_BASE_URL}/live/${codespace_id}` }] };
    },
  });

  registry.register({
    name: "codespace_run",
    description: "Transpile and render a codespace without updating code.",
    category: "codespace",
    tier: "free",
    inputSchema: CodeSpaceIdSchema.shape,
    handler: async ({ codespace_id }: z.infer<typeof CodeSpaceIdSchema>): Promise<CallToolResult> => {
      validateCodeSpaceId(codespace_id);
      const result = await codespaceRequest<{ codeSpace: string; hash: string; transpiled: boolean }>(`/live/${codespace_id}/api/run`, { method: "POST", body: JSON.stringify({}) });
      if (result.error) return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: "text", text: `**Transpiled!**\n\n**ID:** ${result.data?.codeSpace}\n**Hash:** ${result.data?.hash}\n**Live URL:** ${TESTING_BASE_URL}/live/${codespace_id}` }] };
    },
  });

  registry.register({
    name: "codespace_screenshot",
    description: "Get a JPEG screenshot of a running codespace.",
    category: "codespace",
    tier: "free",
    inputSchema: CodeSpaceIdSchema.shape,
    handler: async ({ codespace_id }: z.infer<typeof CodeSpaceIdSchema>): Promise<CallToolResult> => {
      validateCodeSpaceId(codespace_id);
      const result = await codespaceRequest<{ base64: string; mimeType: string }>(`/live/${codespace_id}/api/screenshot`);
      if (result.error) return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      return { content: [
        { type: "text", text: `**Screenshot of ${codespace_id}**\nLive URL: ${TESTING_BASE_URL}/live/${codespace_id}` },
        { type: "image", data: result.data!.base64, mimeType: result.data!.mimeType },
      ] };
    },
  });

  registry.register({
    name: "codespace_get",
    description: "Get the current code and session data for a codespace.",
    category: "codespace",
    tier: "free",
    inputSchema: CodeSpaceIdSchema.shape,
    handler: async ({ codespace_id }: z.infer<typeof CodeSpaceIdSchema>): Promise<CallToolResult> => {
      validateCodeSpaceId(codespace_id);
      const result = await codespaceRequest<{ codeSpace: string; hash: string; session: { code: string; createdAt?: string; updatedAt?: string } }>(`/live/${codespace_id}/api/session`);
      if (result.error) return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      let text = `**CodeSpace Details**\n\n**ID:** ${result.data?.codeSpace}\n**Hash:** ${result.data?.hash}\n**Live URL:** ${TESTING_BASE_URL}/live/${codespace_id}\n`;
      text += `\n**Source Code:**\n\`\`\`tsx\n${result.data?.session?.code}\n\`\`\``;
      return { content: [{ type: "text", text }] };
    },
  });

  registry.register({
    name: "codespace_link_app",
    description: "Link a codespace to the user's my-apps on spike.land.",
    category: "codespace",
    tier: "free",
    inputSchema: LinkAppSchema.shape,
    handler: async ({ codespace_id, app_id, app_name, app_description }: z.infer<typeof LinkAppSchema>): Promise<CallToolResult> => {
      if (app_id) {
        const result = await spikeLandRequest<{ id: string; name: string }>(`/api/apps/${app_id}`, serviceToken, {
          method: "PATCH", body: JSON.stringify({ codespaceId: codespace_id }),
        });
        if (result.error) return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
        return { content: [{ type: "text", text: `**Linked!** App ${result.data?.name} → codespace ${codespace_id}` }] };
      }
      if (!app_name) return { content: [{ type: "text", text: "Either app_id or app_name required" }], isError: true };
      const result = await spikeLandRequest<{ id: string; name: string }>("/api/apps", serviceToken, {
        method: "POST", body: JSON.stringify({ name: app_name, description: app_description || `App from codespace ${codespace_id}`, requirements: "Codespace-based app", monetizationModel: "free", codespaceId: codespace_id }),
      });
      if (result.error) return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: "text", text: `**App Created!** ${result.data?.name} → codespace ${codespace_id}\nView: https://spike.land/my-apps` }] };
    },
  });

  registry.register({
    name: "codespace_list_my_apps",
    description: "List the user's apps from spike.land.",
    category: "codespace",
    tier: "free",
    inputSchema: {},
    handler: async (): Promise<CallToolResult> => {
      const result = await spikeLandRequest<Array<{ id: string; name: string; status: string; codespaceId?: string; codespaceUrl?: string }>>("/api/apps", serviceToken);
      if (result.error) return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      const apps = result.data || [];
      let text = `**My Apps (${apps.length}):**\n\n`;
      if (apps.length === 0) { text += "No apps found."; }
      else { for (const app of apps) { text += `- **${app.name}** (${app.status}) ID: ${app.id}\n`; if (app.codespaceId) text += `  Codespace: ${app.codespaceId}\n`; } }
      return { content: [{ type: "text", text }] };
    },
  });
}
