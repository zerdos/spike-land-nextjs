import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ApprovalSettingsPage from "./page";

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
}));

// Mock the form component
vi.mock("@/components/orbit/settings/approval-settings-form", () => ({
  ApprovalSettingsForm: ({ workspaceSlug }: { workspaceSlug: string; }) => (
    <div data-testid="approval-settings-form">Settings for {workspaceSlug}</div>
  ),
}));

describe("ApprovalSettingsPage", () => {
  it("renders the page with header", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await ApprovalSettingsPage({ params });
    render(Component);

    expect(screen.getByText("Approval Settings")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Configure how drafts are reviewed and approved before publishing",
      ),
    ).toBeInTheDocument();
  });

  it("renders the back link", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await ApprovalSettingsPage({ params });
    render(Component);

    const backLink = screen.getByTestId("back-link");
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute(
      "href",
      "/orbit/test-workspace/settings",
    );
  });

  it("renders the approval settings form", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await ApprovalSettingsPage({ params });
    render(Component);

    expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    expect(screen.getByText("Settings for test-workspace")).toBeInTheDocument();
  });

  it("renders card with correct title and description", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await ApprovalSettingsPage({ params });
    render(Component);

    expect(
      screen.getByText("Relay Approval Configuration"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Customize the approval workflow for AI-generated response drafts",
      ),
    ).toBeInTheDocument();
  });
});
