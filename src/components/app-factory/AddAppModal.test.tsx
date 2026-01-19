/**
 * AddAppModal Tests
 *
 * Tests for the Add App Modal component which handles adding new apps
 * to the pipeline.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddAppModal } from "./AddAppModal";

describe("AddAppModal", () => {
  const mockOnClose = vi.fn();
  const mockOnAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the modal with title", () => {
      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      expect(screen.getByText("Add App to Pipeline")).toBeInTheDocument();
    });

    it("renders all form fields", () => {
      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      expect(screen.getByLabelText("App Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Category")).toBeInTheDocument();
      expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    });

    it("renders submit and cancel buttons", () => {
      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      expect(screen.getByRole("button", { name: "Add to Pipeline" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("pre-fills form with initial item data", () => {
      const initialItem = {
        name: "test-app",
        category: "productivity",
        description: "A test application",
      };

      render(
        <AddAppModal
          initialItem={initialItem}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      expect(screen.getByLabelText("App Name")).toHaveValue("test-app");
      expect(screen.getByLabelText("Description (optional)")).toHaveValue("A test application");
    });
  });

  describe("validation", () => {
    it("shows error when name is empty", async () => {
      const user = userEvent.setup();
      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Add to Pipeline" }));

      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it("shows error when name is only whitespace", async () => {
      const user = userEvent.setup();
      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      await user.type(screen.getByLabelText("App Name"), "   ");
      await user.click(screen.getByRole("button", { name: "Add to Pipeline" }));

      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(mockOnAdd).not.toHaveBeenCalled();
    });
  });

  describe("form submission", () => {
    it("calls onAdd with trimmed values on successful submission", async () => {
      const user = userEvent.setup();
      mockOnAdd.mockResolvedValueOnce(undefined);

      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      await user.type(screen.getByLabelText("App Name"), "  my-app  ");
      await user.type(screen.getByLabelText("Description (optional)"), "  My description  ");
      await user.click(screen.getByRole("button", { name: "Add to Pipeline" }));

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(
          "my-app",
          "utility",
          "My description",
        );
      });
    });

    it("calls onAdd with undefined description when description is empty", async () => {
      const user = userEvent.setup();
      mockOnAdd.mockResolvedValueOnce(undefined);

      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      await user.type(screen.getByLabelText("App Name"), "my-app");
      await user.click(screen.getByRole("button", { name: "Add to Pipeline" }));

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(
          "my-app",
          "utility",
          undefined,
        );
      });
    });

    it("shows error message on API failure", async () => {
      const user = userEvent.setup();
      mockOnAdd.mockRejectedValueOnce(new Error("API Error: App already exists"));

      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      await user.type(screen.getByLabelText("App Name"), "my-app");
      await user.click(screen.getByRole("button", { name: "Add to Pipeline" }));

      await waitFor(() => {
        expect(screen.getByText("API Error: App already exists")).toBeInTheDocument();
      });
    });

    it("shows generic error message for non-Error exceptions", async () => {
      const user = userEvent.setup();
      mockOnAdd.mockRejectedValueOnce("Unknown error");

      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      await user.type(screen.getByLabelText("App Name"), "my-app");
      await user.click(screen.getByRole("button", { name: "Add to Pipeline" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to add app")).toBeInTheDocument();
      });
    });
  });

  describe("loading state", () => {
    it("disables inputs during submission", async () => {
      const user = userEvent.setup();
      // Use a promise that never resolves to keep the loading state
      mockOnAdd.mockImplementation(() => new Promise(() => {}));

      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      await user.type(screen.getByLabelText("App Name"), "my-app");
      await user.click(screen.getByRole("button", { name: "Add to Pipeline" }));

      await waitFor(() => {
        expect(screen.getByLabelText("App Name")).toBeDisabled();
        expect(screen.getByLabelText("Description (optional)")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Adding..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      });
    });

    it("shows Adding... text during submission", async () => {
      const user = userEvent.setup();
      mockOnAdd.mockImplementation(() => new Promise(() => {}));

      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      await user.type(screen.getByLabelText("App Name"), "my-app");
      await user.click(screen.getByRole("button", { name: "Add to Pipeline" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Adding..." })).toBeInTheDocument();
      });
    });

    it("re-enables inputs after error (using finally block)", async () => {
      const user = userEvent.setup();
      mockOnAdd.mockRejectedValueOnce(new Error("Test error"));

      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      await user.type(screen.getByLabelText("App Name"), "my-app");
      await user.click(screen.getByRole("button", { name: "Add to Pipeline" }));

      // Wait for error to be displayed and inputs to be re-enabled
      await waitFor(() => {
        expect(screen.getByText("Test error")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByLabelText("App Name")).not.toBeDisabled();
        expect(screen.getByRole("button", { name: "Add to Pipeline" })).not.toBeDisabled();
      });
    });
  });

  describe("modal behavior", () => {
    it("calls onClose when clicking cancel button", async () => {
      const user = userEvent.setup();
      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when clicking backdrop", async () => {
      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      // Find the backdrop (the outer div with role="dialog")
      const backdrop = screen.getByRole("dialog");
      // Click on the backdrop itself, not on the card
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when clicking inside the card", async () => {
      const user = userEvent.setup();
      render(
        <AddAppModal
          initialItem={null}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />,
      );

      // Click on the title inside the card
      await user.click(screen.getByText("Add App to Pipeline"));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
