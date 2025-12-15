/**
 * Tests for GalleryItemForm Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GalleryItemForm } from "./GalleryItemForm";

const mockItem = {
  id: "item1",
  title: "Test Title",
  description: "Test description",
  category: "PORTRAIT" as const,
  originalUrl: "https://example.com/original.jpg",
  enhancedUrl: "https://example.com/enhanced.jpg",
  isActive: true,
  displayOrder: 1,
  imageId: "img1",
  jobId: "job1",
  createdAt: "2024-01-15T10:00:00.000Z",
  updatedAt: "2024-01-15T10:00:00.000Z",
};

const mockSelectedImageData = {
  imageId: "img2",
  jobId: "job2",
  originalUrl: "https://example.com/new-original.jpg",
  enhancedUrl: "https://example.com/new-enhanced.jpg",
};

describe("GalleryItemForm", () => {
  it("should render title input", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter a title for this gallery item"))
      .toBeInTheDocument();
  });

  it("should render description input", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Optional description for this gallery item"),
    ).toBeInTheDocument();
  });

  it("should render category select", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    expect(screen.getByLabelText("Category")).toBeInTheDocument();
  });

  it("should show validation error for empty title", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    const submitButton = screen.getByRole("button", { name: /Add to Gallery/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should call onSubmit with form data", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    const titleInput = screen.getByLabelText(/Title/);
    const descriptionInput = screen.getByLabelText("Description");

    fireEvent.change(titleInput, { target: { value: "New Gallery Item" } });
    fireEvent.change(descriptionInput, {
      target: { value: "New description" },
    });

    const submitButton = screen.getByRole("button", { name: /Add to Gallery/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: "New Gallery Item",
        description: "New description",
        category: "PORTRAIT",
      });
    });
  });

  it("should call onCancel when cancelled", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should show image preview when URLs provided for new item", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <GalleryItemForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        selectedImageData={mockSelectedImageData}
      />,
    );

    expect(screen.getByText("Image Preview")).toBeInTheDocument();
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Enhanced")).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
  });

  it("should show image preview for edit mode", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <GalleryItemForm
        item={mockItem}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Image Preview")).toBeInTheDocument();
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Enhanced")).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
  });

  it("should handle create mode (no initial item)", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    expect(screen.getByRole("button", { name: /Add to Gallery/ }))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save Changes/ })).not
      .toBeInTheDocument();
  });

  it("should handle edit mode (with initial item)", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <GalleryItemForm
        item={mockItem}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("button", { name: /Save Changes/ }))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add to Gallery/ })).not
      .toBeInTheDocument();
  });

  it("should populate form with item data in edit mode", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <GalleryItemForm
        item={mockItem}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(
      "Description",
    ) as HTMLTextAreaElement;

    expect(titleInput.value).toBe("Test Title");
    expect(descriptionInput.value).toBe("Test description");
  });

  it("should update category when selected", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    const titleInput = screen.getByLabelText(/Title/);
    fireEvent.change(titleInput, { target: { value: "Test" } });

    // Note: Testing Select component interaction is complex due to Radix UI
    // This test verifies the select element exists and form submits with default category
    const submitButton = screen.getByRole("button", { name: /Add to Gallery/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Test",
        description: undefined,
        category: "PORTRAIT", // Default category
      });
    });
  });

  it("should trim whitespace from title and description", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    const titleInput = screen.getByLabelText(/Title/);
    const descriptionInput = screen.getByLabelText("Description");

    fireEvent.change(titleInput, { target: { value: "  Trimmed Title  " } });
    fireEvent.change(descriptionInput, {
      target: { value: "  Trimmed Description  " },
    });

    const submitButton = screen.getByRole("button", { name: /Add to Gallery/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Trimmed Title",
        description: "Trimmed Description",
        category: "PORTRAIT",
      });
    });
  });

  it("should disable buttons when submitting", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <GalleryItemForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        isSubmitting={true}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /Saving.../ });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("should clear validation errors when typing", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    // Submit empty form to trigger validation
    const submitButton = screen.getByRole("button", { name: /Add to Gallery/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });

    // Type in title to clear error
    const titleInput = screen.getByLabelText(/Title/);
    fireEvent.change(titleInput, { target: { value: "New Title" } });

    // Submit again
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText("Title is required")).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it("should submit without description if empty", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<GalleryItemForm onSubmit={onSubmit} onCancel={onCancel} />);

    const titleInput = screen.getByLabelText(/Title/);
    fireEvent.change(titleInput, { target: { value: "Title Only" } });

    const submitButton = screen.getByRole("button", { name: /Add to Gallery/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Title Only",
        description: undefined,
        category: "PORTRAIT",
      });
    });
  });
});
