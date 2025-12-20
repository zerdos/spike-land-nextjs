import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    box: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const prisma = (await import("@/lib/prisma")).default;
const { POST } = await import("./route");

describe("/api/v1/agent/heartbeat - POST", () => {
  const mockBoxId = "test-box-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid request body - missing boxId", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid request body");
    expect(json.details).toBeDefined();
  });

  it("returns 400 for invalid request body - boxId wrong type", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: 123 }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid request body");
  });

  it("returns 404 if box does not exist", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Box not found");
    expect(prisma.box.findUnique).toHaveBeenCalledWith({
      where: { id: mockBoxId },
    });
  });

  it("returns success without updating box if already RUNNING", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: mockBoxId,
      status: "RUNNING",
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.timestamp).toBeDefined();
    expect(prisma.box.update).not.toHaveBeenCalled();
  });

  it("updates box to RUNNING if status is not RUNNING", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: mockBoxId,
      status: "STOPPED",
    } as any);
    vi.mocked(prisma.box.update).mockResolvedValue({
      id: mockBoxId,
      status: "RUNNING",
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.timestamp).toBeDefined();
    expect(prisma.box.update).toHaveBeenCalledWith({
      where: { id: mockBoxId },
      data: { status: "RUNNING" },
    });
  });

  it("updates box to RUNNING if status is TERMINATED", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: mockBoxId,
      status: "TERMINATED",
    } as any);
    vi.mocked(prisma.box.update).mockResolvedValue({
      id: mockBoxId,
      status: "RUNNING",
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(prisma.box.update).toHaveBeenCalledWith({
      where: { id: mockBoxId },
      data: { status: "RUNNING" },
    });
  });

  it("accepts optional status field", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: mockBoxId,
      status: "RUNNING",
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId, status: "IDLE" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("accepts optional load field", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: mockBoxId,
      status: "RUNNING",
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId, load: 0.75 }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("accepts all optional fields together", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: mockBoxId,
      status: "RUNNING",
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId, status: "BUSY", load: 0.95 }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 for database errors", async () => {
    vi.mocked(prisma.box.findUnique).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Internal Server Error");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Database error:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("returns 500 for update database errors", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: mockBoxId,
      status: "STOPPED",
    } as any);
    vi.mocked(prisma.box.update).mockRejectedValue(new Error("Update failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Internal Server Error");

    consoleSpy.mockRestore();
  });

  it("returns 400 for invalid load type (string instead of number)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId, load: "high" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid request body");
    expect(json.details).toBeDefined();
  });

  it("returns 400 for invalid JSON body", async () => {
    // Create a request and mock its json() method to throw a SyntaxError
    // This avoids the unhandled rejection from NextRequest's internal body parsing
    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    // Override json() to simulate invalid JSON parsing error
    vi.spyOn(request, "json").mockRejectedValue(
      new SyntaxError("Unexpected token 'n', \"not valid json\" is not valid JSON"),
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid JSON body");
  });

  it("returns timestamp in ISO format", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: mockBoxId,
      status: "RUNNING",
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/v1/agent/heartbeat",
      {
        method: "POST",
        body: JSON.stringify({ boxId: mockBoxId }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
    );
  });
});
