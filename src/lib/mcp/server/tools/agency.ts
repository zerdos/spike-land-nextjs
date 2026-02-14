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
  client_name: z.string().min(1).describe("Client name for the persona."),
  industry: z.string().min(1).describe("Client industry."),
  target_audience: z.string().optional().describe("Target audience description."),
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
  registry.register({
    name: "agency_generate_persona",
    description: "Generate a brand persona for a client. Creates a PENDING persona record.",
    category: "agency",
    tier: "free",
    inputSchema: AgencyGeneratePersonaSchema.shape,
    handler: async (args: z.infer<typeof AgencyGeneratePersonaSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_generate_persona", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const persona = await prisma.agencyPersona.create({
          data: {
            workspaceId: ws.id,
            clientName: args.client_name,
            industry: args.industry,
            targetAudience: args.target_audience ?? null,
            status: "PENDING",
            createdById: userId,
          },
        });
        return textResult(
          `**Persona Created**\n\n` +
          `**ID:** ${persona.id}\n` +
          `**Client:** ${args.client_name}\n` +
          `**Industry:** ${args.industry}\n` +
          `**Status:** PENDING`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "agency_list_portfolio",
    description: "List portfolio items for the agency workspace.",
    category: "agency",
    tier: "free",
    readOnlyHint: true,
    inputSchema: AgencyListPortfolioSchema.shape,
    handler: async (args: z.infer<typeof AgencyListPortfolioSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_list_portfolio", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const items = await prisma.agencyPortfolioItem.findMany({
          where: { workspaceId: ws.id },
          orderBy: { createdAt: "desc" },
          take: args.limit,
        });
        if (items.length === 0) {
          return textResult("**No portfolio items found.**");
        }
        const lines = items.map((item: { title: string; clientName: string; category: string; createdAt: Date }) =>
          `- **${item.title}** — ${item.clientName} — ${item.category} — ${item.createdAt.toISOString()}`,
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
    readOnlyHint: true,
    inputSchema: AgencyVerifyDomainSchema.shape,
    handler: async (args: z.infer<typeof AgencyVerifyDomainSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_verify_domain", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const domainRecord = await prisma.workspaceDomain.findFirst({
          where: { workspaceId: ws.id, domain: args.domain },
        });
        if (!domainRecord) {
          return textResult(
            `**Domain Not Configured**\n\n` +
            `Domain \`${args.domain}\` is not configured for workspace \`${args.workspace_slug}\`.\n\n` +
            `**DNS Records Needed:**\n` +
            `- CNAME \`${args.domain}\` -> \`cname.spike.land\`\n` +
            `- TXT \`_verify.${args.domain}\` -> \`spike-verify=${ws.id}\``,
          );
        }
        return textResult(
          `**Domain Verification**\n\n` +
          `**Domain:** ${args.domain}\n` +
          `**Status:** ${domainRecord.status}\n` +
          `**Verified:** ${domainRecord.verified ?? false}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "agency_get_theme",
    description: "Get the white-label theme settings for the workspace.",
    category: "agency",
    tier: "free",
    readOnlyHint: true,
    inputSchema: AgencyGetThemeSchema.shape,
    handler: async (args: z.infer<typeof AgencyGetThemeSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_get_theme", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const theme = await prisma.workspaceTheme.findFirst({
          where: { workspaceId: ws.id },
        });
        if (!theme) {
          return textResult(
            `**No Theme Configured**\n\nWorkspace \`${args.workspace_slug}\` uses the default theme.`,
          );
        }
        return textResult(
          `**Theme Configuration**\n\n` +
          `**Primary Color:** ${theme.primaryColor ?? "(default)"}\n` +
          `**Secondary Color:** ${theme.secondaryColor ?? "(default)"}\n` +
          `**Logo URL:** ${theme.logoUrl ?? "(none)"}\n` +
          `**Font Family:** ${theme.fontFamily ?? "(default)"}`,
        );
      }, { timeoutMs: 30_000 }),
  });
}
