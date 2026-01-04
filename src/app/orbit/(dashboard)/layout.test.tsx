import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OrbitDashboardLayout from "./layout";

// Mock modules
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock OrbitSidebar
vi.mock("./OrbitSidebar", () => ({
  OrbitSidebar: ({ userEmail, userName }: { userEmail: string; userName: string }) => (
    <div data-testid="orbit-sidebar">
      Sidebar: {userName} ({userEmail})
    </div>
  ),
}));

// Mock child component
const MockChildren = () => <div data-testid="child-content">Child Content</div>;

describe("OrbitDashboardLayout", () => {
  it("renders sidebar and children", async () => {
    // Import auth mock to set implementation
    const { auth } = await import("@/auth");
    (auth as any).mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
      },
    });

    const result = await OrbitDashboardLayout({ children: <MockChildren /> });
    render(result);

    expect(screen.getByTestId("orbit-sidebar")).toBeInTheDocument();
    expect(screen.getByText("Sidebar: Test User (user@example.com)")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });
});
