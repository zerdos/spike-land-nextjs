import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock prisma
const mockPrismaFindUnique = vi.fn();
const mockPrismaUpdate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  default: {
    enhancementPipeline: {
      findUnique: () => mockPrismaFindUnique(),
      update: (args: unknown) => mockPrismaUpdate(args),
    },
  },
}));

// Mock R2 client
const mockUploadToR2 = vi.fn();
const mockDeleteFromR2 = vi.fn();
vi.mock("@/lib/storage/r2-client", () => ({
  uploadToR2: (args: unknown) => mockUploadToR2(args),
  deleteFromR2: (key: string) => mockDeleteFromR2(key),
}));

// Mock sharp
vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    metadata: () =>
      Promise.resolve({
        width: 800,
        height: 600,
        format: "jpeg",
      }),
    resize: vi.fn().mockReturnThis(),
    toBuffer: () => Promise.resolve(Buffer.from("processed-image")),
  })),
}));

// Mock crypto
vi.mock("crypto", () => ({
  default: {
    randomUUID: () => "test-uuid-123",
  },
}));

import { NextRequest } from "next/server";
import { DELETE, POST } from "./route";

function createMockRequest(
  formData?: FormData,
  method = "POST",
  body?: Record<string, unknown>,
): NextRequest {
  const url = "http://localhost:3000/api/pipelines/reference-images";

  if (method === "POST" && formData) {
    return {
      formData: () => Promise.resolve(formData),
      method,
      url,
    } as unknown as NextRequest;
  }

  if (method === "DELETE" && body) {
    return {
      json: () => Promise.resolve(body),
      method,
      url,
    } as unknown as NextRequest;
  }

  return {
    formData: () => Promise.resolve(new FormData()),
    json: () => Promise.resolve({}),
    method,
    url,
  } as unknown as NextRequest;
}

function createMockFile(
  name = "test.jpg",
  type = "image/jpeg",
  size = 1000,
): File {
  const buffer = new ArrayBuffer(size);
  const file = new File([buffer], name, { type });

  // Override size property for testing size validation
  Object.defineProperty(file, "size", { value: size });

  // Add arrayBuffer method for tests
  file.arrayBuffer = () => Promise.resolve(buffer);

  return file;
}

describe("POST /api/pipelines/reference-images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const formData = new FormData();
    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Authentication required");
  });

  it("returns 400 when file is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const formData = new FormData();
    formData.append("pipelineId", "pipeline-123");
    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("File is required");
  });

  it("returns 400 when pipelineId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const formData = new FormData();
    formData.append("file", createMockFile());
    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Pipeline ID is required");
  });

  it("returns 400 for invalid file type", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const formData = new FormData();
    formData.append("file", createMockFile("test.gif", "image/gif"));
    formData.append("pipelineId", "pipeline-123");
    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid file type");
  });

  it("returns 400 when file exceeds size limit", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const formData = new FormData();
    // 6MB file (exceeds 5MB limit)
    formData.append("file", createMockFile("test.jpg", "image/jpeg", 6 * 1024 * 1024));
    formData.append("pipelineId", "pipeline-123");
    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("File size exceeds");
  });

  it("returns 404 when pipeline not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue(null);

    const formData = new FormData();
    formData.append("file", createMockFile());
    formData.append("pipelineId", "nonexistent");
    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Pipeline not found");
  });

  it("returns 403 when user does not own pipeline", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue({
      id: "pipeline-123",
      userId: "other-user",
      promptConfig: {},
    });

    const formData = new FormData();
    formData.append("file", createMockFile());
    formData.append("pipelineId", "pipeline-123");
    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("your own pipelines");
  });

  it("returns 400 when max reference images reached", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue({
      id: "pipeline-123",
      userId: "user-123",
      promptConfig: {
        referenceImages: [
          { url: "url1", r2Key: "key1" },
          { url: "url2", r2Key: "key2" },
          { url: "url3", r2Key: "key3" },
        ],
      },
    });

    const formData = new FormData();
    formData.append("file", createMockFile());
    formData.append("pipelineId", "pipeline-123");
    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Maximum 3 reference images");
  });

  it("successfully uploads reference image", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue({
      id: "pipeline-123",
      userId: "user-123",
      promptConfig: {},
    });
    mockUploadToR2.mockResolvedValue({
      success: true,
      url: "https://r2.example.com/pipelines/pipeline-123/references/test-uuid-123.jpg",
      key: "pipelines/pipeline-123/references/test-uuid-123.jpg",
    });
    mockPrismaUpdate.mockResolvedValue({});

    const formData = new FormData();
    formData.append("file", createMockFile());
    formData.append("pipelineId", "pipeline-123");
    formData.append("description", "Style reference");
    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.referenceImage).toBeDefined();
    expect(data.referenceImage.url).toContain("pipeline-123");
    expect(data.referenceImage.description).toBe("Style reference");
  });

  it("uploads to correct R2 path", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue({
      id: "pipeline-456",
      userId: "user-123",
      promptConfig: { referenceImages: [] },
    });
    mockUploadToR2.mockResolvedValue({
      success: true,
      url: "https://r2.example.com/pipelines/pipeline-456/references/test-uuid-123.jpg",
      key: "pipelines/pipeline-456/references/test-uuid-123.jpg",
    });
    mockPrismaUpdate.mockResolvedValue({});

    const formData = new FormData();
    formData.append("file", createMockFile());
    formData.append("pipelineId", "pipeline-456");
    const request = createMockRequest(formData);
    await POST(request);

    expect(mockUploadToR2).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "pipelines/pipeline-456/references/test-uuid-123.jpg",
      }),
    );
  });

  it("returns 500 when R2 upload fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue({
      id: "pipeline-123",
      userId: "user-123",
      promptConfig: {},
    });
    mockUploadToR2.mockResolvedValue({
      success: false,
      error: "R2 upload failed",
    });

    const formData = new FormData();
    formData.append("file", createMockFile());
    formData.append("pipelineId", "pipeline-123");
    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("R2 upload failed");
  });

  it("appends to existing reference images", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue({
      id: "pipeline-123",
      userId: "user-123",
      promptConfig: {
        customInstructions: "existing instructions",
        referenceImages: [{ url: "existing-url", r2Key: "existing-key" }],
      },
    });
    mockUploadToR2.mockResolvedValue({
      success: true,
      url: "https://r2.example.com/new-image.jpg",
      key: "new-key",
    });
    mockPrismaUpdate.mockResolvedValue({});

    const formData = new FormData();
    formData.append("file", createMockFile());
    formData.append("pipelineId", "pipeline-123");
    const request = createMockRequest(formData);
    await POST(request);

    expect(mockPrismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promptConfig: expect.objectContaining({
            customInstructions: "existing instructions",
            referenceImages: expect.arrayContaining([
              { url: "existing-url", r2Key: "existing-key" },
              expect.objectContaining({ url: "https://r2.example.com/new-image.jpg" }),
            ]),
          }),
        }),
      }),
    );
  });
});

describe("DELETE /api/pipelines/reference-images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createMockRequest(undefined, "DELETE", {
      pipelineId: "pipeline-123",
      r2Key: "some-key",
    });
    const response = await DELETE(request);

    expect(response.status).toBe(401);
  });

  it("returns 400 when pipelineId or r2Key is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const request = createMockRequest(undefined, "DELETE", {
      pipelineId: "pipeline-123",
    });
    const response = await DELETE(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("R2 key are required");
  });

  it("returns 404 when pipeline not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue(null);

    const request = createMockRequest(undefined, "DELETE", {
      pipelineId: "nonexistent",
      r2Key: "some-key",
    });
    const response = await DELETE(request);

    expect(response.status).toBe(404);
  });

  it("returns 403 when user does not own pipeline", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue({
      id: "pipeline-123",
      userId: "other-user",
      promptConfig: {},
    });

    const request = createMockRequest(undefined, "DELETE", {
      pipelineId: "pipeline-123",
      r2Key: "some-key",
    });
    const response = await DELETE(request);

    expect(response.status).toBe(403);
  });

  it("successfully deletes reference image", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue({
      id: "pipeline-123",
      userId: "user-123",
      promptConfig: {
        customInstructions: "keep this",
        referenceImages: [
          { url: "url1", r2Key: "key1" },
          { url: "url2", r2Key: "key-to-delete" },
        ],
      },
    });
    mockDeleteFromR2.mockResolvedValue({ success: true });
    mockPrismaUpdate.mockResolvedValue({});

    const request = createMockRequest(undefined, "DELETE", {
      pipelineId: "pipeline-123",
      r2Key: "key-to-delete",
    });
    const response = await DELETE(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    expect(mockDeleteFromR2).toHaveBeenCalledWith("key-to-delete");
    expect(mockPrismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promptConfig: expect.objectContaining({
            customInstructions: "keep this",
            referenceImages: [{ url: "url1", r2Key: "key1" }],
          }),
        }),
      }),
    );
  });

  it("removes reference image from database even if R2 delete fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrismaFindUnique.mockResolvedValue({
      id: "pipeline-123",
      userId: "user-123",
      promptConfig: {
        referenceImages: [{ url: "url1", r2Key: "key-to-delete" }],
      },
    });
    mockDeleteFromR2.mockResolvedValue({ success: false, error: "R2 error" });
    mockPrismaUpdate.mockResolvedValue({});

    const request = createMockRequest(undefined, "DELETE", {
      pipelineId: "pipeline-123",
      r2Key: "key-to-delete",
    });
    const response = await DELETE(request);

    expect(response.status).toBe(200);
    expect(mockPrismaUpdate).toHaveBeenCalled();
  });
});
