import type { App, MonetizationModel, Requirement } from "@prisma/client";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";

// Type helper for mocking - avoids strict type checking on mock data
type MockApp = App & {
  requirements: Requirement[];
  monetizationModels: MonetizationModel[];
};

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/apps/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/app-1");
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if app not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/app-1");
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found");
  });

  it("should return app details", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockApp = {
      id: "app-1",
      name: "Test App",
      description: "Test Description",
      userId: "user-1",
      status: "DRAFT",
      requirements: [],
      monetizationModels: [],
    };

    vi.mocked(prisma.app.findFirst).mockResolvedValue(
      mockApp as unknown as MockApp,
    );

    const request = new NextRequest("http://localhost/api/apps/app-1");
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("app-1");
  });

  it("should handle server errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest("http://localhost/api/apps/app-1");
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("PATCH /api/apps/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/app-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if app not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/app-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found");
  });

  it("should update app successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockExistingApp = {
      id: "app-1",
      name: "Test App",
      description: "Test Description",
      userId: "user-1",
      status: "DRAFT",
    };

    const mockUpdatedApp = {
      ...mockExistingApp,
      name: "Updated Name",
      requirements: [],
      monetizationModels: [],
    };

    vi.mocked(prisma.app.findFirst).mockResolvedValue(mockExistingApp as unknown as App);
    vi.mocked(prisma.app.update).mockResolvedValue(
      mockUpdatedApp as unknown as MockApp,
    );

    const request = new NextRequest("http://localhost/api/apps/app-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("Updated Name");
  });

  it("should return 400 for invalid data", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockExistingApp = {
      id: "app-1",
      name: "Test App",
      userId: "user-1",
      status: "DRAFT",
    };

    vi.mocked(prisma.app.findFirst).mockResolvedValue(mockExistingApp as App);

    const request = new NextRequest("http://localhost/api/apps/app-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Ab" }),
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation error");
  });

  it("should handle server errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest("http://localhost/api/apps/app-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("DELETE /api/apps/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/app-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if app not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps/app-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found");
  });

  it("should delete app successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockExistingApp = {
      id: "app-1",
      name: "Test App",
      userId: "user-1",
      status: "DRAFT",
    };

    vi.mocked(prisma.app.findFirst).mockResolvedValue(mockExistingApp as unknown as App);
    vi.mocked(prisma.app.update).mockResolvedValue({
      ...mockExistingApp,
      status: "DELETED",
    } as unknown as App);

    const request = new NextRequest("http://localhost/api/apps/app-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should handle server errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest("http://localhost/api/apps/app-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
