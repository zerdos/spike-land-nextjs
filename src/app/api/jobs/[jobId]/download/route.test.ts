import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

const mockPrisma = {
  imageEnhancementJob: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      findUnique: (...args: unknown[]) => mockPrisma.imageEnhancementJob.findUnique(...args),
    },
  },
}));

const mockCheckRateLimit = vi.fn(async (_key: string, _config: object) => ({
  isLimited: false,
  remaining: 99,
  resetAt: Date.now() + 60000,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: (key: string, config: object) => mockCheckRateLimit(key, config),
  rateLimitConfigs: { general: {} },
}));

const mockUser = { id: "user-1", email: "test@example.com" };
const mockSession = { user: mockUser };

const mockJob = {
  id: "job-123",
  userId: "user-1",
  status: "COMPLETED",
  enhancedUrl: "https://r2.example.com/enhanced.jpg",
  image: {
    name: "Test Mix",
  },
};

function createMockStream(data: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    },
  });
}

describe("GET /api/jobs/[jobId]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockAuth.mockResolvedValue(mockSession);
    mockCheckRateLimit.mockResolvedValue({
      isLimited: false,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
  });

  it("should return 401 if not authenticated for non-anonymous job", async () => {
    mockAuth.mockResolvedValue(null);
    // First, job is found and it's not anonymous
    mockPrisma.imageEnhancementJob.findUnique.mockResolvedValue({
      ...mockJob,
      isAnonymous: false,
    });

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if job not found", async () => {
    mockPrisma.imageEnhancementJob.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/jobs/nonexistent/download",
    );
    const context = { params: Promise.resolve({ jobId: "nonexistent" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Job not found");
  });

  it("should return 403 if user does not own the job", async () => {
    const otherUserJob = { ...mockJob, userId: "other-user" };
    mockPrisma.imageEnhancementJob.findUnique.mockResolvedValue(otherUserJob);

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 404 if job is not completed", async () => {
    const processingJob = { ...mockJob, status: "PROCESSING" };
    mockPrisma.imageEnhancementJob.findUnique.mockResolvedValue(processingJob);

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Image not available for download");
  });

  it("should return 404 if enhancedUrl is null", async () => {
    const noUrlJob = { ...mockJob, enhancedUrl: null };
    mockPrisma.imageEnhancementJob.findUnique.mockResolvedValue(noUrlJob);

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Image not available for download");
  });

  it("should proxy image download successfully", async () => {
    mockPrisma.imageEnhancementJob.findUnique.mockResolvedValue(mockJob);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: createMockStream("image-data"),
      headers: new Headers({ "Content-Type": "image/jpeg" }),
    } as Response);

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Content-Disposition")).toContain(
      "attachment",
    );
    expect(response.headers.get("Content-Disposition")).toContain("Test_Mix");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://r2.example.com/enhanced.jpg",
    );
  });

  it("should handle different content types", async () => {
    mockPrisma.imageEnhancementJob.findUnique.mockResolvedValue(mockJob);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: createMockStream("image-data"),
      headers: new Headers({ "Content-Type": "image/png" }),
    } as Response);

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toContain(".png");
  });

  it("should return 502 if upstream fetch fails", async () => {
    mockPrisma.imageEnhancementJob.findUnique.mockResolvedValue(mockJob);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Failed to fetch image");
  });

  it("should return 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      isLimited: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many download requests");
  });

  it("should return 500 on database error", async () => {
    mockPrisma.imageEnhancementJob.findUnique.mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to download image");
  });

  it("should sanitize filename with special characters", async () => {
    const jobWithSpecialName = {
      ...mockJob,
      image: { name: "Test!@#$%Mix" },
    };
    mockPrisma.imageEnhancementJob.findUnique.mockResolvedValue(
      jobWithSpecialName,
    );

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: createMockStream("image-data"),
      headers: new Headers({ "Content-Type": "image/jpeg" }),
    } as Response);

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain(
      "Test_____Mix",
    );
  });

  it("should use fallback name when image has no name", async () => {
    const jobWithNoImageName = {
      ...mockJob,
      image: null,
    };
    mockPrisma.imageEnhancementJob.findUnique.mockResolvedValue(
      jobWithNoImageName,
    );

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: createMockStream("image-data"),
      headers: new Headers({ "Content-Type": "image/jpeg" }),
    } as Response);

    const request = new NextRequest(
      "http://localhost/api/jobs/job-123/download",
    );
    const context = { params: Promise.resolve({ jobId: "job-123" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("mix-");
  });
});
