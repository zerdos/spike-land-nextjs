import prisma from "@/lib/prisma";
import { z } from "zod";
import type { ToolRegistry } from "../tool-registry";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const CreateShareSchema = z.object({
  imageId: z.string().describe("ID of the image to share."),
});

const GetShareSchema = z.object({
  token: z.string().describe("Share token."),
});

export function registerShareTools(registry: ToolRegistry, userId: string): void {
  registry.register({
    name: "share_create_token",
    description: "Generate a unique share token for an image.",
    category: "share",
    tier: "workspace",
    inputSchema: CreateShareSchema.shape,
    handler: async ({ imageId }: z.infer<typeof CreateShareSchema>): Promise<CallToolResult> => {
      try {
        const image = await prisma.enhancedImage.findUnique({
          where: { id: imageId, userId },
        });
        if (!image) throw new Error("Image not found");

        if (image.shareToken) {
          return { content: [{ type: "text", text: JSON.stringify({ token: image.shareToken }) }] };
        }

        const token = (await import("crypto")).randomBytes(16).toString("hex");
        const updated = await prisma.enhancedImage.update({
          where: { id: imageId },
          data: { shareToken: token },
        });

        return { content: [{ type: "text", text: JSON.stringify({ token: updated.shareToken }) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown"}` }],
          isError: true,
        };
      }
    },
  });

  registry.register({
    name: "share_get_info",
    description: "Get metadata for a shared image using a token.",
    category: "share",
    tier: "free",
    inputSchema: GetShareSchema.shape,
    handler: async ({ token }: z.infer<typeof GetShareSchema>): Promise<CallToolResult> => {
      try {
        const image = await prisma.enhancedImage.findUnique({
          where: { shareToken: token },
          include: {
            enhancementJobs: {
              where: { status: "COMPLETED" },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            user: { select: { name: true } },
          },
        });

        if (!image) throw new Error("Shared item not found");

        return { content: [{ type: "text", text: JSON.stringify(image) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown"}` }],
          isError: true,
        };
      }
    },
  });
}
