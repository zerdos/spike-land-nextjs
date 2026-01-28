import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrbitSidebar } from "./OrbitSidebar";

// Mock usePathname
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ workspaceSlug: "test-workspace" }),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null })),
  SessionProvider: ({ children }: { children: React.ReactNode; }) => <>{children}</>,
}));

// Mock WorkspaceSwitcher
vi.mock("@/components/orbit/WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: () => <div data-testid="workspace-switcher">Workspace Switcher</div>,
}));

// Mock NotificationBell
vi.mock("@/components/orbit/notifications/notification-bell", () => ({
  NotificationBell: ({ workspaceSlug }: { workspaceSlug: string; }) => (
    <button
      data-testid="notification-bell"
      data-workspace={workspaceSlug}
      aria-label="Notifications"
    >
      Notifications
    </button>
  ),
}));

describe("OrbitSidebar", () => {
  it("renders workspace switcher", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(
      "/orbit/test-workspace/dashboard",
    );

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
        workspaceSlug="test-workspace"
      />,
    );

    expect(screen.getByTestId("workspace-switcher")).toBeInTheDocument();
  });

  it("renders notification bell with workspace slug", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(
      "/orbit/test-workspace/dashboard",
    );

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
        workspaceSlug="test-workspace"
      />,
    );

    const notificationBell = screen.getByTestId("notification-bell");
    expect(notificationBell).toBeInTheDocument();
    expect(notificationBell).toHaveAttribute("data-workspace", "test-workspace");
  });

  it("renders navigation items with workspace slug", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(
      "/orbit/my-workspace/dashboard",
    );

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
        workspaceSlug="my-workspace"
      />,
    );

    const links = [
      "Dashboard",
      "Streams",
      "Inbox",
      "Connections",
      "Reminders",
      "Calendar",
      "Content Library",
      "Brand Brain",
      "AI Agents",
      "Settings",
    ];

    links.forEach((link) => {
      expect(screen.getByText(link)).toBeInTheDocument();
    });

    // Check that links include workspace slug
    const dashboardLink = screen.getByRole("link", { name: /Dashboard/i });
    expect(dashboardLink).toHaveAttribute(
      "href",
      "/orbit/my-workspace/dashboard",
    );
  });

  it("highlights active link", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(
      "/orbit/test-workspace/dashboard",
    );

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
        workspaceSlug="test-workspace"
      />,
    );

    const activeLink = screen.getByRole("link", { name: /Dashboard/i });
    expect(activeLink).toHaveClass("bg-primary");
  });

  it("does not highlight inactive links", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(
      "/orbit/test-workspace/dashboard",
    );

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
        workspaceSlug="test-workspace"
      />,
    );

    const inactiveLink = screen.getByRole("link", { name: /Settings/i });
    expect(inactiveLink).not.toHaveClass("bg-primary");
    expect(inactiveLink).toHaveClass("text-muted-foreground");
  });

  it("renders user information", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(
      "/orbit/test-workspace/dashboard",
    );

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
        workspaceSlug="test-workspace"
      />,
    );

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("renders back to app link", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(
      "/orbit/test-workspace/dashboard",
    );

    render(
      <OrbitSidebar
        userEmail="test@example.com"
        userName="Test User"
        workspaceSlug="test-workspace"
      />,
    );

    const backLink = screen.getByRole("link", { name: "Back to App" });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("renders with different workspace slugs", async () => {
    const { usePathname } = await import("next/navigation");
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(
      "/orbit/another-workspace/streams",
    );

    render(
      <OrbitSidebar
        userEmail="user@example.com"
        userName="Another User"
        workspaceSlug="another-workspace"
      />,
    );

    const streamsLink = screen.getByRole("link", { name: /Streams/i });
    expect(streamsLink).toHaveAttribute(
      "href",
      "/orbit/another-workspace/streams",
    );
    expect(streamsLink).toHaveClass("bg-primary");
  });
});
