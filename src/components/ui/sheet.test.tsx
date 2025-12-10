import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

describe("Sheet", () => {
  describe("Sheet root component", () => {
    it("should render Sheet component", () => {
      render(
        <Sheet>
          <div>Sheet content</div>
        </Sheet>,
      );
      expect(screen.getByText("Sheet content")).toBeInTheDocument();
    });

    it("should render with open state", () => {
      render(
        <Sheet open>
          <SheetContent>
            <div>Sheet is open</div>
          </SheetContent>
        </Sheet>,
      );
      expect(screen.getByText("Sheet is open")).toBeInTheDocument();
    });
  });

  describe("SheetTrigger", () => {
    it("should render SheetTrigger", () => {
      render(
        <Sheet>
          <SheetTrigger>Open Sheet</SheetTrigger>
        </Sheet>,
      );
      expect(screen.getByText("Open Sheet")).toBeInTheDocument();
    });

    it("should open sheet when trigger is clicked", async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <div>Content visible</div>
          </SheetContent>
        </Sheet>,
      );

      await user.click(screen.getByText("Open"));
      expect(screen.getByText("Content visible")).toBeInTheDocument();
    });
  });

  describe("SheetPortal", () => {
    it("should render SheetPortal with content", () => {
      render(
        <Sheet open>
          <SheetPortal>
            <div>Portal content</div>
          </SheetPortal>
        </Sheet>,
      );
      expect(screen.getByText("Portal content")).toBeInTheDocument();
    });
  });

  describe("SheetOverlay", () => {
    it("should render SheetOverlay", () => {
      render(
        <Sheet open>
          <SheetPortal>
            <SheetOverlay data-testid="sheet-overlay" />
          </SheetPortal>
        </Sheet>,
      );
      const overlay = screen.getByTestId("sheet-overlay");
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass("fixed", "inset-0");
    });

    it("should render overlay with custom className", () => {
      render(
        <Sheet open>
          <SheetPortal>
            <SheetOverlay className="custom-overlay" data-testid="overlay" />
          </SheetPortal>
        </Sheet>,
      );
      const overlay = screen.getByTestId("overlay");
      expect(overlay).toHaveClass("custom-overlay");
    });
  });

  describe("SheetContent", () => {
    it("should render SheetContent with children", () => {
      render(
        <Sheet open>
          <SheetContent>
            <div>Sheet content here</div>
          </SheetContent>
        </Sheet>,
      );
      expect(screen.getByText("Sheet content here")).toBeInTheDocument();
    });

    it("should render close button with sr-only text", () => {
      render(
        <Sheet open>
          <SheetContent>Content</SheetContent>
        </Sheet>,
      );
      expect(screen.getByText("Close")).toBeInTheDocument();
      expect(screen.getByText("Close")).toHaveClass("sr-only");
    });

    it("should close sheet when close button is clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <Sheet open onOpenChange={onOpenChange}>
          <SheetContent>
            <div>Content</div>
          </SheetContent>
        </Sheet>,
      );

      const closeButton = screen.getByText("Close").closest("button");
      if (closeButton) {
        await user.click(closeButton);
      }
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should apply custom className", () => {
      render(
        <Sheet open>
          <SheetContent className="custom-content" data-testid="sheet-content">
            Content
          </SheetContent>
        </Sheet>,
      );
      const content = screen.getByTestId("sheet-content");
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass("custom-content");
    });

    it("should render with side=right by default", () => {
      render(
        <Sheet open>
          <SheetContent data-testid="sheet-content">Content</SheetContent>
        </Sheet>,
      );
      const content = screen.getByTestId("sheet-content");
      expect(content).toHaveClass("right-0");
    });

    it("should render with side=left", () => {
      render(
        <Sheet open>
          <SheetContent side="left" data-testid="sheet-content">
            Content
          </SheetContent>
        </Sheet>,
      );
      const content = screen.getByTestId("sheet-content");
      expect(content).toHaveClass("left-0");
    });

    it("should render with side=top", () => {
      render(
        <Sheet open>
          <SheetContent side="top" data-testid="sheet-content">
            Content
          </SheetContent>
        </Sheet>,
      );
      const content = screen.getByTestId("sheet-content");
      expect(content).toHaveClass("top-0");
    });

    it("should render with side=bottom", () => {
      render(
        <Sheet open>
          <SheetContent side="bottom" data-testid="sheet-content">
            Content
          </SheetContent>
        </Sheet>,
      );
      const content = screen.getByTestId("sheet-content");
      expect(content).toHaveClass("bottom-0");
    });
  });

  describe("SheetClose", () => {
    it("should render SheetClose button", () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetClose>Close Button</SheetClose>
          </SheetContent>
        </Sheet>,
      );
      expect(screen.getByText("Close Button")).toBeInTheDocument();
    });

    it("should close sheet when SheetClose is clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <Sheet open onOpenChange={onOpenChange}>
          <SheetContent>
            <SheetClose>Close Sheet</SheetClose>
          </SheetContent>
        </Sheet>,
      );

      await user.click(screen.getByText("Close Sheet"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("SheetHeader", () => {
    it("should render SheetHeader with children", () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetHeader>
              <h2>Header Title</h2>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );
      expect(screen.getByText("Header Title")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetHeader className="custom-header" data-testid="sheet-header">
              Header
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );
      const header = screen.getByTestId("sheet-header");
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass("flex", "flex-col", "custom-header");
    });
  });

  describe("SheetFooter", () => {
    it("should render SheetFooter with children", () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetFooter>
              <button>Cancel</button>
              <button>Confirm</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetFooter className="custom-footer" data-testid="sheet-footer">
              Footer
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );
      const footer = screen.getByTestId("sheet-footer");
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass("flex", "custom-footer");
    });
  });

  describe("SheetTitle", () => {
    it("should render SheetTitle", () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetContent>
        </Sheet>,
      );
      expect(screen.getByText("Sheet Title")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetTitle className="custom-title" data-testid="sheet-title">
              Title
            </SheetTitle>
          </SheetContent>
        </Sheet>,
      );
      const title = screen.getByTestId("sheet-title");
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass("text-lg", "font-semibold", "custom-title");
    });
  });

  describe("SheetDescription", () => {
    it("should render SheetDescription", () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetDescription>Sheet description text</SheetDescription>
          </SheetContent>
        </Sheet>,
      );
      expect(screen.getByText("Sheet description text")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetDescription
              className="custom-desc"
              data-testid="sheet-description"
            >
              Description
            </SheetDescription>
          </SheetContent>
        </Sheet>,
      );
      const description = screen.getByTestId("sheet-description");
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass("text-sm", "custom-desc");
    });
  });

  describe("Complete Sheet example", () => {
    it("should render complete sheet with all components", async () => {
      const user = userEvent.setup();

      render(
        <Sheet>
          <SheetTrigger>Open Sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Are you sure?</SheetTitle>
              <SheetDescription>
                This action cannot be undone.
              </SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose>Cancel</SheetClose>
              <button>Continue</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );

      // Initially closed
      expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();

      // Open sheet
      await user.click(screen.getByText("Open Sheet"));

      // All components visible
      expect(screen.getByText("Are you sure?")).toBeInTheDocument();
      expect(
        screen.getByText("This action cannot be undone."),
      ).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });
  });

  describe("Sheet mobile menu use case", () => {
    it("should work as a mobile navigation menu", async () => {
      const user = userEvent.setup();
      const onLinkClick = vi.fn();

      render(
        <Sheet>
          <SheetTrigger aria-label="Open menu">Menu</SheetTrigger>
          <SheetContent side="right">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <nav>
              <a href="#features" onClick={onLinkClick}>
                Features
              </a>
              <a href="/pricing" onClick={onLinkClick}>
                Pricing
              </a>
            </nav>
          </SheetContent>
        </Sheet>,
      );

      // Open menu
      await user.click(screen.getByText("Menu"));

      // Navigation should be visible
      expect(screen.getByText("Features")).toBeInTheDocument();
      expect(screen.getByText("Pricing")).toBeInTheDocument();

      // Click a link
      await user.click(screen.getByText("Features"));
      expect(onLinkClick).toHaveBeenCalled();
    });
  });
});
