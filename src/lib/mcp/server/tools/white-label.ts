import { z } from "zod";
import type { ToolRegistry } from "../tool-registry";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";
import { whiteLabelConfigPatchSchema } from "@/types/white-label";

const GetWhiteLabelSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
});

const UpdateWhiteLabelSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  config: whiteLabelConfigPatchSchema,
});

export function registerWhiteLabelTools(registry: ToolRegistry, userId: string): void {
  registry.register({
    name: "white_label_get_config",
    description: "Fetch workspace white-label configuration.",
    category: "white-label",
    tier: "workspace",
    inputSchema: GetWhiteLabelSchema.shape,
    handler: async (args: z.infer<typeof GetWhiteLabelSchema>): Promise<CallToolResult> =>
      safeToolCall("white_label_get_config", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        if (workspace.subscriptionTier === "FREE") {
          throw new Error("White-label features require PRO or BUSINESS subscription");
        }

        const config = await prisma.workspaceWhiteLabelConfig.findUnique({
          where: { workspaceId: workspace.id },
        });

        if (!config) return textResult("No white-label configuration found for this workspace.");
        return textResult(`**White-Label Configuration for ${workspace.name}**\n\n${JSON.stringify(config, null, 2)}`);
      }, { userId, input: args }),
  });

  registry.register({
    name: "white_label_update_config",
    description: "Update workspace white-label configuration.",
    category: "white-label",
    tier: "workspace",
    inputSchema: UpdateWhiteLabelSchema.shape,
    handler: async (args: z.infer<typeof UpdateWhiteLabelSchema>): Promise<CallToolResult> =>
      safeToolCall("white_label_update_config", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        if (workspace.subscriptionTier === "FREE") {
          throw new Error("White-label features require PRO or BUSINESS subscription");
        }

        const config = await prisma.workspaceWhiteLabelConfig.upsert({
          where: { workspaceId: workspace.id },
          create: {
            workspaceId: workspace.id,
            ...args.config,
          },
          update: args.config,
        });

        return textResult(`**White-Label Configuration Updated!**\n\n${JSON.stringify(config, null, 2)}`);
      }, { userId, input: args }),
  });
}
