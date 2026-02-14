/**
 * Agency / Personas MCP Tools
 *
 * Marketing persona management: list, get, create, update, delete.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Prisma } from "@/generated/prisma";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const ListPersonasSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)."),
  offset: z.number().int().min(0).optional().describe("Offset for pagination (default 0)."),
});

const GetPersonaSchema = z.object({
  slug: z.string().min(1).describe("Persona slug."),
});

const CreatePersonaSchema = z.object({
  name: z.string().min(1).max(200).describe("Persona name."),
  slug: z.string().min(1).max(100).describe("URL-friendly slug."),
  tagline: z.string().min(1).max(500).describe("Short tagline."),
  demographics: z.string().optional().describe("Demographics as JSON string."),
  psychographics: z.array(z.string()).optional().describe("Psychographic traits."),
  painPoints: z.array(z.string()).optional().describe("Pain points."),
  triggers: z.array(z.string()).optional().describe("Purchase triggers."),
  primaryHook: z.string().min(1).describe("Primary marketing hook."),
  adCopyVariations: z.array(z.string()).optional().describe("Ad copy variations."),
  predictedProfit: z.number().min(0).max(100).optional().describe("Predicted profit score (0-100)."),
  stressLevel: z.number().min(0).max(10).optional().describe("Stress level (0-10)."),
  rank: z.number().int().positive().optional().describe("Ranking position."),
});

const UpdatePersonaSchema = z.object({
  persona_id: z.string().min(1).describe("Persona ID."),
  name: z.string().max(200).optional().describe("New name."),
  tagline: z.string().max(500).optional().describe("New tagline."),
  demographics: z.string().optional().describe("New demographics as JSON string."),
  psychographics: z.array(z.string()).optional().describe("New psychographic traits."),
  painPoints: z.array(z.string()).optional().describe("New pain points."),
  triggers: z.array(z.string()).optional().describe("New purchase triggers."),
  primaryHook: z.string().optional().describe("New primary marketing hook."),
  adCopyVariations: z.array(z.string()).optional().describe("New ad copy variations."),
  predictedProfit: z.number().min(0).max(100).optional().describe("New predicted profit score."),
  stressLevel: z.number().min(0).max(10).optional().describe("New stress level."),
  rank: z.number().int().positive().optional().describe("New ranking position."),
});

const DeletePersonaSchema = z.object({
  persona_id: z.string().min(1).describe("Persona ID to delete."),
});

export function registerAgencyTools(
  registry: ToolRegistry,
  _userId: string,
): void {
  registry.register({
    name: "agency_list_personas",
    description: "List marketing personas with optional pagination.",
    category: "agency",
    tier: "free",
    inputSchema: ListPersonasSchema.shape,
    handler: async ({ limit = 20, offset = 0 }: z.infer<typeof ListPersonasSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_list_personas", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const personas = await prisma.agencyPersona.findMany({
          select: {
            id: true,
            slug: true,
            name: true,
            tagline: true,
            predictedProfit: true,
            stressLevel: true,
            rank: true,
          },
          skip: offset,
          take: limit,
          orderBy: { rank: "asc" },
        });
        if (personas.length === 0) return textResult("No personas found.");
        let text = `**Personas (${personas.length}):**\n\n`;
        for (const p of personas) {
          text += `- **${p.name}** (${p.slug}) — Rank #${p.rank}, Profit: ${p.predictedProfit}%, Stress: ${p.stressLevel}/10\n  ${p.tagline}\n  ID: ${p.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "agency_get_persona",
    description: "Get a marketing persona by slug.",
    category: "agency",
    tier: "free",
    inputSchema: GetPersonaSchema.shape,
    handler: async ({ slug }: z.infer<typeof GetPersonaSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_get_persona", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const persona = await prisma.agencyPersona.findUnique({
          where: { slug },
        });
        if (!persona) return textResult("**Error: NOT_FOUND**\nPersona not found.\n**Retryable:** false");
        const demographics = persona.demographics as Record<string, unknown> | null;
        const psychographics = persona.psychographics as string[];
        const painPoints = persona.painPoints as string[];
        return textResult(
          `**Persona**\n\n` +
          `**ID:** ${persona.id}\n` +
          `**Name:** ${persona.name}\n` +
          `**Slug:** ${persona.slug}\n` +
          `**Tagline:** ${persona.tagline}\n` +
          `**Demographics:** ${demographics ? JSON.stringify(demographics) : "(none)"}\n` +
          `**Psychographics:** ${psychographics.length > 0 ? psychographics.join(", ") : "(none)"}\n` +
          `**Pain Points:** ${painPoints.length > 0 ? painPoints.join(", ") : "(none)"}\n` +
          `**Primary Hook:** ${persona.primaryHook}\n` +
          `**Predicted Profit:** ${persona.predictedProfit}%\n` +
          `**Stress Level:** ${persona.stressLevel}/10\n` +
          `**Rank:** #${persona.rank}`,
        );
      }),
  });

  registry.register({
    name: "agency_create_persona",
    description: "Create a new marketing persona.",
    category: "agency",
    tier: "free",
    inputSchema: CreatePersonaSchema.shape,
    handler: async (input: z.infer<typeof CreatePersonaSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_create_persona", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const demographicsData = input.demographics
          ? JSON.parse(input.demographics) as Prisma.InputJsonValue
          : {};
        const persona = await prisma.agencyPersona.create({
          data: {
            name: input.name,
            slug: input.slug,
            tagline: input.tagline,
            demographics: demographicsData,
            psychographics: input.psychographics ?? [],
            painPoints: input.painPoints ?? [],
            triggers: input.triggers ?? [],
            primaryHook: input.primaryHook,
            adCopyVariations: input.adCopyVariations ?? [],
            predictedProfit: input.predictedProfit ?? 0,
            stressLevel: input.stressLevel ?? 0,
            rank: input.rank ?? 1,
          },
        });
        return textResult(
          `**Persona Created!**\n\n**ID:** ${persona.id}\n**Name:** ${persona.name}\n**Slug:** ${persona.slug}`,
        );
      }),
  });

  registry.register({
    name: "agency_update_persona",
    description: "Update an existing marketing persona.",
    category: "agency",
    tier: "free",
    inputSchema: UpdatePersonaSchema.shape,
    handler: async ({ persona_id, ...fields }: z.infer<typeof UpdatePersonaSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_update_persona", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = {};
        if (fields.name !== undefined) data["name"] = fields.name;
        if (fields.tagline !== undefined) data["tagline"] = fields.tagline;
        if (fields.demographics !== undefined) data["demographics"] = JSON.parse(fields.demographics) as Prisma.InputJsonValue;
        if (fields.psychographics !== undefined) data["psychographics"] = fields.psychographics;
        if (fields.painPoints !== undefined) data["painPoints"] = fields.painPoints;
        if (fields.triggers !== undefined) data["triggers"] = fields.triggers;
        if (fields.primaryHook !== undefined) data["primaryHook"] = fields.primaryHook;
        if (fields.adCopyVariations !== undefined) data["adCopyVariations"] = fields.adCopyVariations;
        if (fields.predictedProfit !== undefined) data["predictedProfit"] = fields.predictedProfit;
        if (fields.stressLevel !== undefined) data["stressLevel"] = fields.stressLevel;
        if (fields.rank !== undefined) data["rank"] = fields.rank;
        const persona = await prisma.agencyPersona.update({
          where: { id: persona_id },
          data,
        });
        return textResult(`**Persona Updated!** ${persona.name} (${persona.slug})`);
      }),
  });

  registry.register({
    name: "agency_delete_persona",
    description: "Delete a marketing persona.",
    category: "agency",
    tier: "free",
    inputSchema: DeletePersonaSchema.shape,
    handler: async ({ persona_id }: z.infer<typeof DeletePersonaSchema>): Promise<CallToolResult> =>
      safeToolCall("agency_delete_persona", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.agencyPersona.delete({ where: { id: persona_id } });
        return textResult(`**Persona Deleted!** ID: ${persona_id}`);
      }),
  });
}
