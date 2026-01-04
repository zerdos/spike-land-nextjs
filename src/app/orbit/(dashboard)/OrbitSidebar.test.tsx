import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrbitSidebar } from "./OrbitSidebar";

// Mock usePathname
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("OrbitSidebar", () => {
  it("renders navigation items", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as any).mockReturnValue("/orbit/dashboard");

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
      />
    );

    const links = [
      "Dashboard",
      "Streams",
      "Inbox",
      "Calendar",
      "Content Library",
      "AI Agents",
      "Settings",
    ];

    links.forEach((link) => {
      expect(screen.getByText(link)).toBeInTheDocument();
    });
  });

  it("highlights active link", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as any).mockReturnValue("/orbit/dashboard");

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
      />
    );

    const activeLink = screen.getByRole("link", { name: /Dashboard/i });
    expect(activeLink).toHaveClass("bg-primary");
  });

  it("renders user information", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as any).mockReturnValue("/orbit/dashboard");

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
      />
    );

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("renders back to app link", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as any).mockReturnValue("/orbit/dashboard");

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
      />
    );

    const backLink = screen.getByRole("link", { name: "Back to App" });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });
});
