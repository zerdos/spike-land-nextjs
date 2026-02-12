import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => {
  const mock = {
    workspace: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // $transaction executes the callback with the mock itself as the tx client
  mock.$transaction.mockImplementation((cb: (tx: typeof mock) => Promise<unknown>) => cb(mock));
  return mock;
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { ensurePersonalWorkspace } from "./ensure-personal-workspace";

describe("ensurePersonalWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing workspace ID if personal workspace already exists", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue({ id: "ws_existing" });

    const result = await ensurePersonalWorkspace("user_123", "Test User");

    expect(result).toBe("ws_existing");
    expect(mockPrisma.workspace.findFirst).toHaveBeenCalledWith({
      where: {
        isPersonal: true,
        members: {
          some: { userId: "user_123" },
        },
        deletedAt: null,
      },
      select: { id: true },
    });
    expect(mockPrisma.workspace.create).not.toHaveBeenCalled();
  });

  it("creates a new personal workspace when none exists", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);
    mockPrisma.workspace.create.mockResolvedValue({ id: "ws_new" });

    const result = await ensurePersonalWorkspace("user_123", "Test User");

    expect(result).toBe("ws_new");
    expect(mockPrisma.workspace.create).toHaveBeenCalledWith({
      data: {
        name: "Test User's Workspace",
        slug: expect.stringMatching(/^user-user_123-[a-z0-9]+$/),
        isPersonal: true,
        members: {
          create: {
            userId: "user_123",
            role: "OWNER",
            joinedAt: expect.any(Date),
          },
        },
      },
      select: { id: true },
    });
  });

  it("uses 'User' as default name when userName is null", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);
    mockPrisma.workspace.create.mockResolvedValue({ id: "ws_new" });

    await ensurePersonalWorkspace("user_123", null);

    expect(mockPrisma.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "User's Workspace",
        }),
      }),
    );
  });

  it("uses 'User' as default name when userName is undefined", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);
    mockPrisma.workspace.create.mockResolvedValue({ id: "ws_new" });

    await ensurePersonalWorkspace("user_123");

    expect(mockPrisma.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "User's Workspace",
        }),
      }),
    );
  });

  it("propagates errors from prisma.workspace.findFirst", async () => {
    mockPrisma.workspace.findFirst.mockRejectedValue(
      new Error("Database error"),
    );

    await expect(
      ensurePersonalWorkspace("user_123", "Test"),
    ).rejects.toThrow("Database error");
  });

  it("propagates errors from prisma.workspace.create", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);
    mockPrisma.workspace.create.mockRejectedValue(
      new Error("Create failed"),
    );

    await expect(
      ensurePersonalWorkspace("user_123", "Test"),
    ).rejects.toThrow("Create failed");
  });
});
