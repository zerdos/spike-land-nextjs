/**
 * Audio Mixer MCP Tools
 *
 * Upload audio tracks and retrieve track metadata for mixer projects.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const ALLOWED_FORMATS = ["wav", "mp3", "webm", "ogg", "flac", "aac", "m4a"] as const;

const AudioUploadSchema = z.object({
  project_id: z.string().min(1).describe("Audio mixer project ID."),
  filename: z.string().min(1).describe("Filename for the audio track."),
  content_type: z.string().min(1).describe("MIME content type (e.g. audio/wav)."),
});

const AudioGetTrackSchema = z.object({
  track_id: z.string().min(1).describe("Audio track ID."),
});

export function registerAudioTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "audio_upload",
    description: "Upload an audio track to a mixer project. Creates a track record and returns track metadata.",
    category: "audio",
    tier: "free",
    inputSchema: AudioUploadSchema.shape,
    handler: async ({ project_id, filename, content_type }: z.infer<typeof AudioUploadSchema>): Promise<CallToolResult> =>
      safeToolCall("audio_upload", async () => {
        const prisma = (await import("@/lib/prisma")).default;

        // Verify project exists and belongs to user
        const project = await prisma.audioMixerProject.findFirst({
          where: { id: project_id, userId },
        });
        if (!project) {
          return textResult("**Error: NOT_FOUND**\nProject not found or access denied.\n**Retryable:** false");
        }

        // Extract format from content_type or filename
        const extMatch = filename.match(/\.(\w+)$/);
        const format = extMatch ? extMatch[1]!.toLowerCase() : content_type.split("/")[1] ?? "wav";
        if (!ALLOWED_FORMATS.includes(format as typeof ALLOWED_FORMATS[number])) {
          return textResult(`**Error: VALIDATION_ERROR**\nInvalid audio format '${format}'. Allowed: ${ALLOWED_FORMATS.join(", ")}.\n**Retryable:** false`);
        }

        // Get current track count for sort order
        const trackCount = await prisma.audioTrack.count({
          where: { projectId: project_id },
        });

        // Create audio track record in DB
        const track = await prisma.audioTrack.create({
          data: {
            projectId: project_id,
            name: filename,
            fileFormat: format,
            duration: 0,
            fileSizeBytes: 0,
            sortOrder: trackCount,
          },
        });

        return textResult(
          `**Audio Track Created!**\n\n` +
          `**Track ID:** ${track.id}\n` +
          `**Project:** ${project.name}\n` +
          `**Filename:** ${filename}\n` +
          `**Format:** ${format}\n` +
          `**Note:** Track record created. Use the audio upload API endpoint to upload the actual file.`,
        );
      }),
  });

  registry.register({
    name: "audio_get_track",
    description: "Get detailed information about an audio track.",
    category: "audio",
    tier: "free",
    inputSchema: AudioGetTrackSchema.shape,
    handler: async ({ track_id }: z.infer<typeof AudioGetTrackSchema>): Promise<CallToolResult> =>
      safeToolCall("audio_get_track", async () => {
        const prisma = (await import("@/lib/prisma")).default;

        const track = await prisma.audioTrack.findUnique({
          where: { id: track_id },
          include: {
            project: {
              select: { id: true, name: true, userId: true },
            },
          },
        });

        if (!track) {
          return textResult("**Error: NOT_FOUND**\nAudio track not found.\n**Retryable:** false");
        }

        // Verify the track belongs to the user's project
        if (track.project.userId !== userId) {
          return textResult("**Error: PERMISSION_DENIED**\nYou do not have access to this track.\n**Retryable:** false");
        }

        return textResult(
          `**Audio Track**\n\n` +
          `**Track ID:** ${track.id}\n` +
          `**Name:** ${track.name}\n` +
          `**Project:** ${track.project.name} (${track.project.id})\n` +
          `**Format:** ${track.fileFormat}\n` +
          `**Duration:** ${track.duration}s\n` +
          `**Size:** ${track.fileSizeBytes} bytes\n` +
          `**Volume:** ${track.volume}\n` +
          `**Muted:** ${track.muted}\n` +
          `**Solo:** ${track.solo}\n` +
          `**Sort Order:** ${track.sortOrder}\n` +
          `**Storage:** ${track.storageType}\n` +
          `**Created:** ${track.createdAt.toISOString()}`,
        );
      }),
  });
}
