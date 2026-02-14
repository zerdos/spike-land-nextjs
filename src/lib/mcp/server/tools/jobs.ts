import prisma from "@/lib/prisma";
import { z } from "zod";
import type { ToolRegistry } from "../tool-registry";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const JobIdSchema = z.object({
  jobId: z.string(),
});

const BatchStatusSchema = z.object({
  jobIds: z.array(z.string()).max(50),
});

const MixHistorySchema = z.object({
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
});

export function registerJobsTools(registry: ToolRegistry, userId: string): void {
  registry.register({
    name: "jobs_get",
    description: "Get status and details of a specific job",
    category: "jobs",
    tier: "workspace",
    inputSchema: JobIdSchema.shape,
    handler: async ({ jobId }: z.infer<typeof JobIdSchema>): Promise<CallToolResult> => {
      try {
        const job = await prisma.imageEnhancementJob.findUnique({
          where: { id: jobId, userId },
        });
        if (!job) throw new Error("Job not found");
        return { content: [{ type: "text", text: JSON.stringify(job) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown"}` }],
          isError: true,
        };
      }
    },
  });

  registry.register({
    name: "jobs_batch_status",
    description: "Fetch status for multiple job IDs at once",
    category: "jobs",
    tier: "workspace",
    inputSchema: BatchStatusSchema.shape,
    handler: async ({ jobIds }: z.infer<typeof BatchStatusSchema>): Promise<CallToolResult> => {
      try {
        const jobs = await prisma.imageEnhancementJob.findMany({
          where: { id: { in: jobIds }, userId },
          select: { id: true, status: true, errorMessage: true },
        });
        return { content: [{ type: "text", text: JSON.stringify({ jobs }) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown"}` }],
          isError: true,
        };
      }
    },
  });

  registry.register({
    name: "jobs_mix_history",
    description: "Get recent mixing job history",
    category: "jobs",
    tier: "workspace",
    inputSchema: MixHistorySchema.shape,
    handler: async ({ limit, offset }: z.infer<typeof MixHistorySchema>): Promise<CallToolResult> => {
      try {
        const history = await prisma.imageEnhancementJob.findMany({
          where: { userId, enhancementType: "BLEND" },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        });
        return { content: [{ type: "text", text: JSON.stringify(history) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown"}` }],
          isError: true,
        };
      }
    },
  });

  registry.register({
    name: "jobs_cancel",
    description: "Cancel a pending job",
    category: "jobs",
    tier: "workspace",
    inputSchema: JobIdSchema.shape,
    handler: async ({ jobId }: z.infer<typeof JobIdSchema>): Promise<CallToolResult> => {
      try {
        const job = await prisma.imageEnhancementJob.findUnique({
          where: { id: jobId, userId },
        });
        if (!job) throw new Error("Job not found");
        
        if (job.status !== "PENDING" && job.status !== "PROCESSING") {
          throw new Error(`Job cannot be cancelled in state: ${job.status}`);
        }

        const updatedJob = await prisma.imageEnhancementJob.update({
          where: { id: jobId },
          data: { status: "CANCELLED" },
        });

        return { content: [{ type: "text", text: JSON.stringify(updatedJob) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown"}` }],
          isError: true,
        };
      }
    },
  });
}
