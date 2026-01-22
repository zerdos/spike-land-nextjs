import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxActionButtons } from "./inbox-action-buttons";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useQueryClient
const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

// Mock InboxConfirmDialog to avoid testing implementation details of the dialog itself
// and just verify it is opening with correct props
vi.mock("./inbox-confirm-dialog", () => ({
  InboxConfirmDialog: ({
    isOpen,
    onConfirm,
    onCancel,
    title,
    confirmText,
    variant,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    confirmText: string;
    variant?: string;
  }) =>
    isOpen
      ? (
        <div data-testid="mock-dialog">
          <h1>{title}</h1>
          <span data-testid="confirm-text">{confirmText}</span>
          {variant && <span data-testid="variant">{variant}</span>}
          <button onClick={onConfirm}>Confirm</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      )
      : null,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("InboxActionButtons", () => {
  const defaultProps = {
    itemId: "test-item-123",
    workspaceSlug: "test-workspace",
    onActionComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders all action buttons", () => {
    render(<InboxActionButtons {...defaultProps} />);
    expect(screen.getByText("Mark Resolved")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByText("Ignore")).toBeInTheDocument();
  });

  it("opens resolve confirmation dialog when Resolve clicked", () => {
    render(<InboxActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText("Mark Resolved"));
    expect(screen.getByTestId("mock-dialog")).toBeInTheDocument();
    expect(screen.getByText("Mark as Resolved?")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-text")).toHaveTextContent(
      "Mark Resolved",
    );
  });

  it("opens archive confirmation dialog when Archive clicked", () => {
    render(<InboxActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText("Archive"));
    expect(screen.getByTestId("mock-dialog")).toBeInTheDocument();
    expect(screen.getByText("Archive Item?")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-text")).toHaveTextContent("Archive");
  });

  it("opens ignore confirmation dialog when Ignore clicked", () => {
    render(<InboxActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText("Ignore"));
    expect(screen.getByTestId("mock-dialog")).toBeInTheDocument();
    expect(screen.getByText("Ignore Item?")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-text")).toHaveTextContent("Ignore");
    expect(screen.getByTestId("variant")).toHaveTextContent("destructive");
  });

  it("calls PATCH API with ARCHIVED status when resolving", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "test-item-123", status: "ARCHIVED" }),
    });

    render(<InboxActionButtons {...defaultProps} />);

    // Click Resolve
    fireEvent.click(screen.getByText("Mark Resolved"));

    // Click Confirm in dialog
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/orbit/test-workspace/inbox/test-item-123",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "ARCHIVED" }),
        },
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Item resolved successfully",
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["inboxItems", "test-workspace"],
    });
    expect(defaultProps.onActionComplete).toHaveBeenCalled();
  });

  it("calls PATCH API with ARCHIVED status when archiving", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "test-item-123", status: "ARCHIVED" }),
    });

    render(<InboxActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByText("Archive"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/orbit/test-workspace/inbox/test-item-123",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "ARCHIVED" }),
        },
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Item archived successfully",
    );
  });

  it("calls PATCH API with IGNORED status when ignoring", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "test-item-123", status: "IGNORED" }),
    });

    render(<InboxActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByText("Ignore"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/orbit/test-workspace/inbox/test-item-123",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "IGNORED" }),
        },
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Item ignored successfully",
    );
  });

  it("shows error toast when API returns error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Permission denied" }),
    });

    render(<InboxActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByText("Mark Resolved"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Permission denied");
    });

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(defaultProps.onActionComplete).not.toHaveBeenCalled();
  });

  it("shows generic error toast when API returns non-JSON error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    render(<InboxActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByText("Mark Resolved"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to resolve item");
    });
  });

  it("shows error toast when network request fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<InboxActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByText("Archive"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network error");
    });
  });

  it("shows generic error toast when non-Error is thrown", async () => {
    mockFetch.mockRejectedValueOnce("Something went wrong");

    render(<InboxActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByText("Ignore"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to perform action");
    });
  });

  it("does not perform action if cancelled", async () => {
    render(<InboxActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByText("Mark Resolved"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByTestId("mock-dialog")).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("disables buttons while loading", async () => {
    // Never resolve the fetch to keep loading state
    mockFetch.mockImplementationOnce(
      () => new Promise(() => {}),
    );

    render(<InboxActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByText("Mark Resolved"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      const resolveButton = screen.getByRole("button", {
        name: /Mark Resolved/i,
      });
      const archiveButton = screen.getByRole("button", { name: /Archive/i });
      const ignoreButton = screen.getByRole("button", { name: /Ignore/i });

      expect(resolveButton).toBeDisabled();
      expect(archiveButton).toBeDisabled();
      expect(ignoreButton).toBeDisabled();
    });
  });

  it("works without onActionComplete callback", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "test-item-123", status: "ARCHIVED" }),
    });

    render(
      <InboxActionButtons
        itemId="test-item-123"
        workspaceSlug="test-workspace"
      />,
    );

    fireEvent.click(screen.getByText("Mark Resolved"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Item resolved successfully",
      );
    });
    // Should not throw even without onActionComplete
  });

  it("does not call API when actionType is null", async () => {
    render(<InboxActionButtons {...defaultProps} />);

    // Don't click any button, just verify no API call
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty dialog content for default case", () => {
    render(<InboxActionButtons {...defaultProps} />);

    // Dialog should not be open when actionType is null
    expect(screen.queryByTestId("mock-dialog")).not.toBeInTheDocument();
  });
});
