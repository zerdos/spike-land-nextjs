import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BulkDeleteDialog } from "./BulkDeleteDialog";

describe("BulkDeleteDialog Component", () => {
  const mockVersions = [
    { id: "1", tier: "1K", sizeBytes: 1024 * 100 },
    { id: "2", tier: "2K", sizeBytes: 1024 * 500 },
    { id: "3", tier: "4K", sizeBytes: 1024 * 1024 * 2 },
  ];

  const defaultProps = {
    selectedVersions: mockVersions,
    onDelete: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
  };

  it("should not render when no versions selected", () => {
    const { container } = render(
      <BulkDeleteDialog {...defaultProps} selectedVersions={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("should render delete button with count when versions are selected", () => {
    render(<BulkDeleteDialog {...defaultProps} />);

    expect(screen.getByRole("button", { name: /delete selected \(3\)/i })).toBeInTheDocument();
  });

  it("should open dialog when delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<BulkDeleteDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm Bulk Delete")).toBeInTheDocument();
  });

  it("should display correct version count in dialog", async () => {
    const user = userEvent.setup();
    render(<BulkDeleteDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));

    expect(screen.getByText(/3 enhancement versions/i)).toBeInTheDocument();
  });

  it("should display total storage to be freed", async () => {
    const user = userEvent.setup();
    render(<BulkDeleteDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));

    expect(screen.getByText(/storage to be freed/i)).toBeInTheDocument();
  });

  it("should display list of versions to delete", async () => {
    const user = userEvent.setup();
    render(<BulkDeleteDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));

    expect(screen.getByText("1K")).toBeInTheDocument();
    expect(screen.getByText("2K")).toBeInTheDocument();
    expect(screen.getByText("4K")).toBeInTheDocument();
  });

  it("should call onDelete with version ids when delete is confirmed", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<BulkDeleteDialog {...defaultProps} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));
    await user.click(screen.getByRole("button", { name: /delete 3 versions/i }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(["1", "2", "3"]);
    });
  });

  it("should close dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<BulkDeleteDialog {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("should disable buttons when deleting", async () => {
    const user = userEvent.setup();
    let resolveDelete: () => void;
    const onDelete = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveDelete = resolve; })
    );
    render(<BulkDeleteDialog {...defaultProps} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));
    await user.click(screen.getByRole("button", { name: /delete 3 versions/i }));

    expect(screen.getByRole("button", { name: /deleting/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeDisabled();

    resolveDelete!();
  });

  it("should show loading state when deleting", async () => {
    const user = userEvent.setup();
    let resolveDelete: () => void;
    const onDelete = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveDelete = resolve; })
    );
    render(<BulkDeleteDialog {...defaultProps} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));
    await user.click(screen.getByRole("button", { name: /delete 3 versions/i }));

    expect(screen.getByText(/deleting/i)).toBeInTheDocument();

    resolveDelete!();
  });

  it("should disable trigger button when disabled prop is true", () => {
    render(<BulkDeleteDialog {...defaultProps} disabled />);

    expect(screen.getByRole("button", { name: /delete selected/i })).toBeDisabled();
  });

  it("should handle single version text correctly", () => {
    render(
      <BulkDeleteDialog
        {...defaultProps}
        selectedVersions={[{ id: "1", tier: "1K", sizeBytes: 1024 }]}
      />
    );

    expect(screen.getByRole("button", { name: /delete selected \(1\)/i })).toBeInTheDocument();
  });

  it("should handle versions with null sizeBytes", async () => {
    const user = userEvent.setup();
    render(
      <BulkDeleteDialog
        {...defaultProps}
        selectedVersions={[
          { id: "1", tier: "1K", sizeBytes: null },
          { id: "2", tier: "2K", sizeBytes: undefined },
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: /delete selected/i }));

    expect(screen.getByText(/storage to be freed/i)).toBeInTheDocument();
  });

  it("should close dialog after successful delete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<BulkDeleteDialog {...defaultProps} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));
    await user.click(screen.getByRole("button", { name: /delete 3 versions/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("should handle delete error gracefully", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onDelete = vi.fn().mockRejectedValue(new Error("Delete failed"));
    render(<BulkDeleteDialog {...defaultProps} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));
    await user.click(screen.getByRole("button", { name: /delete 3 versions/i }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Bulk delete failed:", expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
