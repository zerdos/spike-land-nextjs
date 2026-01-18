import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccountsPage from "./page";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "test@example.com" },
  }),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findFirst: vi.fn().mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
      }),
    },
  },
}));

// Mock navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// Mock the client component
vi.mock("./SocialAccountsClient", () => ({
  SocialAccountsClient: ({ workspaceSlug }: { workspaceSlug: string; }) => (
    <div data-testid="social-accounts-client">
      Client for {workspaceSlug}
    </div>
  ),
}));

describe("AccountsPage", () => {
  it("renders page with social accounts client", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await AccountsPage({ params });
    render(Component);

    expect(
      screen.getByRole("heading", { name: "Social Accounts" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("social-accounts-client")).toBeInTheDocument();
  });
});
