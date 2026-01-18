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
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    app: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/upstash", () => ({
  enqueueMessage: vi.fn().mockResolvedValue(undefined),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("POST /api/apps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user exists in database
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
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

  it("should create an app successfully (legacy flow)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockApp = {
      id: "app-1",
      name: "Test App",
      description: "Test Description for the app",
      userId: "user-1",
      status: "PROMPTING",
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
      mockApp as unknown as App & {
        requirements: Requirement[];
        monetizationModels: MonetizationModel[];
      },
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
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true },
    });
    expect(prisma.app.create).toHaveBeenCalledWith({
      data: {
        name: "Test App",
        description: "Test Description for the app",
        userId: "user-1",
        status: "PROMPTING",
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
        messages: true,
        statusHistory: true,
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

  describe("ensureUserExists behavior", () => {
    it("should create user when user does not exist in database", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-new",
          email: "new@example.com",
          name: "New User",
          image: "https://example.com/avatar.jpg",
        },
        expires: "2025-12-31",
      } as Session);

      // User doesn't exist initially
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      // User creation succeeds
      vi.mocked(prisma.user.create).mockResolvedValue({ id: "user-new" } as never);

      const mockApp = {
        id: "app-1",
        name: "Test App",
        description: "Test Description for the app",
        userId: "user-new",
        status: "PROMPTING",
        requirements: [],
        monetizationModels: [],
      };

      vi.mocked(prisma.app.create).mockResolvedValue(mockApp as never);

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

      expect(response.status).toBe(201);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: "user-new",
          email: "new@example.com",
          name: "New User",
          image: "https://example.com/avatar.jpg",
        },
        select: { id: true },
      });
    });

    it("should return 500 when user creation fails completely", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-new", email: "new@example.com" },
        expires: "2025-12-31",
      } as Session);

      // User doesn't exist
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      // User creation fails
      vi.mocked(prisma.user.create).mockRejectedValue(new Error("Database error"));

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

      expect(response.status).toBe(500);
      expect(data.error).toBe(
        "User account not properly initialized. Please sign out and sign in again.",
      );
    });

    it("should handle unique constraint violation by finding user by email", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-new-id", email: "existing@example.com", name: "Existing User" },
        expires: "2025-12-31",
      } as Session);

      // User doesn't exist by ID
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null as never) // First call: check by ID
        .mockResolvedValueOnce({ id: "user-existing-id" } as never); // Second call: check by email

      // User creation fails with unique constraint
      const uniqueError = new Error("Unique constraint");
      vi.mocked(prisma.user.create).mockRejectedValue(uniqueError);

      const mockApp = {
        id: "app-1",
        name: "Test App",
        description: "Test Description for the app",
        userId: "user-existing-id",
        status: "PROMPTING",
        requirements: [],
        monetizationModels: [],
      };

      vi.mocked(prisma.app.create).mockResolvedValue(mockApp as never);

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

      expect(response.status).toBe(201);
      // The app should be created with the existing user's ID
      expect(prisma.app.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-existing-id",
          }),
        }),
      );
    });

    it("should skip user creation if user already exists", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: "2025-12-31",
      } as Session);

      // User exists
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);

      const mockApp = {
        id: "app-1",
        name: "Test App",
        description: "Test Description for the app",
        userId: "user-1",
        status: "PROMPTING",
        requirements: [],
        monetizationModels: [],
      };

      vi.mocked(prisma.app.create).mockResolvedValue(mockApp as never);

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

      expect(response.status).toBe(201);
      // User.create should NOT have been called
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe("prompt-based creation flow", () => {
    it("should create an app from prompt successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: "2025-12-31",
      } as Session);

      const mockTransactionResult = {
        app: {
          id: "app-prompt-1",
          name: "Swift Forge Launch 1a2b",
          slug: "swift-forge-launch-1a2b",
          status: "WAITING",
          codespaceId: "swift-forge-launch-1a2b",
          codespaceUrl: "https://testing.spike.land/live/swift-forge-launch-1a2b/",
          createdAt: new Date(),
        },
        messageId: "msg-1",
      };

      vi.mocked(prisma.$transaction).mockImplementation(
        async (fn: any) => {
          // Mock transaction client
          const txMock = {
            app: {
              create: vi.fn().mockResolvedValue(mockTransactionResult.app),
            },
            appStatusHistory: {
              create: vi.fn().mockResolvedValue({}),
            },
            appMessage: {
              create: vi.fn().mockResolvedValue({ id: "msg-1" }),
            },
            appImage: {
              updateMany: vi.fn().mockResolvedValue({}),
              findMany: vi.fn().mockResolvedValue([]),
            },
            appAttachment: {
              createMany: vi.fn().mockResolvedValue({}),
            },
          };
          return fn(txMock);
        },
      );

      const request = new NextRequest("http://localhost/api/apps", {
        method: "POST",
        body: JSON.stringify({
          prompt: "Build me a todo app with React",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.status).toBe("WAITING");
      expect(data.codespaceUrl).toContain("testing.spike.land/live/");
    });

    it("should create app with provided codespaceId", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: "2025-12-31",
      } as Session);

      const mockTransactionResult = {
        app: {
          id: "app-prompt-2",
          name: "Custom App",
          slug: "custom-codespace-id",
          status: "WAITING",
          codespaceId: "custom-codespace-id",
          codespaceUrl: "https://testing.spike.land/live/custom-codespace-id/",
          createdAt: new Date(),
        },
        messageId: "msg-2",
      };

      vi.mocked(prisma.$transaction).mockImplementation(
        async (fn: any) => {
          const txMock = {
            app: {
              create: vi.fn().mockResolvedValue(mockTransactionResult.app),
            },
            appStatusHistory: {
              create: vi.fn().mockResolvedValue({}),
            },
            appMessage: {
              create: vi.fn().mockResolvedValue({ id: "msg-2" }),
            },
            appImage: {
              updateMany: vi.fn().mockResolvedValue({}),
              findMany: vi.fn().mockResolvedValue([]),
            },
            appAttachment: {
              createMany: vi.fn().mockResolvedValue({}),
            },
          };
          return fn(txMock);
        },
      );

      const request = new NextRequest("http://localhost/api/apps", {
        method: "POST",
        body: JSON.stringify({
          prompt: "Build me a todo app",
          codespaceId: "custom-codespace-id",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.codespaceId).toBe("custom-codespace-id");
    });

    it("should handle prompt-based creation failure", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: "2025-12-31",
      } as Session);

      vi.mocked(prisma.$transaction).mockRejectedValue(new Error("Transaction failed"));

      const request = new NextRequest("http://localhost/api/apps", {
        method: "POST",
        body: JSON.stringify({
          prompt: "Build me a todo app",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should create app with ensureUserExists for prompt flow when user missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-new", email: "new@example.com", name: "New User" },
        expires: "2025-12-31",
      } as Session);

      // User doesn't exist initially
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      // User creation succeeds
      vi.mocked(prisma.user.create).mockResolvedValue({ id: "user-new" } as never);

      const mockTransactionResult = {
        app: {
          id: "app-prompt-3",
          name: "New App",
          slug: "new-app-slug",
          status: "WAITING",
          codespaceId: "new-app-slug",
          codespaceUrl: "https://testing.spike.land/live/new-app-slug/",
          createdAt: new Date(),
        },
        messageId: "msg-3",
      };

      vi.mocked(prisma.$transaction).mockImplementation(
        async (fn: any) => {
          const txMock = {
            app: {
              create: vi.fn().mockResolvedValue(mockTransactionResult.app),
            },
            appStatusHistory: {
              create: vi.fn().mockResolvedValue({}),
            },
            appMessage: {
              create: vi.fn().mockResolvedValue({ id: "msg-3" }),
            },
            appImage: {
              updateMany: vi.fn().mockResolvedValue({}),
              findMany: vi.fn().mockResolvedValue([]),
            },
            appAttachment: {
              createMany: vi.fn().mockResolvedValue({}),
            },
          };
          return fn(txMock);
        },
      );

      const request = new NextRequest("http://localhost/api/apps", {
        method: "POST",
        body: JSON.stringify({
          prompt: "Build me a new app",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      // Verify user was created
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: "user-new",
          email: "new@example.com",
          name: "New User",
          image: undefined,
        },
        select: { id: true },
      });
    });
  });
});

describe("GET /api/apps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/apps");
    const response = await GET(request);
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
        slug: "test-app-1",
        description: "Description 1",
        userId: "user-1",
        status: "PROMPTING",
        codespaceId: null,
        codespaceUrl: null,
        isCurated: false,
        isPublic: false,
        lastAgentActivity: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { messages: 0, images: 0 },
        messages: [],
      },
      {
        id: "app-2",
        name: "Test App 2",
        slug: "test-app-2",
        description: "Description 2",
        userId: "user-1",
        status: "LIVE",
        codespaceId: "test-app-2",
        codespaceUrl: "https://testing.spike.land/live/test-app-2/",
        isCurated: false,
        isPublic: false,
        lastAgentActivity: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { messages: 5, images: 2 },
        messages: [],
      },
    ];

    vi.mocked(prisma.app.findMany).mockResolvedValue(
      mockApps as unknown as App[],
    );

    const request = new NextRequest("http://localhost/api/apps");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(prisma.app.findMany).toHaveBeenCalled();
  });

  it("should handle server errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest("http://localhost/api/apps");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should return curated apps when curated=true", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockCuratedApps = [
      {
        id: "app-curated-1",
        name: "Curated App",
        slug: "curated-app",
        description: "A curated app",
        codespaceUrl: "https://testing.spike.land/live/curated-app/",
        status: "LIVE",
        createdAt: new Date(),
        _count: { messages: 10 },
      },
    ];

    vi.mocked(prisma.app.findMany).mockResolvedValue(mockCuratedApps as unknown as App[]);

    const request = new NextRequest("http://localhost/api/apps?curated=true");
    const response = await GET(request);
    await response.json();

    expect(response.status).toBe(200);
    expect(prisma.app.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isCurated: true,
          isPublic: true,
          status: "LIVE",
        },
      }),
    );
  });
});
