import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";

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
        description: "A test workspace",
      }),
    },
  },
}));

// Mock navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock the form component
vi.mock("@/components/orbit/settings/general-settings-form", () => ({
  GeneralSettingsForm: ({ initialName }: { initialName: string; }) => (
    <div data-testid="general-settings-form">Form for {initialName}</div>
  ),
}));

describe("SettingsPage", () => {
  it("renders page with general settings form", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await SettingsPage({ params });
    render(Component);

    expect(screen.getByRole("heading", { name: "Settings" }))
      .toBeInTheDocument();
    expect(screen.getByTestId("general-settings-form")).toBeInTheDocument();
    expect(screen.getByText("Inbox Smart Routing")).toBeInTheDocument();
  });
});
