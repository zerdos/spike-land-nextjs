/**
 * Audio Upload API Route Tests
 * Resolves #332
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

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
  uploadAudioToR2: vi.fn(),
}));

// Import after mocking
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  generateAudioKey,
  isAudioR2Configured,
  uploadAudioToR2,
} from "@/lib/storage/audio-r2-client";
import { POST } from "./route";

// Typed mock for prisma
const mockPrisma = prisma as unknown as {
  audioMixerProject: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

// Helper to create a mock file with arrayBuffer method
function createMockFile(name = "test.wav", type = "audio/wav", size = 1024) {
  const buffer = Buffer.alloc(size);
  return {
    name,
    type,
    size,
    arrayBuffer: () =>
      Promise.resolve(buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      )),
  };
}

type MockFile = ReturnType<typeof createMockFile>;
type FormDataValue = MockFile | string | null;

// Helper to create a mock request with formData
function createMockRequest(
  fields: Record<string, FormDataValue>,
): NextRequest {
  const mockFormData = new Map<string, FormDataValue>();
  for (const [key, value] of Object.entries(fields)) {
    mockFormData.set(key, value);
  }

  const req = new NextRequest("http://localhost/api/audio/upload", {
    method: "POST",
  });

  // Override formData method
  req.formData = vi.fn().mockResolvedValue({
    get: (key: string) => mockFormData.get(key) ?? null,
  });

  return req;
}

describe("POST /api/audio/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = createMockRequest({});
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("returns 503 when R2 is not configured", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
      expires: "2099-01-01",
    });
    vi.mocked(isAudioR2Configured).mockReturnValue(false);

    const req = createMockRequest({});
    const response = await POST(req);
    expect(response.status).toBe(503);
  });

  it("returns 400 when no file provided", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
      expires: "2099-01-01",
    });
    vi.mocked(isAudioR2Configured).mockReturnValue(true);

    const req = createMockRequest({});
    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("No file provided");
  });

  it("returns 400 when missing required fields", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
      expires: "2099-01-01",
    });
    vi.mocked(isAudioR2Configured).mockReturnValue(true);

    const req = createMockRequest({
      file: createMockFile(),
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Missing required fields");
  });

  it("uploads audio file successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
      expires: "2099-01-01",
    });
    vi.mocked(isAudioR2Configured).mockReturnValue(true);
    vi.mocked(generateAudioKey).mockReturnValue("test-key.wav");
    vi.mocked(uploadAudioToR2).mockResolvedValue({
      success: true,
      key: "test-key.wav",
      url: "https://example.com/test-key.wav",
      sizeBytes: 1024,
    });
    mockPrisma.audioMixerProject.findFirst.mockResolvedValue({
      id: "project-123",
      userId: "user-123",
    });

    const req = createMockRequest({
      file: createMockFile(),
      projectId: "project-123",
      trackId: "track-456",
      format: "wav",
      duration: "120",
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.key).toBe("test-key.wav");
    expect(data.url).toBe("https://example.com/test-key.wav");
  });

  it("returns 500 when upload fails", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
      expires: "2099-01-01",
    });
    vi.mocked(isAudioR2Configured).mockReturnValue(true);
    vi.mocked(generateAudioKey).mockReturnValue("test-key.wav");
    vi.mocked(uploadAudioToR2).mockResolvedValue({
      success: false,
      key: "test-key.wav",
      url: "",
      sizeBytes: 0,
      error: "Upload failed",
    });
    mockPrisma.audioMixerProject.findFirst.mockResolvedValue({
      id: "project-123",
      userId: "user-123",
    });

    const req = createMockRequest({
      file: createMockFile(),
      projectId: "project-123",
      trackId: "track-456",
      format: "wav",
    });

    const response = await POST(req);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Upload failed");
  });

  it("returns 400 when file size exceeds limit", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
      expires: "2099-01-01",
    });
    vi.mocked(isAudioR2Configured).mockReturnValue(true);
    mockPrisma.audioMixerProject.findFirst.mockResolvedValue({
      id: "project-123",
      userId: "user-123",
    });

    const req = createMockRequest({
      file: createMockFile("large.wav", "audio/wav", 501 * 1024 * 1024), // 501MB
      projectId: "project-123",
      trackId: "track-456",
      format: "wav",
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("exceeds maximum allowed size");
  });
});
