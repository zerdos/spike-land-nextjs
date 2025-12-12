/**
 * Tests for Admin Layout
 */

import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "./layout";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  isAdminByUserId: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const { auth } = await import("@/auth");
const { isAdminByUserId } = await import("@/lib/auth/admin-middleware");

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to home if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    try {
      await AdminLayout({ children: <div>Test Content</div> });
    } catch {
      // redirect throws, which is expected
    }

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("should redirect to home if user is not admin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user123", name: "Test User", email: "test@example.com" },
    } as any);
    vi.mocked(isAdminByUserId).mockResolvedValue(false);

    try {
      await AdminLayout({ children: <div>Test Content</div> });
    } catch {
      // redirect throws, which is expected
    }

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("should render layout for admin user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", name: "Admin User", email: "admin@example.com" },
    } as any);
    vi.mocked(isAdminByUserId).mockResolvedValue(true);

    const result = await AdminLayout({ children: <div>Test Content</div> });

    render(result);

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should render all navigation items", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", name: "Admin User", email: "admin@example.com" },
    } as any);
    vi.mocked(isAdminByUserId).mockResolvedValue(true);

    const result = await AdminLayout({ children: <div>Test Content</div> });

    render(result);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("User Analytics")).toBeInTheDocument();
    expect(screen.getByText("Token Economics")).toBeInTheDocument();
    expect(screen.getByText("System Health")).toBeInTheDocument();
    expect(screen.getByText("Vouchers")).toBeInTheDocument();
    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Photos")).toBeInTheDocument();
    expect(screen.getByText("Email Logs")).toBeInTheDocument();
    expect(screen.getByText("Sitemap Preview")).toBeInTheDocument();
  });

  it("should render back to app link", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", name: "Admin User", email: "admin@example.com" },
    } as any);
    vi.mocked(isAdminByUserId).mockResolvedValue(true);

    const result = await AdminLayout({ children: <div>Test Content</div> });

    render(result);

    expect(screen.getByText("Back to App")).toBeInTheDocument();
  });

  it("should display user email if name is not available", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", email: "admin@example.com" },
    } as any);
    vi.mocked(isAdminByUserId).mockResolvedValue(true);

    const result = await AdminLayout({ children: <div>Test Content</div> });

    render(result);

    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });
});
