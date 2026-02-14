/**
 * Agency MCP Tools
 *
 * White-label agency features: persona generation, portfolio, domain verification, and theming.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const AgencyGeneratePersonaSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  name: z.string().min(1).describe("Persona name."),
  tagline: z.string().min(1).describe("Persona tagline."),
  primary_hook: z.string().min(1).describe("Primary hook for the persona."),
});

const AgencyListPortfolioSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  limit: z.number().optional().default(20).describe("Max items to return (default 20)."),
});

const AgencyVerifyDomainSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  domain: z.string().min(1).describe("Domain to verify."),
});

const AgencyGetThemeSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
});

export function registerAgencyTools(
  registry: ToolRegistry,
  userId: string,
): void {
  // Suppress unused variable warning - userId reserved for future auth checks
  void userId;

  registry.register({
    name: "agency_generate_persona",
    description: "Generate a brand persona for a client. Creates a persona record.",
    category: "agency",
    tier: "free",
    inputSchema: AgencyGeneratePersonaSchema.shape,
    handler: async (args: z.infer<typeof AgencyGeneratePersonaSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_generate_persona", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const slug = args.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const persona = await prisma.agencyPersona.create({
          data: {
            slug,
            name: args.name,
            tagline: args.tagline,
            demographics: {},
            primaryHook: args.primary_hook,
            predictedProfit: 0,
            stressLevel: 0,
            rank: 0,
          },
        });
        return textResult(
          `**Persona Created**\n\n` +
          `**ID:** ${persona.id}\n` +
          `**Name:** ${args.name}\n` +
          `**Tagline:** ${args.tagline}\n` +
          `**Status:** Created`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "agency_list_portfolio",
    description: "List portfolio items for the agency workspace.",
    category: "agency",
    tier: "free",
    annotations: { readOnlyHint: true },
    inputSchema: AgencyListPortfolioSchema.shape,
    handler: async (args: z.infer<typeof AgencyListPortfolioSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_list_portfolio", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const items = await prisma.agencyPortfolioItem.findMany({
          orderBy: { createdAt: "desc" },
          take: args.limit,
        });
        if (items.length === 0) {
          return textResult("**No portfolio items found.**");
        }
        const lines = items.map((item) =>
          `- **${item.name}** — ${item.category} — ${item.createdAt.toISOString()}`,
        );
        return textResult(
          `**Portfolio (${items.length})**\n\n${lines.join("\n")}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "agency_verify_domain",
    description: "Check the verification status of a custom domain for the workspace.",
    category: "agency",
    tier: "free",
    annotations: { readOnlyHint: true },
    inputSchema: AgencyVerifyDomainSchema.shape,
    handler: async (args: z.infer<typeof AgencyVerifyDomainSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_verify_domain", async () => {
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        // Domain verification is not yet modeled in Prisma - return DNS instructions
        return textResult(
          `**Domain Verification**\n\n` +
          `Domain \`${args.domain}\` verification for workspace \`${args.workspace_slug}\`.\n\n` +
          `**DNS Records Needed:**\n` +
          `- CNAME \`${args.domain}\` -> \`cname.spike.land\`\n` +
          `- TXT \`_verify.${args.domain}\` -> \`spike-verify=${ws.id}\``,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "agency_get_theme",
    description: "Get the white-label theme settings for the workspace.",
    category: "agency",
    tier: "free",
    annotations: { readOnlyHint: true },
    inputSchema: AgencyGetThemeSchema.shape,
    handler: async (args: z.infer<typeof AgencyGetThemeSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_get_theme", async () => {
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        // Theme settings are stored in workspace metadata - return defaults
        return textResult(
          `**Theme Configuration**\n\n` +
          `**Workspace:** ${ws.name}\n` +
          `Workspace \`${args.workspace_slug}\` uses the default theme.\n` +
          `Custom theming is configured through workspace settings.`,
        );
      }, { timeoutMs: 30_000 }),
  });
}
