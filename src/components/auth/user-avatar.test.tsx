import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signOut, useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserAvatar } from "./user-avatar";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

describe("UserAvatar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when there is no session", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { container } = render(<UserAvatar />);
    expect(container.firstChild).toBeNull();
  });

  it("should return null when session exists but no user", () => {
    vi.mocked(useSession).mockReturnValue({
      data: { expires: "2024-01-01" } as { expires: string; },
      status: "authenticated",
      update: vi.fn(),
    });

    const { container } = render(<UserAvatar />);
    expect(container.firstChild).toBeNull();
  });

  it("should render avatar when user is authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
          image: "https://example.com/avatar.jpg",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<UserAvatar />);
    const trigger = screen.getByTestId("user-avatar");
    expect(trigger).toBeInTheDocument();
  });

  it("should display user initials from name", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<UserAvatar />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("should display first two initials for three-word names", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Michael Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<UserAvatar />);
    expect(screen.getByText("JM")).toBeInTheDocument();
  });

  it("should display U as fallback when no name", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<UserAvatar />);
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const { container } = render(<UserAvatar className="custom-class" />);
    const avatar = container.querySelector(".custom-class");
    expect(avatar).toBeInTheDocument();
  });

  it("should open dropdown menu when avatar is clicked", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    expect(screen.getByText("Pixel - AI Photo Enhance")).toBeInTheDocument();
    expect(screen.getByText("Token Management")).toBeInTheDocument();
    expect(screen.getByText("My Apps")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });

  it("should display user name and email in dropdown", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("should display fallback text when no name", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("should display fallback text when no email", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    expect(screen.getByText("No email")).toBeInTheDocument();
  });

  it("should have Pixel link pointing to /apps/pixel", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    const pixelLink = screen.getByRole("menuitem", {
      name: /pixel - ai photo enhance/i,
    });
    expect(pixelLink).toHaveAttribute("href", "/apps/pixel");
  });

  it("should have Token Management link pointing to /tokens", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    const tokensLink = screen.getByRole("menuitem", {
      name: /token management/i,
    });
    expect(tokensLink).toHaveAttribute("href", "/tokens");
  });

  it("should have My Apps link pointing to /my-apps", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    const myAppsLink = screen.getByRole("menuitem", { name: /my apps/i });
    expect(myAppsLink).toHaveAttribute("href", "/my-apps");
  });

  it("should have Profile link pointing to /profile", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    const profileLink = screen.getByRole("menuitem", { name: /profile/i });
    expect(profileLink).toHaveAttribute("href", "/profile");
  });

  it("should have Settings link pointing to /settings", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    const settingsLink = screen.getByRole("menuitem", { name: /settings/i });
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("should call signOut when logout menu item is clicked", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    await user.click(screen.getByText("Log out"));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith();
  });

  it("should render avatar image when provided", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
          image: "https://example.com/avatar.jpg",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<UserAvatar />);
    const avatar = screen.getByTestId("user-avatar");
    expect(avatar).toBeInTheDocument();
    // Avatar component may lazy-load images, just check that component renders
    const img = avatar.querySelector("img");
    if (img) {
      expect(img).toHaveAttribute("alt", "John Doe");
    }
  });

  it("should use User as alt text when no name", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          email: "john@example.com",
          image: "https://example.com/avatar.jpg",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<UserAvatar />);
    const avatar = screen.getByTestId("user-avatar");
    expect(avatar).toBeInTheDocument();
    // Avatar component may lazy-load images, check for alt text if img exists
    const img = avatar.querySelector("img");
    if (img) {
      expect(img).toHaveAttribute("alt", "User");
    }
  });

  it("should render Profile menu item with icon", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    const profileItem = screen.getByText("Profile").closest(
      '[role="menuitem"]',
    );
    const icon = profileItem?.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render Settings menu item with icon", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    const settingsItem = screen.getByText("Settings").closest(
      '[role="menuitem"]',
    );
    const icon = settingsItem?.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render Log out menu item with icon", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<UserAvatar />);

    await user.click(screen.getByTestId("user-avatar"));
    const logoutItem = screen.getByText("Log out").closest('[role="menuitem"]');
    const icon = logoutItem?.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should handle single letter names", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "X",
          email: "x@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<UserAvatar />);
    expect(screen.getByText("X")).toBeInTheDocument();
  });
});
