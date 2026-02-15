import { z } from "zod";
import type { ToolRegistry } from "../tool-registry";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";
import { createRule, getRulesForWorkspace, checkContent } from "@/lib/policy-checker";
import {
  type PolicyCategory,
  type PolicyContentType,
  type PolicyRuleType,
  type PolicySeverity,
  type SocialPlatform,
} from "@prisma/client";

const ListRulesSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  platform: z.enum(["TWITTER", "LINKEDIN", "FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "DISCORD", "SNAPCHAT", "PINTEREST"]).optional().describe("Filter by platform."),
  category: z.string().optional().describe("Filter by category."),
  isActive: z.boolean().optional(),
});

const CreateRuleSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  name: z.string().min(1),
  description: z.string().min(1),
  platform: z.enum(["TWITTER", "LINKEDIN", "FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "DISCORD", "SNAPCHAT", "PINTEREST"]).optional(),
  category: z.string().min(1),
  ruleType: z.string().min(1),
  conditions: z.record(z.string(), z.unknown()),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "WARNING", "ERROR"]).optional().default("MEDIUM"),
  isBlocking: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sourceUrl: z.string().url().optional(),
});

const CheckPolicySchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  content: z.string().min(1),
  platform: z.enum(["TWITTER", "LINKEDIN", "FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "DISCORD", "SNAPCHAT", "PINTEREST"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export function registerPolicyTools(registry: ToolRegistry, userId: string): void {
  registry.register({
    name: "policy_list_rules",
    description: "List policy rules for a workspace.",
    category: "policy",
    tier: "workspace",
    inputSchema: ListRulesSchema.shape,
    handler: async (args: z.infer<typeof ListRulesSchema>): Promise<CallToolResult> =>
      safeToolCall("policy_list_rules", async () => {
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const rules = await getRulesForWorkspace(workspace.id, {
          platform: args.platform as SocialPlatform,
          category: args.category,
          isActive: args.isActive,
        });
        if (rules.length === 0) return textResult("No policy rules found.");
        let text = `**Policy Rules for ${workspace.name}**\n\n`;
        for (const r of rules) {
          text += `- **${r.name}** (${r.category})\n  Severity: ${r.severity} | Blocking: ${r.isBlocking}\n  Description: ${r.description}\n  ID: \`${r.id}\`\n\n`;
        }
        return textResult(text);
      }, { userId, input: args }),
  });

  registry.register({
    name: "policy_create_rule",
    description: "Create a new policy rule for a workspace.",
    category: "policy",
    tier: "workspace",
    inputSchema: CreateRuleSchema.shape,
    handler: async (args: z.infer<typeof CreateRuleSchema>): Promise<CallToolResult> =>
      safeToolCall("policy_create_rule", async () => {
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const rule = await createRule(workspace.id, {
          name: args.name,
          description: args.description,
          platform: args.platform as SocialPlatform,
          category: args.category as PolicyCategory,
          ruleType: args.ruleType as PolicyRuleType,
          conditions: args.conditions as Record<string, unknown>, // conditions is complex JSON
          severity: args.severity as PolicySeverity,
          isBlocking: args.isBlocking,
          isActive: args.isActive,
          sourceUrl: args.sourceUrl,
        });
        return textResult(`**Policy Rule Created!**\n\nID: \`${rule.id}\`\nName: ${rule.name}`);
      }, { userId, input: args }),
  });

  registry.register({
    name: "policy_check_content",
    description: "Check content against workspace policies.",
    category: "policy",
    tier: "workspace",
    inputSchema: CheckPolicySchema.shape,
    handler: async (args: z.infer<typeof CheckPolicySchema>): Promise<CallToolResult> =>
      safeToolCall("policy_check_content", async () => {
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const result = await checkContent(workspace.id, {
          contentType: "POST" as PolicyContentType,
          contentText: args.content,
          platform: args.platform as SocialPlatform,
          contentMetadata: args.metadata as Record<string, unknown>,
        }, userId);

        if (result.canPublish) {
          return textResult("✅ Content is compliant with all policies.");
        }

        let text = `❌ **Policy Violations Found**\n\n`;
        for (const v of result.violations) {
          text += `### ${v.ruleName} (${v.severity})\n`;
          text += `**Reason:** ${v.message}\n`;
          if (v.isBlocking) text += `⚠️ **BLOCKING**\n`;
          text += `\n`;
        }
        return textResult(text);
      }, { userId, input: args }),
  });
}
