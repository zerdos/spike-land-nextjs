/**
 * Tests for Admin Dashboard Home Page
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "./page";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      count: vi.fn(),
    },
    imageEnhancementJob: {
      count: vi.fn(),
    },
    tokenTransaction: {
      aggregate: vi.fn(),
    },
    voucher: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/components/admin/AdminDashboardClient", () => ({
  AdminDashboardClient: ({ initialMetrics }: { initialMetrics: unknown; }) => (
    <div data-testid="admin-dashboard-client">
      <span data-testid="metrics">{JSON.stringify(initialMetrics)}</span>
    </div>
  ),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => null),
    })
  ),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: {
        id: "test-user-id",
        role: "ADMIN",
      },
    })
  ),
}));

const { default: prisma } = await import("@/lib/prisma");

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render AdminDashboardClient with metrics", async () => {
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(5);

    vi.mocked(prisma.imageEnhancementJob.count)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(480)
      .mockResolvedValueOnce(5);

    vi.mocked(prisma.tokenTransaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 10000 } } as never)
      .mockResolvedValueOnce({ _sum: { amount: -8000 } } as never);

    vi.mocked(prisma.voucher.count).mockResolvedValueOnce(3);

    const result = await AdminDashboard();
    render(result);

    expect(screen.getByTestId("admin-dashboard-client")).toBeInTheDocument();
    const metricsElement = screen.getByTestId("metrics");
    const metrics = JSON.parse(metricsElement.textContent || "{}");

    expect(metrics.totalUsers).toBe(100);
    expect(metrics.adminCount).toBe(5);
    expect(metrics.totalEnhancements).toBe(500);
    expect(metrics.jobStatus.pending).toBe(10);
    expect(metrics.jobStatus.processing).toBe(5);
    expect(metrics.jobStatus.completed).toBe(480);
    expect(metrics.jobStatus.failed).toBe(5);
    expect(metrics.jobStatus.active).toBe(15);
    expect(metrics.totalTokensPurchased).toBe(10000);
    expect(metrics.totalTokensSpent).toBe(8000);
    expect(metrics.activeVouchers).toBe(3);
    expect(metrics.timestamp).toBeDefined();
  });

  it("should handle null token amounts", async () => {
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(1);

    vi.mocked(prisma.imageEnhancementJob.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    vi.mocked(prisma.tokenTransaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: null } } as never)
      .mockResolvedValueOnce({ _sum: { amount: null } } as never);

    vi.mocked(prisma.voucher.count).mockResolvedValueOnce(0);

    const result = await AdminDashboard();
    render(result);

    const metricsElement = screen.getByTestId("metrics");
    const metrics = JSON.parse(metricsElement.textContent || "{}");

    expect(metrics.totalTokensPurchased).toBe(0);
    expect(metrics.totalTokensSpent).toBe(0);
  });
});
