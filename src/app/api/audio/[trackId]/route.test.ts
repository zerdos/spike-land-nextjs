/**
 * Audio Track API Route Tests
 * Resolves #332
 */

import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Helper to create a mock session
function createMockSession(userId: string): Session {
  return {
    user: { id: userId, role: "USER" },
    expires: "2099-01-01",
  } as Session;
}

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    audioMixerProject: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock audio R2 client
vi.mock("@/lib/storage/audio-r2-client", () => ({
  isAudioR2Configured: vi.fn(),
  generateAudioKey: vi.fn(),
  downloadAudioFromR2: vi.fn(),
  deleteAudioFromR2: vi.fn(),
  getAudioMetadata: vi.fn(),
}));

// Import after mocking
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  deleteAudioFromR2,
  downloadAudioFromR2,
  generateAudioKey,
  getAudioMetadata,
  isAudioR2Configured,
} from "@/lib/storage/audio-r2-client";
import { DELETE, GET, HEAD } from "./route";

// Typed mock for prisma
const mockPrisma = prisma as unknown as {
  audioMixerProject: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

describe("GET /api/audio/[trackId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/audio/track-123?projectId=project-456",
    );
    const response = await GET(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 503 when R2 is not configured", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession("user-123"));
    vi.mocked(isAudioR2Configured).mockReturnValue(false);

    const request = new Request(
      "http://localhost/api/audio/track-123?projectId=project-456",
    );
    const response = await GET(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(503);
  });

  it("returns 400 when projectId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession("user-123"));
    vi.mocked(isAudioR2Configured).mockReturnValue(true);

    const request = new Request("http://localhost/api/audio/track-123");
    const response = await GET(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 404 when audio file not found", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession("user-123"));
    vi.mocked(isAudioR2Configured).mockReturnValue(true);
    vi.mocked(generateAudioKey).mockReturnValue("test-key.wav");
    vi.mocked(downloadAudioFromR2).mockResolvedValue(null);
    mockPrisma.audioMixerProject.findFirst.mockResolvedValue({
      id: "project-456",
      userId: "user-123",
    });

    const request = new Request(
      "http://localhost/api/audio/track-123?projectId=project-456",
    );
    const response = await GET(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(404);
  });

  it("downloads audio file successfully", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession("user-123"));
    vi.mocked(isAudioR2Configured).mockReturnValue(true);
    vi.mocked(generateAudioKey).mockReturnValue("test-key.wav");
    vi.mocked(downloadAudioFromR2).mockResolvedValue(
      Buffer.from("test audio data"),
    );
    mockPrisma.audioMixerProject.findFirst.mockResolvedValue({
      id: "project-456",
      userId: "user-123",
    });

    const request = new Request(
      "http://localhost/api/audio/track-123?projectId=project-456",
    );
    const response = await GET(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/wav");
    expect(response.headers.get("Content-Disposition")).toContain(
      "track-123.wav",
    );
  });
});

describe("DELETE /api/audio/[trackId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/audio/track-123?projectId=project-456",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 when projectId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession("user-123"));
    vi.mocked(isAudioR2Configured).mockReturnValue(true);

    const request = new Request("http://localhost/api/audio/track-123", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(400);
  });

  it("deletes audio file successfully", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession("user-123"));
    vi.mocked(isAudioR2Configured).mockReturnValue(true);
    vi.mocked(generateAudioKey).mockReturnValue("test-key.wav");
    vi.mocked(deleteAudioFromR2).mockResolvedValue({
      success: true,
      key: "test-key.wav",
    });
    mockPrisma.audioMixerProject.findFirst.mockResolvedValue({
      id: "project-456",
      userId: "user-123",
    });

    const request = new Request(
      "http://localhost/api/audio/track-123?projectId=project-456",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.key).toBe("test-key.wav");
  });

  it("returns 500 when delete fails", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession("user-123"));
    vi.mocked(isAudioR2Configured).mockReturnValue(true);
    vi.mocked(generateAudioKey).mockReturnValue("test-key.wav");
    vi.mocked(deleteAudioFromR2).mockResolvedValue({
      success: false,
      key: "test-key.wav",
      error: "Delete failed",
    });
    mockPrisma.audioMixerProject.findFirst.mockResolvedValue({
      id: "project-456",
      userId: "user-123",
    });

    const request = new Request(
      "http://localhost/api/audio/track-123?projectId=project-456",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Delete failed");
  });
});

describe("HEAD /api/audio/[trackId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/audio/track-123?projectId=project-456",
      {
        method: "HEAD",
      },
    );
    const response = await HEAD(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 when file not found", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession("user-123"));
    vi.mocked(isAudioR2Configured).mockReturnValue(true);
    vi.mocked(generateAudioKey).mockReturnValue("test-key.wav");
    vi.mocked(getAudioMetadata).mockResolvedValue(null);
    mockPrisma.audioMixerProject.findFirst.mockResolvedValue({
      id: "project-456",
      userId: "user-123",
    });

    const request = new Request(
      "http://localhost/api/audio/track-123?projectId=project-456",
      {
        method: "HEAD",
      },
    );
    const response = await HEAD(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns metadata headers", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession("user-123"));
    vi.mocked(isAudioR2Configured).mockReturnValue(true);
    vi.mocked(generateAudioKey).mockReturnValue("test-key.wav");
    vi.mocked(getAudioMetadata).mockResolvedValue({
      key: "test-key.wav",
      size: 1024,
      contentType: "audio/wav",
      lastModified: new Date("2024-01-01"),
    });
    mockPrisma.audioMixerProject.findFirst.mockResolvedValue({
      id: "project-456",
      userId: "user-123",
    });

    const request = new Request(
      "http://localhost/api/audio/track-123?projectId=project-456",
      {
        method: "HEAD",
      },
    );
    const response = await HEAD(request, {
      params: Promise.resolve({ trackId: "track-123" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Length")).toBe("1024");
    expect(response.headers.get("Content-Type")).toBe("audio/wav");
  });
});
