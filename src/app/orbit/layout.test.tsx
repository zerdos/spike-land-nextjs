import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrbitLayout from "./layout";

// Mock modules
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock child component
const MockChildren = () => <div data-testid="child-content">Child Content</div>;

describe("OrbitLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to signin if user is not authenticated", async () => {
    // Import auth mock to set implementation
    const { auth } = await import("@/auth");
    (auth as any).mockResolvedValue(null);

    await OrbitLayout({ children: <MockChildren /> });

    expect(redirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("renders children if user is authenticated", async () => {
    // Import auth mock to set implementation
    const { auth } = await import("@/auth");
    (auth as any).mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
      },
    });

    const result = await OrbitLayout({ children: <MockChildren /> });
    render(result);

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
});
