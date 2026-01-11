import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InboxConfirmDialog } from "./inbox-confirm-dialog";

describe("InboxConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    title: "Test Dialog",
    description: "Test Description",
  };

  it("renders correctly when open", () => {
    render(<InboxConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Test Dialog")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<InboxConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    render(<InboxConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Continue"));
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(<InboxConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("renders custom confirm/cancel text", () => {
    render(
      <InboxConfirmDialog
        {...defaultProps}
        confirmText="Yes, do it"
        cancelText="No, stop"
      />,
    );
    expect(screen.getByText("Yes, do it")).toBeInTheDocument();
    expect(screen.getByText("No, stop")).toBeInTheDocument();
  });

  it("renders destructive variant correctly", () => {
    // Note: We can't easily check class names for styles in unit tests effectively without setup,
    // but we can sanity check that it renders without error.
    render(<InboxConfirmDialog {...defaultProps} variant="destructive" />);
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });
});
