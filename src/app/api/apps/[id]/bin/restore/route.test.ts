import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    appStatusHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("POST /api/apps/[id]/bin/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/app-1/bin/restore", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should restore an app from bin successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    const mockApp = {
      id: "app-1",
      name: "Test App",
      status: "LIVE",
      deletedAt: new Date(),
    };

    vi.mocked(prisma.app.findFirst).mockResolvedValue(mockApp as any);

    const restoredApp = { ...mockApp, deletedAt: null };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback({
        app: {
          update: vi.fn().mockResolvedValue(restoredApp),
        },
        appStatusHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
      } as any);
    });

    const request = new NextRequest("http://localhost/api/apps/app-1/bin/restore", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.app.id).toBe("app-1");

    expect(prisma.app.findFirst).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("should return 404 if app is not found in bin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/invalid/bin/restore", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "invalid" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found in bin");
  });

  it("should handle server errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    vi.mocked(prisma.app.findFirst).mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost/api/apps/app-1/bin/restore", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
