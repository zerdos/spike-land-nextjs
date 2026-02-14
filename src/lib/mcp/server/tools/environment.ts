/**
 * Environment Management MCP Tools
 *
 * Tools for listing, checking status, comparing, and viewing deployments
 * across dev/preview/prod environments.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";
import { McpError, McpErrorCode } from "../../errors";

/**
 * Verify that a user has ADMIN or SUPER_ADMIN role.
 */
async function requireAdminRole(userId: string): Promise<void> {
  const prisma = (await import("@/lib/prisma")).default;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new McpError("Admin access required.", McpErrorCode.PERMISSION_DENIED, false);
  }
}

const EnvStatusSchema = z.object({
  name: z.enum(["dev", "preview", "prod"]).describe("Environment name."),
});

const EnvCompareSchema = z.object({
  env_a: z.enum(["dev", "preview", "prod"]).describe("First environment."),
  env_b: z.enum(["dev", "preview", "prod"]).describe("Second environment."),
});

const DeploymentsSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(10).describe("Max deployments."),
  state: z.string().optional().describe("Filter by deployment state (e.g. READY, ERROR)."),
});

export function registerEnvironmentTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "env_list",
    description: "List all registered environments with their URLs and health endpoints.",
    category: "env",
    tier: "workspace",
    inputSchema: {},
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("env_list", async () => {
        await requireAdminRole(userId);
        const { getAllEnvironmentConfigs } = await import("@/lib/dashboard/environments");
        const configs = getAllEnvironmentConfigs();

        let text = `**Environments (${configs.length}):**\n\n`;
        for (const env of configs) {
          text += `- **${env.name}**\n  URL: ${env.url}\n  Health: ${env.healthEndpoint}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "env_status",
    description: "Check the health status of a specific environment.",
    category: "env",
    tier: "workspace",
    inputSchema: EnvStatusSchema.shape,
    handler: async ({ name }: z.infer<typeof EnvStatusSchema>): Promise<CallToolResult> =>
      safeToolCall("env_status", async () => {
        await requireAdminRole(userId);
        const { getEnvironmentConfig, checkEnvironmentHealth } = await import("@/lib/dashboard/environments");
        const config = getEnvironmentConfig(name);
        if (!config) return textResult(`Environment "${name}" not found.`);

        const info = await checkEnvironmentHealth(config);
        return textResult(
          `**Environment: ${info.name}**\n\n` +
          `- Status: ${info.status}\n` +
          `- URL: ${info.url}\n` +
          `- Version: ${info.version || "unknown"}\n` +
          `- Commit: ${info.commitSha || "unknown"}\n` +
          `- Last Deployed: ${info.lastDeployedAt?.toISOString() || "unknown"}`
        );
      }),
  });

  registry.register({
    name: "env_compare",
    description: "Compare two environments side by side (health, version, commit).",
    category: "env",
    tier: "workspace",
    inputSchema: EnvCompareSchema.shape,
    handler: async ({ env_a, env_b }: z.infer<typeof EnvCompareSchema>): Promise<CallToolResult> =>
      safeToolCall("env_compare", async () => {
        await requireAdminRole(userId);
        const { getEnvironmentConfig, checkEnvironmentHealth } = await import("@/lib/dashboard/environments");

        const configA = getEnvironmentConfig(env_a);
        const configB = getEnvironmentConfig(env_b);
        if (!configA) return textResult(`Environment "${env_a}" not found.`);
        if (!configB) return textResult(`Environment "${env_b}" not found.`);

        const [infoA, infoB] = await Promise.all([
          checkEnvironmentHealth(configA),
          checkEnvironmentHealth(configB),
        ]);

        const versionMatch = infoA.version && infoB.version && infoA.version === infoB.version;
        const commitMatch = infoA.commitSha && infoB.commitSha && infoA.commitSha === infoB.commitSha;

        return textResult(
          `**Environment Comparison: ${env_a} vs ${env_b}**\n\n` +
          `| Field | ${env_a} | ${env_b} |\n` +
          `|-------|---------|--------|\n` +
          `| Status | ${infoA.status} | ${infoB.status} |\n` +
          `| Version | ${infoA.version || "?"} | ${infoB.version || "?"} |\n` +
          `| Commit | ${infoA.commitSha?.slice(0, 7) || "?"} | ${infoB.commitSha?.slice(0, 7) || "?"} |\n` +
          `| Deployed | ${infoA.lastDeployedAt?.toISOString() || "?"} | ${infoB.lastDeployedAt?.toISOString() || "?"} |\n\n` +
          `Version match: ${versionMatch ? "YES" : "NO"}\n` +
          `Commit match: ${commitMatch ? "YES" : "NO"}`
        );
      }),
  });

  registry.register({
    name: "env_deployments",
    description: "List recent deployments from Vercel.",
    category: "env",
    tier: "workspace",
    inputSchema: DeploymentsSchema.shape,
    handler: async ({ limit = 10, state }: z.infer<typeof DeploymentsSchema>): Promise<CallToolResult> =>
      safeToolCall("env_deployments", async () => {
        await requireAdminRole(userId);
        const { listVercelDeployments } = await import("@/lib/bridges/vercel");
        const deployments = await listVercelDeployments({ limit, state });

        if (!deployments || deployments.length === 0) return textResult("No deployments found.");
        let text = `**Recent Deployments (${deployments.length}):**\n\n`;
        for (const d of deployments) {
          const created = new Date(d.created).toISOString();
          text += `- **${d.name}** [${d.state}]\n  URL: ${d.url}\n  Source: ${d.source}\n  Created: ${created}\n  ID: ${d.uid}\n\n`;
        }
        return textResult(text);
      }),
  });
}
