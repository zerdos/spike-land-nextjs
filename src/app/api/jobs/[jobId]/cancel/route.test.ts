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

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: {
    refundTokens: vi.fn(),
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { TokenBalanceManager } = await import("@/lib/tokens/balance-manager");
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
      tokensCost: 10,
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
      tokensCost: 10,
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

  it("cancels PENDING job and refunds tokens", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const mockJob = {
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.PENDING,
      tokensCost: 10,
    };

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(
      mockJob as any,
    );

    const updatedJob = { ...mockJob, status: JobStatus.CANCELLED };
    vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue(
      updatedJob as any,
    );

    vi.mocked(TokenBalanceManager.refundTokens).mockResolvedValue({
      success: true,
      balance: 100,
      transaction: {} as any,
    });

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
    expect(json.tokensRefunded).toBe(10);
    expect(json.newBalance).toBe(100);

    expect(TokenBalanceManager.refundTokens).toHaveBeenCalledWith(
      mockUserId,
      10,
      mockJobId,
      "Job cancelled by user",
    );
  });

  it("cancels PROCESSING job and refunds tokens", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const mockJob = {
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.PROCESSING,
      tokensCost: 20,
    };

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(
      mockJob as any,
    );

    const updatedJob = { ...mockJob, status: JobStatus.CANCELLED };
    vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue(
      updatedJob as any,
    );

    vi.mocked(TokenBalanceManager.refundTokens).mockResolvedValue({
      success: true,
      balance: 120,
      transaction: {} as any,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.tokensRefunded).toBe(20);
    expect(json.newBalance).toBe(120);
  });

  it("returns 500 if token refund fails", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const mockJob = {
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.PENDING,
      tokensCost: 10,
    };

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(
      mockJob as any,
    );

    const updatedJob = { ...mockJob, status: JobStatus.CANCELLED };
    vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue(
      updatedJob as any,
    );

    vi.mocked(TokenBalanceManager.refundTokens).mockResolvedValue({
      success: false,
      error: "Refund failed",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/cancel",
    );
    const response = await POST(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toContain("token refund failed");
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
