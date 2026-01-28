import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RelayPage from "./page";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "test@example.com" },
  }),
}));

// Mock navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock the client component
vi.mock("./relay-page-client", () => ({
  RelayPageClient: ({ workspaceSlug }: { workspaceSlug: string; }) => (
    <div data-testid="relay-page-client">Relay for {workspaceSlug}</div>
  ),
}));

describe("RelayPage", () => {
  it("renders the relay page client", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await RelayPage({ params });
    render(Component);

    expect(screen.getByTestId("relay-page-client")).toBeInTheDocument();
    expect(screen.getByText("Relay for test-workspace")).toBeInTheDocument();
  });
});
