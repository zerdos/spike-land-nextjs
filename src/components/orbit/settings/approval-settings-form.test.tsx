import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalSettingsForm } from "./approval-settings-form";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockSettings = {
  requireApproval: true,
  approverRoles: ["OWNER", "ADMIN"],
  autoApproveHighConfidence: false,
  autoApproveThreshold: 0.95,
  notifyApprovers: true,
  escalationTimeoutHours: 24,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode; }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("ApprovalSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ settings: mockSettings }),
    });
  });

  it("renders loading state initially", () => {
    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId("approval-settings-loading")).toBeInTheDocument();
  });

  it("renders settings after loading", async () => {
    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    expect(screen.getByText("Approval Requirement")).toBeInTheDocument();
    expect(screen.getByText("Approver Roles")).toBeInTheDocument();
    expect(screen.getByText("Auto-Approval")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Access denied" }),
    });

    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });

  it("shows correct initial state for require approval switch", async () => {
    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    const switchElement = screen.getByTestId("require-approval-switch");
    expect(switchElement).toHaveAttribute("data-state", "checked");
  });

  it("shows correct initial state for approver roles", async () => {
    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    // OWNER and ADMIN should be checked
    expect(screen.getByTestId("approver-role-owner")).toHaveAttribute(
      "data-state",
      "checked",
    );
    expect(screen.getByTestId("approver-role-admin")).toHaveAttribute(
      "data-state",
      "checked",
    );
    // MEMBER should not be checked
    expect(screen.getByTestId("approver-role-member")).toHaveAttribute(
      "data-state",
      "unchecked",
    );
  });

  it("enables save button when settings change", async () => {
    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    const saveButton = screen.getByTestId("save-approval-settings");
    expect(saveButton).toBeDisabled();

    // Toggle the require approval switch
    const switchElement = screen.getByTestId("require-approval-switch");
    fireEvent.click(switchElement);

    expect(saveButton).not.toBeDisabled();
  });

  it("saves settings when save button is clicked", async () => {
    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    // Toggle the require approval switch
    const switchElement = screen.getByTestId("require-approval-switch");
    fireEvent.click(switchElement);

    // Mock the PUT request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          settings: { ...mockSettings, requireApproval: false },
        }),
    });

    // Click save
    const saveButton = screen.getByTestId("save-approval-settings");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/orbit/test-workspace/relay/settings",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
  });

  it("shows success message after saving", async () => {
    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    // Toggle the require approval switch
    const switchElement = screen.getByTestId("require-approval-switch");
    fireEvent.click(switchElement);

    // Mock the PUT request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          settings: { ...mockSettings, requireApproval: false },
        }),
    });

    // Click save
    const saveButton = screen.getByTestId("save-approval-settings");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId("save-success-message")).toBeInTheDocument();
    });
  });

  it("shows error message when save fails", async () => {
    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    // Toggle the require approval switch
    const switchElement = screen.getByTestId("require-approval-switch");
    fireEvent.click(switchElement);

    // Mock the PUT request failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Permission denied" }),
    });

    // Click save
    const saveButton = screen.getByTestId("save-approval-settings");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId("save-error-message")).toBeInTheDocument();
    });

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });

  it("updates escalation timeout input", async () => {
    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    const input = screen.getByTestId("escalation-timeout-input");
    fireEvent.change(input, { target: { value: "48" } });

    expect(input).toHaveValue(48);
  });

  it("disables auto-approve settings when require approval is off", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          settings: { ...mockSettings, requireApproval: false },
        }),
    });

    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    const autoApproveSwitch = screen.getByTestId("auto-approve-switch");
    expect(autoApproveSwitch).toBeDisabled();
  });

  it("shows confidence threshold slider when auto-approve is enabled", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          settings: { ...mockSettings, autoApproveHighConfidence: true },
        }),
    });

    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    expect(screen.getByTestId("confidence-threshold-slider")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("shows warning when no approver roles are selected", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          settings: { ...mockSettings, approverRoles: [] },
        }),
    });

    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/No approver roles selected/),
    ).toBeInTheDocument();
  });

  it("toggles approver role checkboxes", async () => {
    render(<ApprovalSettingsForm workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-settings-form")).toBeInTheDocument();
    });

    const memberCheckbox = screen.getByTestId("approver-role-member");
    expect(memberCheckbox).toHaveAttribute("data-state", "unchecked");

    fireEvent.click(memberCheckbox);

    expect(memberCheckbox).toHaveAttribute("data-state", "checked");
  });
});
