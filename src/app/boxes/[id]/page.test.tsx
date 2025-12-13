import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BoxDetailPage from "./page";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { BoxStatus, BoxMessageRole } from "@prisma/client";

vi.mock("@/auth");
vi.mock("@/lib/prisma", () => ({
  default: {
    box: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

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
    vi.mocked(auth).mockResolvedValue(null);

    const params = Promise.resolve({ id: "box-123" });
    await BoxDetailPage({ params });

    expect(redirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("renders the page with box details", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.box.findUnique).mockResolvedValue(mockBox as any);

    const params = Promise.resolve({ id: "box-123" });
    render(await BoxDetailPage({ params }));

    expect(screen.getByText("Test Box")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("renders the AgentControlPanel component", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.box.findUnique).mockResolvedValue(mockBox as any);

    const params = Promise.resolve({ id: "box-123" });
    render(await BoxDetailPage({ params }));

    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Live Session")).toBeInTheDocument();
  });

  it("returns notFound if box does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.box.findUnique).mockResolvedValue(null);

    const params = Promise.resolve({ id: "nonexistent" });
    await BoxDetailPage({ params });

    expect(notFound).toHaveBeenCalled();
  });

  it("returns notFound if user does not own the box", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      ...mockBox,
      userId: "different-user",
    } as any);

    const params = Promise.resolve({ id: "box-123" });
    await BoxDetailPage({ params });

    expect(notFound).toHaveBeenCalled();
  });

  it("displays box description only if provided", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      ...mockBox,
      description: null,
    } as any);

    const params = Promise.resolve({ id: "box-123" });
    render(await BoxDetailPage({ params }));

    expect(screen.queryByText("Test Description")).not.toBeInTheDocument();
  });
});
