import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InboxActionButtons } from "./inbox-action-buttons";

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
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
  InboxConfirmDialog: ({ isOpen, onConfirm, onCancel, title }: any) => (
    isOpen
      ? (
        <div data-testid="mock-dialog">
          <h1>{title}</h1>
          <button onClick={onConfirm}>Confirm</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      )
      : null
  ),
}));

describe("InboxActionButtons", () => {
  const defaultProps = {
    itemId: "test-item-123",
    workspaceSlug: "test-workspace",
    onActionComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it("opens archive confirmation dialog when Archive clicked", () => {
    render(<InboxActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText("Archive"));
    expect(screen.getByTestId("mock-dialog")).toBeInTheDocument();
    expect(screen.getByText("Archive Item?")).toBeInTheDocument();
  });

  it("opens ignore confirmation dialog when Ignore clicked", () => {
    render(<InboxActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText("Ignore"));
    expect(screen.getByTestId("mock-dialog")).toBeInTheDocument();
    expect(screen.getByText("Ignore Item?")).toBeInTheDocument();
  });

  it("performs action and invalidates queries on confirm", async () => {
    render(<InboxActionButtons {...defaultProps} />);

    // Click Resolve
    fireEvent.click(screen.getByText("Mark Resolved"));

    // Click Confirm in dialog
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Success",
      }));
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["inboxItems", "test-workspace"],
    });
    expect(defaultProps.onActionComplete).toHaveBeenCalled();
  });

  it("does not perform action if cancelled", async () => {
    render(<InboxActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByText("Mark Resolved"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByTestId("mock-dialog")).not.toBeInTheDocument();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});
