import { JobStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      findMany: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { POST } = await import("./route");

describe("/api/jobs/batch-status - POST", () => {
  const mockUserId = "test-user-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["job-1"] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 if session has no user id", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {},
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["job-1"] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 if request body is invalid JSON", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    // Create a request and mock its json() method to throw a SyntaxError
    // This avoids the unhandled rejection from NextRequest's internal body parsing
    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    // Override json() to simulate invalid JSON parsing error
    vi.spyOn(request, "json").mockRejectedValue(
      new SyntaxError(
        "Unexpected token 'i', \"invalid json\" is not valid JSON",
      ),
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid JSON body");
  });

  it("returns 400 if jobIds is not an array", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: "not-an-array" }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("jobIds must be a non-empty array");
  });

  it("returns 400 if jobIds is an empty array", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: [] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("jobIds must be a non-empty array");
  });

  it("returns 400 if jobIds exceeds maximum limit", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const tooManyJobIds = Array.from({ length: 51 }, (_, i) => `job-${i}`);
    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: tooManyJobIds }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Maximum 50 job IDs allowed per request");
  });

  it("returns 400 if any jobId is not a string", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["job-1", 123, "job-3"] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("All jobIds must be non-empty strings");
  });

  it("returns 400 if any jobId is an empty string", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["job-1", "", "job-3"] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("All jobIds must be non-empty strings");
  });

  it("returns job statuses for valid request", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const mockJobs = [
      { id: "job-1", status: JobStatus.COMPLETED, errorMessage: null },
      { id: "job-2", status: JobStatus.PROCESSING, errorMessage: null },
      {
        id: "job-3",
        status: JobStatus.FAILED,
        errorMessage: "Enhancement failed",
      },
    ];

    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(
      mockJobs as any,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["job-1", "job-2", "job-3"] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.jobs).toHaveLength(3);
    expect(json.jobs[0]).toEqual({
      id: "job-1",
      status: JobStatus.COMPLETED,
      errorMessage: null,
    });
    expect(json.jobs[1]).toEqual({
      id: "job-2",
      status: JobStatus.PROCESSING,
      errorMessage: null,
    });
    expect(json.jobs[2]).toEqual({
      id: "job-3",
      status: JobStatus.FAILED,
      errorMessage: "Enhancement failed",
    });
  });

  it("calls prisma with correct parameters", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["job-1", "job-2"] }),
      },
    );
    await POST(request);

    expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["job-1", "job-2"] },
        userId: mockUserId,
      },
      select: {
        id: true,
        status: true,
        errorMessage: true,
      },
    });
  });

  it("filters out jobs not found or not owned by user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    // Only return job-1, simulating job-2 doesn't exist or belongs to another user
    const mockJobs = [
      { id: "job-1", status: JobStatus.COMPLETED, errorMessage: null },
    ];

    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(
      mockJobs as any,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["job-1", "job-2"] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.jobs).toHaveLength(1);
    expect(json.jobs[0].id).toBe("job-1");
  });

  it("maintains the order of requested jobIds in response", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    // Return jobs in different order than requested
    const mockJobs = [
      { id: "job-3", status: JobStatus.PENDING, errorMessage: null },
      { id: "job-1", status: JobStatus.COMPLETED, errorMessage: null },
      { id: "job-2", status: JobStatus.PROCESSING, errorMessage: null },
    ];

    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(
      mockJobs as any,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["job-1", "job-2", "job-3"] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.jobs).toHaveLength(3);
    // Should be in requested order: job-1, job-2, job-3
    expect(json.jobs[0].id).toBe("job-1");
    expect(json.jobs[1].id).toBe("job-2");
    expect(json.jobs[2].id).toBe("job-3");
  });

  it("returns empty array when no jobs are found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["nonexistent-job"] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.jobs).toHaveLength(0);
  });

  it("returns 500 if database error occurs", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    vi.mocked(prisma.imageEnhancementJob.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["job-1"] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Failed to fetch job statuses");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching batch job statuses:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("handles exactly 50 job IDs (max limit)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const maxJobIds = Array.from({ length: 50 }, (_, i) => `job-${i}`);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: maxJobIds }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.jobs).toBeDefined();
  });

  it("handles single job ID", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const mockJobs = [
      { id: "job-1", status: JobStatus.COMPLETED, errorMessage: null },
    ];

    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(
      mockJobs as any,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/batch-status",
      {
        method: "POST",
        body: JSON.stringify({ jobIds: ["job-1"] }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.jobs).toHaveLength(1);
    expect(json.jobs[0].id).toBe("job-1");
  });
});
