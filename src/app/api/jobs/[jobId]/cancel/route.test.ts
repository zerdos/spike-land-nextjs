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
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/credits/workspace-credit-manager", () => ({
  WorkspaceCreditManager: {
    refundCredits: vi.fn(),
    getBalance: vi.fn().mockResolvedValue({
      remaining: 100,
      limit: 100,
      used: 0,
      tier: "FREE",
      workspaceId: "workspace-123",
    }),
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { WorkspaceCreditManager } = await import("@/lib/credits/workspace-credit-manager");
const { POST } = await import("./route");

describe("/api/jobs/[jobId]/cancel", () => {
  const mockJobId = "test-job-id";
  const mockUserId = "test-user-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
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
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
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
      status: JobStatus.PENDING,
      creditsCost: 10,
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Job not found");
  });

  it("returns 400 if job status is not PENDING or PROCESSING", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.COMPLETED,
      creditsCost: 10,
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Cannot cancel job with status: COMPLETED");
  });

  it("cancels PENDING job and refunds credits", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const mockJob = {
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.PENDING,
      creditsCost: 10,
    };

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(
      mockJob as any,
    );

    const updatedJob = { ...mockJob, status: JobStatus.CANCELLED };
    vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue(
      updatedJob as any,
    );

    vi.mocked(WorkspaceCreditManager.refundCredits).mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.job.status).toBe(JobStatus.CANCELLED);
    expect(json.creditsRefunded).toBe(10);

    expect(WorkspaceCreditManager.refundCredits).toHaveBeenCalledWith(
      mockUserId,
      10,
    );
  });

  it("cancels PROCESSING job and refunds credits", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const mockJob = {
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.PROCESSING,
      creditsCost: 20,
    };

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(
      mockJob as any,
    );

    const updatedJob = { ...mockJob, status: JobStatus.CANCELLED };
    vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue(
      updatedJob as any,
    );

    vi.mocked(WorkspaceCreditManager.refundCredits).mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.creditsRefunded).toBe(20);
  });

  it("returns 500 if credit refund fails", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const mockJob = {
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.PENDING,
      creditsCost: 10,
    };

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(
      mockJob as any,
    );

    const updatedJob = { ...mockJob, status: JobStatus.CANCELLED };
    vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue(
      updatedJob as any,
    );

    vi.mocked(WorkspaceCreditManager.refundCredits).mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toContain("credit refund failed");
    expect(json.job).toBeDefined();
  });

  it("returns 500 if database error occurs", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Database error");
  });

  it("returns 500 with default error message when non-Error is thrown", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    // Throw a non-Error value
    vi.mocked(prisma.imageEnhancementJob.findUnique).mockRejectedValue(
      "string error",
    );

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Failed to cancel job");
  });
});
