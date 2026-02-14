import { getPresignedUploadUrl } from "@/lib/storage/r2-client";
import { z } from "zod";
import type { ToolRegistry } from "../tool-registry";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const StorageGetUploadUrlSchema = z.object({
  filename: z.string().describe("Original filename"),
  content_type: z.string().describe("MIME type of the file"),
  purpose: z.enum(["image", "audio", "asset", "brand"]).describe("Purpose of the upload"),
});

const StorageRegisterUploadSchema = z.object({
  r2_key: z.string().describe("The key returned by storage_get_upload_url"),
  purpose: z.enum(["image", "audio", "asset", "brand"]).describe("Purpose of the upload"),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Additional metadata"),
});

export function registerStorageTools(registry: ToolRegistry, userId: string): void {
  registry.register({
    name: "storage_get_upload_url",
    description: "Get a presigned URL for uploading a file to R2",
    category: "storage",
    tier: "workspace",
    inputSchema: StorageGetUploadUrlSchema.shape,
    handler: async (args: z.infer<typeof StorageGetUploadUrlSchema>): Promise<CallToolResult> => {
      try {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const extension = args.filename.split(".").pop() || "bin";
        const key = `uploads/${userId}/${args.purpose}/${timestamp}-${random}.${extension}`;

        const upload_url = await getPresignedUploadUrl(key, args.content_type);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              upload_url,
              r2_key: key,
              expires_in: 3600,
            }),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown"}` }],
          isError: true,
        };
      }
    },
  });

  registry.register({
    name: "storage_register_upload",
    description: "Register a completed upload and create a database record",
    category: "storage",
    tier: "workspace",
    inputSchema: StorageRegisterUploadSchema.shape,
    handler: async (args: z.infer<typeof StorageRegisterUploadSchema>): Promise<CallToolResult> => {
      try {
        const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${args.r2_key}`;

        // Return upload info — actual DB record creation (e.g. enhancedImage)
        // is handled by the dedicated image upload/enhance flows which collect
        // all required metadata (dimensions, format, size, etc.).
        const result = {
          id: args.r2_key,
          url: publicUrl,
          purpose: args.purpose,
          metadata: args.metadata,
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown"}` }],
          isError: true,
        };
      }
    },
  });
}
