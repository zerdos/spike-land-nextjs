import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

describe("Dialog", () => {
  describe("Dialog root component", () => {
    it("should render Dialog component", () => {
      render(
        <Dialog>
          <div>Dialog content</div>
        </Dialog>,
      );
      expect(screen.getByText("Dialog content")).toBeInTheDocument();
    });

    it("should render with open state", () => {
      render(
        <Dialog open>
          <DialogContent>
            <div>Dialog is open</div>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Dialog is open")).toBeInTheDocument();
    });
  });

  describe("DialogTrigger", () => {
    it("should render DialogTrigger", () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
        </Dialog>,
      );
      expect(screen.getByText("Open Dialog")).toBeInTheDocument();
    });

    it("should open dialog when trigger is clicked", async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <div>Content visible</div>
          </DialogContent>
        </Dialog>,
      );

      await user.click(screen.getByText("Open"));
      expect(screen.getByText("Content visible")).toBeInTheDocument();
    });
  });

  describe("DialogPortal", () => {
    it("should render DialogPortal with content", () => {
      render(
        <Dialog open>
          <DialogPortal>
            <div>Portal content</div>
          </DialogPortal>
        </Dialog>,
      );
      expect(screen.getByText("Portal content")).toBeInTheDocument();
    });
  });

  describe("DialogOverlay", () => {
    it("should render DialogOverlay", () => {
      render(
        <Dialog open>
          <DialogPortal>
            <DialogOverlay data-testid="dialog-overlay" />
          </DialogPortal>
        </Dialog>,
      );
      const overlay = screen.getByTestId("dialog-overlay");
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass("fixed", "inset-0");
    });

    it("should render overlay with custom className", () => {
      render(
        <Dialog open>
          <DialogPortal>
            <DialogOverlay className="custom-overlay" data-testid="overlay" />
          </DialogPortal>
        </Dialog>,
      );
      const overlay = screen.getByTestId("overlay");
      expect(overlay).toHaveClass("custom-overlay");
    });
  });

  describe("DialogContent", () => {
    it("should render DialogContent with children", () => {
      render(
        <Dialog open>
          <DialogContent>
            <div>Dialog content here</div>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Dialog content here")).toBeInTheDocument();
    });

    it("should render close button with sr-only text", () => {
      render(
        <Dialog open>
          <DialogContent>Content</DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Close")).toBeInTheDocument();
      expect(screen.getByText("Close")).toHaveClass("sr-only");
    });

    it("should close dialog when close button is clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent>
            <div>Content</div>
          </DialogContent>
        </Dialog>,
      );

      const closeButton = screen.getByText("Close").closest("button");
      if (closeButton) {
        await user.click(closeButton);
      }
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should apply custom className", () => {
      render(
        <Dialog open>
          <DialogContent className="custom-content" data-testid="dialog-content">
            Content
          </DialogContent>
        </Dialog>,
      );
      const content = screen.getByTestId("dialog-content");
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass("custom-content");
    });
  });

  describe("DialogClose", () => {
    it("should render DialogClose button", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogClose>Close Button</DialogClose>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Close Button")).toBeInTheDocument();
    });

    it("should close dialog when DialogClose is clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogClose>Close Dialog</DialogClose>
          </DialogContent>
        </Dialog>,
      );

      await user.click(screen.getByText("Close Dialog"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("DialogHeader", () => {
    it("should render DialogHeader with children", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <h2>Header Title</h2>
            </DialogHeader>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Header Title")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader className="custom-header" data-testid="dialog-header">
              Header
            </DialogHeader>
          </DialogContent>
        </Dialog>,
      );
      const header = screen.getByTestId("dialog-header");
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass("flex", "flex-col", "custom-header");
    });
  });

  describe("DialogFooter", () => {
    it("should render DialogFooter with children", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogFooter>
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogFooter className="custom-footer" data-testid="dialog-footer">
              Footer
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );
      const footer = screen.getByTestId("dialog-footer");
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass("flex", "custom-footer");
    });
  });

  describe("DialogTitle", () => {
    it("should render DialogTitle", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Dialog Title")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle className="custom-title" data-testid="dialog-title">Title</DialogTitle>
          </DialogContent>
        </Dialog>,
      );
      const title = screen.getByTestId("dialog-title");
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass("text-lg", "font-semibold", "custom-title");
    });
  });

  describe("DialogDescription", () => {
    it("should render DialogDescription", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogDescription>Dialog description text</DialogDescription>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Dialog description text")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogDescription className="custom-desc" data-testid="dialog-description">
              Description
            </DialogDescription>
          </DialogContent>
        </Dialog>,
      );
      const description = screen.getByTestId("dialog-description");
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass("text-sm", "custom-desc");
    });
  });

  describe("Complete Dialog example", () => {
    it("should render complete dialog with all components", async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <button>Continue</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );

      // Initially closed
      expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();

      // Open dialog
      await user.click(screen.getByText("Open Dialog"));

      // All components visible
      expect(screen.getByText("Are you sure?")).toBeInTheDocument();
      expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });
  });
});
