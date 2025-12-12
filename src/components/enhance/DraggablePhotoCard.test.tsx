import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DraggablePhotoCard } from "./DraggablePhotoCard";

describe("DraggablePhotoCard", () => {
  const defaultProps = {
    imageId: "test-image-1",
    children: <div data-testid="child-content">Photo Content</div>,
  };

  describe("rendering", () => {
    it("renders children correctly", () => {
      render(<DraggablePhotoCard {...defaultProps} />);
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByText("Photo Content")).toBeInTheDocument();
    });

    it("sets draggable attribute", () => {
      render(<DraggablePhotoCard {...defaultProps} />);
      const wrapper = screen.getByRole("listitem");
      expect(wrapper).toHaveAttribute("draggable", "true");
    });

    it("sets correct data attributes", () => {
      render(<DraggablePhotoCard {...defaultProps} />);
      const wrapper = screen.getByRole("listitem");
      expect(wrapper).toHaveAttribute("data-draggable-photo-card");
      expect(wrapper).toHaveAttribute("data-image-id", "test-image-1");
      expect(wrapper).toHaveAttribute("data-is-dragging", "false");
    });

    it("sets aria-grabbed attribute", () => {
      render(<DraggablePhotoCard {...defaultProps} />);
      const wrapper = screen.getByRole("listitem");
      expect(wrapper).toHaveAttribute("aria-grabbed", "false");
    });
  });

  describe("drag start behavior", () => {
    it("calls onDragStart with single image ID when not selected", () => {
      const onDragStart = vi.fn();
      render(
        <DraggablePhotoCard
          {...defaultProps}
          onDragStart={onDragStart}
          isSelected={false}
        />,
      );

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });

      expect(onDragStart).toHaveBeenCalledWith(["test-image-1"]);
      expect(dataTransfer.setData).toHaveBeenCalledWith(
        "application/json",
        JSON.stringify({ imageIds: ["test-image-1"] }),
      );
      expect(dataTransfer.effectAllowed).toBe("move");
    });

    it("calls onDragStart with all selected image IDs when multiple are selected", () => {
      const onDragStart = vi.fn();
      const selectedImageIds = ["test-image-1", "test-image-2", "test-image-3"];

      render(
        <DraggablePhotoCard
          {...defaultProps}
          onDragStart={onDragStart}
          isSelected={true}
          selectedImageIds={selectedImageIds}
        />,
      );

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });

      expect(onDragStart).toHaveBeenCalledWith(selectedImageIds);
      expect(dataTransfer.setData).toHaveBeenCalledWith(
        "application/json",
        JSON.stringify({ imageIds: selectedImageIds }),
      );
    });

    it("calls onDragStart with single ID when selected but only one in selection", () => {
      const onDragStart = vi.fn();

      render(
        <DraggablePhotoCard
          {...defaultProps}
          onDragStart={onDragStart}
          isSelected={true}
          selectedImageIds={["test-image-1"]}
        />,
      );

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });

      expect(onDragStart).toHaveBeenCalledWith(["test-image-1"]);
    });

    it("sets isDragging state on drag start", () => {
      render(<DraggablePhotoCard {...defaultProps} />);

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });

      expect(wrapper).toHaveAttribute("data-is-dragging", "true");
      expect(wrapper).toHaveAttribute("aria-grabbed", "true");
    });

    it("works without onDragStart callback", () => {
      render(<DraggablePhotoCard {...defaultProps} />);

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      expect(() => {
        fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });
      }).not.toThrow();
    });
  });

  describe("drag end behavior", () => {
    it("calls onDragEnd when drag ends", () => {
      const onDragEnd = vi.fn();
      render(
        <DraggablePhotoCard {...defaultProps} onDragEnd={onDragEnd} />,
      );

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });
      fireEvent.dragEnd(wrapper);

      expect(onDragEnd).toHaveBeenCalledTimes(1);
    });

    it("resets isDragging state on drag end", () => {
      render(<DraggablePhotoCard {...defaultProps} />);

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });
      expect(wrapper).toHaveAttribute("data-is-dragging", "true");

      fireEvent.dragEnd(wrapper);
      expect(wrapper).toHaveAttribute("data-is-dragging", "false");
      expect(wrapper).toHaveAttribute("aria-grabbed", "false");
    });

    it("works without onDragEnd callback", () => {
      render(<DraggablePhotoCard {...defaultProps} />);

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });
      expect(() => {
        fireEvent.dragEnd(wrapper);
      }).not.toThrow();
    });
  });

  describe("drag behavior", () => {
    it("handles onDrag event continuously during drag", () => {
      render(<DraggablePhotoCard {...defaultProps} />);

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });
      fireEvent.drag(wrapper, { clientX: 150, clientY: 150 });
      fireEvent.drag(wrapper, { clientX: 200, clientY: 200 });

      // Drag event should be handled without errors
      expect(wrapper).toHaveAttribute("data-is-dragging", "true");
    });
  });

  describe("default props", () => {
    it("uses default isSelected value of false", () => {
      const onDragStart = vi.fn();
      render(
        <DraggablePhotoCard {...defaultProps} onDragStart={onDragStart} />,
      );

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });

      // With default isSelected=false, should only drag single image
      expect(onDragStart).toHaveBeenCalledWith(["test-image-1"]);
    });

    it("uses default empty selectedImageIds array", () => {
      const onDragStart = vi.fn();
      render(
        <DraggablePhotoCard
          {...defaultProps}
          onDragStart={onDragStart}
          isSelected={true}
        />,
      );

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });

      // With empty selectedImageIds, should just use single imageId
      expect(onDragStart).toHaveBeenCalledWith(["test-image-1"]);
    });
  });

  describe("CSS classes", () => {
    it("has cursor-grab class initially", () => {
      render(<DraggablePhotoCard {...defaultProps} />);
      const wrapper = screen.getByRole("listitem");
      expect(wrapper).toHaveClass("cursor-grab");
    });

    it("has cursor-grabbing class when dragging", () => {
      render(<DraggablePhotoCard {...defaultProps} />);

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });

      expect(wrapper).toHaveClass("cursor-grabbing");
    });

    it("returns to cursor-grab after drag end", () => {
      render(<DraggablePhotoCard {...defaultProps} />);

      const wrapper = screen.getByRole("listitem");
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(wrapper, { dataTransfer, clientX: 100, clientY: 100 });
      expect(wrapper).toHaveClass("cursor-grabbing");

      fireEvent.dragEnd(wrapper);
      expect(wrapper).toHaveClass("cursor-grab");
    });

    it("has transition-opacity class for smooth animations", () => {
      render(<DraggablePhotoCard {...defaultProps} />);
      const wrapper = screen.getByRole("listitem");
      expect(wrapper).toHaveClass("transition-opacity");
      expect(wrapper).toHaveClass("duration-150");
    });
  });

  describe("touch action", () => {
    it("has touch-action none for proper mobile behavior", () => {
      render(<DraggablePhotoCard {...defaultProps} />);
      const wrapper = screen.getByRole("listitem");
      expect(wrapper.style.touchAction).toBe("none");
    });
  });
});
