import { BoxMessageRole, BoxStatus } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks before they are hoisted
const { mockAuth, mockPrisma, mockRedirect, mockNotFound } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    box: {
      findUnique: vi.fn(),
    },
  },
  // These functions throw to stop execution like the real Next.js functions
  mockRedirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  mockNotFound: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));
vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  notFound: mockNotFound,
}));

// Import after mocks are set up
import BoxDetailPage from "./page";

describe("BoxDetailPage", () => {
  const mockSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    },
  };

  const mockBox = {
    id: "box-123",
    name: "Test Box",
    description: "Test Description",
    userId: "user-123",
    tierId: null,
    status: BoxStatus.RUNNING,
    connectionUrl: "https://example.com/vnc",
    storageVolumeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    messages: [
      {
        id: "msg-1",
        boxId: "box-123",
        role: BoxMessageRole.SYSTEM,
        content: "System initialized",
        createdAt: new Date(),
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to signin if user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const params = Promise.resolve({ id: "box-123" });
    await expect(BoxDetailPage({ params })).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("renders the page with box details", async () => {
    mockAuth.mockResolvedValue(mockSession as any);
    mockPrisma.box.findUnique.mockResolvedValue(mockBox as any);

    const params = Promise.resolve({ id: "box-123" });
    render(await BoxDetailPage({ params }));

    expect(screen.getByText("Test Box")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("renders the AgentControlPanel component", async () => {
    mockAuth.mockResolvedValue(mockSession as any);
    mockPrisma.box.findUnique.mockResolvedValue(mockBox as any);

    const params = Promise.resolve({ id: "box-123" });
    render(await BoxDetailPage({ params }));

    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Live Session")).toBeInTheDocument();
  });

  it("returns notFound if box does not exist", async () => {
    mockAuth.mockResolvedValue(mockSession as any);
    mockPrisma.box.findUnique.mockResolvedValue(null);

    const params = Promise.resolve({ id: "nonexistent" });
    await expect(BoxDetailPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("returns notFound if user does not own the box", async () => {
    mockAuth.mockResolvedValue(mockSession as any);
    mockPrisma.box.findUnique.mockResolvedValue({
      ...mockBox,
      userId: "different-user",
    } as any);

    const params = Promise.resolve({ id: "box-123" });
    await expect(BoxDetailPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("displays box description only if provided", async () => {
    mockAuth.mockResolvedValue(mockSession as any);
    mockPrisma.box.findUnique.mockResolvedValue({
      ...mockBox,
      description: null,
    } as any);

    const params = Promise.resolve({ id: "box-123" });
    render(await BoxDetailPage({ params }));

    expect(screen.queryByText("Test Description")).not.toBeInTheDocument();
  });
});
