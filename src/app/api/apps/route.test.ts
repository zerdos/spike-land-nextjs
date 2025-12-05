import type { App, MonetizationModel, Requirement } from "@prisma/client";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("POST /api/apps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps", {
      method: "POST",
      body: JSON.stringify({
        name: "Test App",
        description: "Test Description",
        requirements: "Test Requirements",
        monetizationModel: "free",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should create an app successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockApp = {
      id: "app-1",
      name: "Test App",
      description: "Test Description for the app",
      userId: "user-1",
      status: "DRAFT",
      requirements: [
        {
          id: "req-1",
          description: "Test Requirements with enough length to pass validation",
          priority: "MEDIUM",
          status: "PENDING",
        },
      ],
      monetizationModels: [
        {
          id: "mon-1",
          type: "FREE",
          features: [],
        },
      ],
    };

    vi.mocked(prisma.app.create).mockResolvedValue(
      mockApp as App & { requirements: Requirement[]; monetizationModels: MonetizationModel[]; },
    );

    const request = new NextRequest("http://localhost/api/apps", {
      method: "POST",
      body: JSON.stringify({
        name: "Test App",
        description: "Test Description for the app",
        requirements: "Test Requirements with enough length to pass validation",
        monetizationModel: "free",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe("Test App");
    expect(prisma.app.create).toHaveBeenCalledWith({
      data: {
        name: "Test App",
        description: "Test Description for the app",
        userId: "user-1",
        status: "DRAFT",
        requirements: {
          create: {
            description: "Test Requirements with enough length to pass validation",
            priority: "MEDIUM",
            status: "PENDING",
          },
        },
        monetizationModels: {
          create: {
            type: "FREE",
            features: [],
          },
        },
      },
      include: {
        requirements: true,
        monetizationModels: true,
      },
    });
  });

  it("should return 400 for invalid data", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const request = new NextRequest("http://localhost/api/apps", {
      method: "POST",
      body: JSON.stringify({
        name: "Ab",
        description: "Short",
        requirements: "Short",
        monetizationModel: "invalid",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation error");
  });

  it("should handle server errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.create).mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost/api/apps", {
      method: "POST",
      body: JSON.stringify({
        name: "Test App",
        description: "Test Description",
        requirements: "Test Requirements with enough length",
        monetizationModel: "free",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("GET /api/apps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return user's apps", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockApps = [
      {
        id: "app-1",
        name: "Test App 1",
        description: "Description 1",
        userId: "user-1",
        status: "DRAFT",
        requirements: [],
        monetizationModels: [],
      },
      {
        id: "app-2",
        name: "Test App 2",
        description: "Description 2",
        userId: "user-1",
        status: "ACTIVE",
        requirements: [],
        monetizationModels: [],
      },
    ];

    vi.mocked(prisma.app.findMany).mockResolvedValue(
      mockApps as (App & {
        requirements: Requirement[];
        monetizationModels: MonetizationModel[];
      })[],
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(prisma.app.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: {
          not: "DELETED",
        },
      },
      include: {
        requirements: {
          orderBy: {
            createdAt: "asc",
          },
        },
        monetizationModels: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  it("should handle server errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findMany).mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
