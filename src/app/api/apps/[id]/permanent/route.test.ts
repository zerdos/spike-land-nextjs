import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("DELETE /api/apps/[id]/permanent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/app-1/permanent?confirm=true", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should permanently delete an app successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    const mockApp = {
      id: "app-1",
      name: "Test App",
    };

    vi.mocked(prisma.app.findFirst).mockResolvedValue(mockApp as any);
    vi.mocked(prisma.app.delete).mockResolvedValue(mockApp as any);

    const request = new NextRequest("http://localhost/api/apps/app-1/permanent?confirm=true", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("permanently deleted");

    expect(prisma.app.findFirst).toHaveBeenCalled();
    expect(prisma.app.delete).toHaveBeenCalledWith({
      where: { id: "app-1" },
    });
  });

  it("should return 404 if app is not found in bin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/invalid/permanent?confirm=true", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "invalid" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found in bin. Only binned apps can be permanently deleted.");
  });

  it("should handle server errors during fetch", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    vi.mocked(prisma.app.findFirst).mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost/api/apps/app-1/permanent?confirm=true", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should handle server errors during delete", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    vi.mocked(prisma.app.findFirst).mockResolvedValue({ id: "app-1", name: "Test" } as any);
    vi.mocked(prisma.app.delete).mockRejectedValue(new Error("Delete failed"));

    const request = new NextRequest("http://localhost/api/apps/app-1/permanent?confirm=true", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
