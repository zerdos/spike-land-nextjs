import { JobStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { DELETE, GET } = await import("./route");

describe("/api/jobs/[jobId] - GET", () => {
  const mockJobId = "test-job-id";
  const mockUserId = "test-user-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated for non-anonymous job", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    // First call is the initial check for isAnonymous
    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      isAnonymous: false,
      userId: mockUserId,
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 404 if job does not exist", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Job not found");
  });

  it("returns 404 if job belongs to different user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: "different-user-id",
      status: JobStatus.COMPLETED,
      image: {
        id: "image-id",
        name: "test-image",
        originalUrl: "http://example.com/image.jpg",
        originalWidth: 1024,
        originalHeight: 768,
      },
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Job not found");
  });

  it("returns job details for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const mockJob = {
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.COMPLETED,
      tier: "TIER_2K",
      tokensCost: 20,
      enhancedUrl: "http://example.com/enhanced.jpg",
      enhancedWidth: 2048,
      enhancedHeight: 1536,
      errorMessage: null,
      createdAt: new Date("2024-01-01"),
      processingStartedAt: new Date("2024-01-01"),
      processingCompletedAt: new Date("2024-01-01"),
      image: {
        id: "image-id",
        name: "test-image",
        originalUrl: "http://example.com/image.jpg",
        originalWidth: 1024,
        originalHeight: 768,
      },
    };

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(
      mockJob as any,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.id).toBe(mockJobId);
    expect(json.status).toBe(JobStatus.COMPLETED);
    expect(json.tier).toBe("TIER_2K");
    expect(json.tokensCost).toBe(20);
    expect(json.image.id).toBe("image-id");
  });

  it("returns 500 if database error occurs", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Database error");
  });
});

describe("/api/jobs/[jobId] - DELETE", () => {
  const mockJobId = "test-job-id";
  const mockUserId = "test-user-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 404 if job does not exist", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Job not found");
  });

  it("returns 404 if job belongs to different user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: "different-user-id",
      status: JobStatus.COMPLETED,
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Job not found");
  });

  it("returns 400 if job status is PENDING", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.PENDING,
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("Cannot delete job with status: PENDING");
  });

  it("returns 400 if job status is PROCESSING", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.PROCESSING,
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("Cannot delete job with status: PROCESSING");
  });

  it("deletes COMPLETED job successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.COMPLETED,
    } as any);

    vi.mocked(prisma.imageEnhancementJob.delete).mockResolvedValue({} as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe("Job deleted successfully");
    expect(prisma.imageEnhancementJob.delete).toHaveBeenCalledWith({
      where: { id: mockJobId },
    });
  });

  it("deletes FAILED job successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.FAILED,
    } as any);

    vi.mocked(prisma.imageEnhancementJob.delete).mockResolvedValue({} as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("deletes CANCELLED job successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.CANCELLED,
    } as any);

    vi.mocked(prisma.imageEnhancementJob.delete).mockResolvedValue({} as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("deletes REFUNDED job successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.REFUNDED,
    } as any);

    vi.mocked(prisma.imageEnhancementJob.delete).mockResolvedValue({} as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 if database error occurs", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Database error");
  });
});
