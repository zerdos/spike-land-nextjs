import type { AppBuildStatus } from "@prisma/client";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BinAppCard } from "./BinAppCard";

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("BinAppCard", () => {
  const mockApp = {
    id: "app-1",
    name: "Test App",
    slug: "test-app",
    description: "A test application",
    status: "LIVE" as AppBuildStatus,
    codespaceId: "test-app",
    codespaceUrl: "https://testing.spike.land/live/test-app/",
    deletedAt: new Date().toISOString(),
    daysRemaining: 15,
    _count: {
      messages: 5,
      images: 2,
    },
  };

  const mockOnRestore = vi.fn();
  const mockOnPermanentDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders app information correctly", () => {
    render(
      <BinAppCard
        app={mockApp}
        onRestore={mockOnRestore}
        onPermanentDelete={mockOnPermanentDelete}
      />,
    );

    expect(screen.getByText("Test App")).toBeDefined();
    expect(screen.getByText("A test application")).toBeDefined();
    expect(screen.getByText("15 days left")).toBeDefined();
  });

  it("calls onRestore when restore button is clicked", async () => {
    render(
      <BinAppCard
        app={mockApp}
        onRestore={mockOnRestore}
        onPermanentDelete={mockOnPermanentDelete}
      />,
    );

    const restoreButton = screen.getByRole("button", { name: /restore/i });
    fireEvent.click(restoreButton);

    expect(mockOnRestore).toHaveBeenCalledWith("app-1");
  });

  it("shows confirmation dialog for permanent delete", async () => {
    render(
      <BinAppCard
        app={mockApp}
        onRestore={mockOnRestore}
        onPermanentDelete={mockOnPermanentDelete}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete forever/i });
    fireEvent.click(deleteButton);

    // Should see confirmation dialog
    expect(screen.getByText(/permanently delete “Test App”?/i)).toBeDefined();

    const confirmButton = screen.getByRole("button", { name: /^delete forever$/i });
    fireEvent.click(confirmButton);

    expect(mockOnPermanentDelete).toHaveBeenCalledWith("app-1");
  });

  it("shows urgent styling when days remaining is low", () => {
    const urgentApp = { ...mockApp, daysRemaining: 5 };
    render(
      <BinAppCard
        app={urgentApp}
        onRestore={mockOnRestore}
        onPermanentDelete={mockOnPermanentDelete}
      />,
    );

    const badge = screen.getByText("5 days left");
    expect(badge.className).toContain("bg-yellow-500");
  });

  it("shows critical styling when days remaining is very low", () => {
    const criticalApp = { ...mockApp, daysRemaining: 2 };
    render(
      <BinAppCard
        app={criticalApp}
        onRestore={mockOnRestore}
        onPermanentDelete={mockOnPermanentDelete}
      />,
    );

    const badge = screen.getByText("2 days left");
    expect(badge.className).toContain("bg-red-500");
  });
});
