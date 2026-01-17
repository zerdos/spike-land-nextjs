import { auth } from "@/auth";
import { findAppByIdentifierSimple } from "@/lib/app-lookup";
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
      update: vi.fn(),
    },
    appStatusHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/app-lookup", () => ({
  findAppByIdentifierSimple: vi.fn(),
}));

describe("POST /api/apps/[id]/bin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/app-1/bin", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should move an app to the bin successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", role: "USER" },
      expires: "2025-12-31",
    });

    const mockApp = {
      id: "app-1",
      name: "Test App",
      status: "LIVE",
      deletedAt: null,
    };

    vi.mocked(findAppByIdentifierSimple).mockResolvedValue(mockApp as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as any);

    const request = new NextRequest("http://localhost/api/apps/app-1/bin", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deletedAt).toBeDefined();

    expect(findAppByIdentifierSimple).toHaveBeenCalledWith("app-1", "user-1");
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("should return 404 if app is not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    vi.mocked(findAppByIdentifierSimple).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/invalid/bin", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "invalid" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found");
  });

  it("should return 400 if app is already in bin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    const mockApp = {
      id: "app-1",
      deletedAt: new Date(),
    };

    vi.mocked(findAppByIdentifierSimple).mockResolvedValue(mockApp as any);

    const request = new NextRequest("http://localhost/api/apps/app-1/bin", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("App is already in bin");
  });

  it("should handle server errors during transaction", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    vi.mocked(findAppByIdentifierSimple).mockResolvedValue({ id: "app-1", deletedAt: null } as any);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost/api/apps/app-1/bin", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
