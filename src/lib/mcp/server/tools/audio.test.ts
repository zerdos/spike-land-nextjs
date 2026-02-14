import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  audioMixerProject: { findFirst: vi.fn() },
  audioTrack: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerAudioTools } from "./audio";

describe("audio tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerAudioTools(registry, userId); });

  it("should register 2 audio tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(2);
  });

  describe("audio_upload", () => {
    it("should create an audio track", async () => {
      mockPrisma.audioMixerProject.findFirst.mockResolvedValue({ id: "p1", name: "My Project", userId });
      mockPrisma.audioTrack.count.mockResolvedValue(2);
      mockPrisma.audioTrack.create.mockResolvedValue({ id: "t1" });
      const handler = registry.handlers.get("audio_upload")!;
      const result = await handler({ project_id: "p1", filename: "track.wav", content_type: "audio/wav" });
      expect(getText(result)).toContain("Audio Track Created!");
      expect(getText(result)).toContain("t1");
      expect(getText(result)).toContain("My Project");
      expect(getText(result)).toContain("track.wav");
      expect(getText(result)).toContain("wav");
      expect(mockPrisma.audioTrack.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          projectId: "p1",
          name: "track.wav",
          fileFormat: "wav",
          sortOrder: 2,
        }),
      }));
    });

    it("should return NOT_FOUND when project does not exist", async () => {
      mockPrisma.audioMixerProject.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("audio_upload")!;
      const result = await handler({ project_id: "nope", filename: "track.mp3", content_type: "audio/mp3" });
      expect(getText(result)).toContain("NOT_FOUND");
      expect(mockPrisma.audioTrack.create).not.toHaveBeenCalled();
    });

    it("should reject invalid audio format", async () => {
      mockPrisma.audioMixerProject.findFirst.mockResolvedValue({ id: "p1", name: "My Project", userId });
      const handler = registry.handlers.get("audio_upload")!;
      const result = await handler({ project_id: "p1", filename: "track.exe", content_type: "audio/exe" });
      expect(getText(result)).toContain("VALIDATION_ERROR");
      expect(getText(result)).toContain("exe");
      expect(getText(result)).toContain("wav, mp3, webm, ogg, flac, aac, m4a");
      expect(mockPrisma.audioTrack.create).not.toHaveBeenCalled();
    });

    it("should extract format from content_type when filename has no extension", async () => {
      mockPrisma.audioMixerProject.findFirst.mockResolvedValue({ id: "p1", name: "My Project", userId });
      mockPrisma.audioTrack.count.mockResolvedValue(0);
      mockPrisma.audioTrack.create.mockResolvedValue({ id: "t2" });
      const handler = registry.handlers.get("audio_upload")!;
      const result = await handler({ project_id: "p1", filename: "noextension", content_type: "audio/mp3" });
      expect(getText(result)).toContain("Audio Track Created!");
      expect(getText(result)).toContain("mp3");
    });

    it("should extract format from filename extension over content_type", async () => {
      mockPrisma.audioMixerProject.findFirst.mockResolvedValue({ id: "p1", name: "My Project", userId });
      mockPrisma.audioTrack.count.mockResolvedValue(0);
      mockPrisma.audioTrack.create.mockResolvedValue({ id: "t3" });
      const handler = registry.handlers.get("audio_upload")!;
      const result = await handler({ project_id: "p1", filename: "song.ogg", content_type: "audio/wav" });
      expect(getText(result)).toContain("Audio Track Created!");
      expect(getText(result)).toContain("ogg");
    });

    it("should fall back to 'wav' when filename has no extension and content_type has no subtype", async () => {
      mockPrisma.audioMixerProject.findFirst.mockResolvedValue({ id: "p1", name: "My Project", userId });
      mockPrisma.audioTrack.count.mockResolvedValue(0);
      mockPrisma.audioTrack.create.mockResolvedValue({ id: "t5" });
      const handler = registry.handlers.get("audio_upload")!;
      const result = await handler({ project_id: "p1", filename: "noextension", content_type: "audio" });
      expect(getText(result)).toContain("Audio Track Created!");
      // When content_type.split("/")[1] is undefined, falls back to "wav"
      // but "audio".split("/")[1] is undefined, so ?? "wav" kicks in
      expect(mockPrisma.audioTrack.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ fileFormat: "wav" }),
      }));
    });

    it("should handle database error via safeToolCall", async () => {
      mockPrisma.audioMixerProject.findFirst.mockRejectedValue(new Error("Database connection failed"));
      const handler = registry.handlers.get("audio_upload")!;
      const result = await handler({ project_id: "p1", filename: "track.wav", content_type: "audio/wav" });
      expect(getText(result)).toContain("Error");
      expect(getText(result)).toContain("Database connection failed");
    });

    it("should use sortOrder based on existing track count", async () => {
      mockPrisma.audioMixerProject.findFirst.mockResolvedValue({ id: "p1", name: "My Project", userId });
      mockPrisma.audioTrack.count.mockResolvedValue(5);
      mockPrisma.audioTrack.create.mockResolvedValue({ id: "t4" });
      const handler = registry.handlers.get("audio_upload")!;
      await handler({ project_id: "p1", filename: "track.flac", content_type: "audio/flac" });
      expect(mockPrisma.audioTrack.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ sortOrder: 5 }),
      }));
    });
  });

  describe("audio_get_track", () => {
    it("should return track details", async () => {
      mockPrisma.audioTrack.findUnique.mockResolvedValue({
        id: "t1", name: "track.wav", fileFormat: "wav",
        duration: 120, fileSizeBytes: 5000000, volume: 0.8,
        muted: false, solo: true, sortOrder: 0, storageType: "R2",
        createdAt: new Date("2024-06-15T12:00:00Z"),
        project: { id: "p1", name: "My Project", userId },
      });
      const handler = registry.handlers.get("audio_get_track")!;
      const result = await handler({ track_id: "t1" });
      expect(getText(result)).toContain("Audio Track");
      expect(getText(result)).toContain("t1");
      expect(getText(result)).toContain("track.wav");
      expect(getText(result)).toContain("My Project");
      expect(getText(result)).toContain("wav");
      expect(getText(result)).toContain("120s");
      expect(getText(result)).toContain("5000000 bytes");
      expect(getText(result)).toContain("0.8");
      expect(getText(result)).toContain("false");
      expect(getText(result)).toContain("true");
      expect(getText(result)).toContain("R2");
    });

    it("should return NOT_FOUND when track does not exist", async () => {
      mockPrisma.audioTrack.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("audio_get_track")!;
      const result = await handler({ track_id: "nope" });
      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should return PERMISSION_DENIED when track belongs to another user", async () => {
      mockPrisma.audioTrack.findUnique.mockResolvedValue({
        id: "t1", name: "track.wav", fileFormat: "wav",
        duration: 60, fileSizeBytes: 1000, volume: 1,
        muted: false, solo: false, sortOrder: 0, storageType: "R2",
        createdAt: new Date(),
        project: { id: "p2", name: "Other Project", userId: "other-user-456" },
      });
      const handler = registry.handlers.get("audio_get_track")!;
      const result = await handler({ track_id: "t1" });
      expect(getText(result)).toContain("PERMISSION_DENIED");
    });
  });
});
