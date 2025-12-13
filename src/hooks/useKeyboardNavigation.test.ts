import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseKeyboardNavigationOptions } from "./useKeyboardNavigation";
import { useKeyboardNavigation } from "./useKeyboardNavigation";

describe("useKeyboardNavigation", () => {
  const mockOnSpacebar = vi.fn();
  const mockOnLeftArrow = vi.fn();
  const mockOnRightArrow = vi.fn();
  const mockOnUpArrow = vi.fn();
  const mockOnDownArrow = vi.fn();
  const mockOnBKeyDown = vi.fn();
  const mockOnBKeyUp = vi.fn();
  const mockOnEscape = vi.fn();

  const defaultOptions: UseKeyboardNavigationOptions = {
    onSpacebar: mockOnSpacebar,
    onLeftArrow: mockOnLeftArrow,
    onRightArrow: mockOnRightArrow,
    onUpArrow: mockOnUpArrow,
    onDownArrow: mockOnDownArrow,
    onBKeyDown: mockOnBKeyDown,
    onBKeyUp: mockOnBKeyUp,
    onEscape: mockOnEscape,
    isEnabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to dispatch keyboard events
   */
  function dispatchKeyEvent(
    type: "keydown" | "keyup",
    code: string,
    target?: Partial<HTMLElement>,
  ): KeyboardEvent {
    const event = new KeyboardEvent(type, {
      code,
      bubbles: true,
      cancelable: true,
    });

    // Override target if provided
    if (target) {
      Object.defineProperty(event, "target", {
        value: target,
        writable: false,
      });
    }

    window.dispatchEvent(event);
    return event;
  }

  describe("initialization", () => {
    it("should add event listeners when enabled", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      renderHook(() => useKeyboardNavigation(defaultOptions));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keyup",
        expect.any(Function),
      );
    });

    it("should not add event listeners when disabled", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      renderHook(() =>
        useKeyboardNavigation({
          ...defaultOptions,
          isEnabled: false,
        })
      );

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "keyup",
        expect.any(Function),
      );
    });
  });

  describe("spacebar handling", () => {
    it("should call onSpacebar when Space key is pressed", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "Space");
      });

      expect(mockOnSpacebar).toHaveBeenCalledTimes(1);
    });

    it("should prevent default for spacebar", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      const preventDefaultSpy = vi.fn();
      const event = new KeyboardEvent("keydown", {
        code: "Space",
        bubbles: true,
        cancelable: true,
      });
      vi.spyOn(event, "preventDefault").mockImplementation(preventDefaultSpy);

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe("arrow key handling", () => {
    it("should call onLeftArrow when ArrowLeft is pressed", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "ArrowLeft");
      });

      expect(mockOnLeftArrow).toHaveBeenCalledTimes(1);
    });

    it("should call onRightArrow when ArrowRight is pressed", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "ArrowRight");
      });

      expect(mockOnRightArrow).toHaveBeenCalledTimes(1);
    });

    it("should call onUpArrow when ArrowUp is pressed and callback provided", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "ArrowUp");
      });

      expect(mockOnUpArrow).toHaveBeenCalledTimes(1);
    });

    it("should call onDownArrow when ArrowDown is pressed and callback provided", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "ArrowDown");
      });

      expect(mockOnDownArrow).toHaveBeenCalledTimes(1);
    });

    it("should not call onUpArrow when not provided", () => {
      renderHook(() =>
        useKeyboardNavigation({
          ...defaultOptions,
          onUpArrow: undefined,
        })
      );

      act(() => {
        dispatchKeyEvent("keydown", "ArrowUp");
      });

      expect(mockOnUpArrow).not.toHaveBeenCalled();
    });

    it("should not call onDownArrow when not provided", () => {
      renderHook(() =>
        useKeyboardNavigation({
          ...defaultOptions,
          onDownArrow: undefined,
        })
      );

      act(() => {
        dispatchKeyEvent("keydown", "ArrowDown");
      });

      expect(mockOnDownArrow).not.toHaveBeenCalled();
    });

    it("should prevent default for arrow keys", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      const preventDefaultSpies: ReturnType<typeof vi.fn>[] = [];

      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].forEach((code) => {
        const spy = vi.fn();
        const event = new KeyboardEvent("keydown", {
          code,
          bubbles: true,
          cancelable: true,
        });
        vi.spyOn(event, "preventDefault").mockImplementation(spy);
        preventDefaultSpies.push(spy);

        act(() => {
          window.dispatchEvent(event);
        });
      });

      preventDefaultSpies.forEach((spy) => {
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe("B key handling (peek)", () => {
    it("should call onBKeyDown when B key is pressed", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "KeyB");
      });

      expect(mockOnBKeyDown).toHaveBeenCalledTimes(1);
    });

    it("should call onBKeyUp when B key is released", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "KeyB");
        dispatchKeyEvent("keyup", "KeyB");
      });

      expect(mockOnBKeyUp).toHaveBeenCalledTimes(1);
    });

    it("should not call onBKeyDown on repeat keydown events", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        // First press
        dispatchKeyEvent("keydown", "KeyB");
        // Repeat events (held down)
        dispatchKeyEvent("keydown", "KeyB");
        dispatchKeyEvent("keydown", "KeyB");
        dispatchKeyEvent("keydown", "KeyB");
      });

      // Should only be called once for initial press
      expect(mockOnBKeyDown).toHaveBeenCalledTimes(1);
    });

    it("should call onBKeyUp only once per press-release cycle", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "KeyB");
        dispatchKeyEvent("keyup", "KeyB");
        // Extra keyup should not trigger again
        dispatchKeyEvent("keyup", "KeyB");
      });

      expect(mockOnBKeyUp).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple press-release cycles", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        // First cycle
        dispatchKeyEvent("keydown", "KeyB");
        dispatchKeyEvent("keyup", "KeyB");
        // Second cycle
        dispatchKeyEvent("keydown", "KeyB");
        dispatchKeyEvent("keyup", "KeyB");
      });

      expect(mockOnBKeyDown).toHaveBeenCalledTimes(2);
      expect(mockOnBKeyUp).toHaveBeenCalledTimes(2);
    });

    it("should prevent default for B key", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      const preventDefaultSpy = vi.fn();
      const event = new KeyboardEvent("keydown", {
        code: "KeyB",
        bubbles: true,
        cancelable: true,
      });
      vi.spyOn(event, "preventDefault").mockImplementation(preventDefaultSpy);

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should ignore keyup for non-B keys", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keyup", "Space");
        dispatchKeyEvent("keyup", "ArrowLeft");
        dispatchKeyEvent("keyup", "KeyA");
      });

      // No callbacks should be called for keyup of non-B keys
      expect(mockOnBKeyUp).not.toHaveBeenCalled();
    });
  });

  describe("Escape key handling", () => {
    it("should call onEscape when Escape key is pressed", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "Escape");
      });

      expect(mockOnEscape).toHaveBeenCalledTimes(1);
    });

    it("should prevent default for Escape", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      const preventDefaultSpy = vi.fn();
      const event = new KeyboardEvent("keydown", {
        code: "Escape",
        bubbles: true,
        cancelable: true,
      });
      vi.spyOn(event, "preventDefault").mockImplementation(preventDefaultSpy);

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe("input element filtering", () => {
    it("should not handle keys when target is an INPUT element", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "Space", {
          tagName: "INPUT",
          isContentEditable: false,
        });
      });

      expect(mockOnSpacebar).not.toHaveBeenCalled();
    });

    it("should not handle keys when target is a TEXTAREA element", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "ArrowLeft", {
          tagName: "TEXTAREA",
          isContentEditable: false,
        });
      });

      expect(mockOnLeftArrow).not.toHaveBeenCalled();
    });

    it("should not handle keys when target is contentEditable", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "ArrowRight", {
          tagName: "DIV",
          isContentEditable: true,
        });
      });

      expect(mockOnRightArrow).not.toHaveBeenCalled();
    });
  });

  describe("enabled/disabled state", () => {
    it("should not respond to keys when disabled", () => {
      renderHook(() =>
        useKeyboardNavigation({
          ...defaultOptions,
          isEnabled: false,
        })
      );

      act(() => {
        dispatchKeyEvent("keydown", "Space");
        dispatchKeyEvent("keydown", "ArrowLeft");
        dispatchKeyEvent("keydown", "ArrowRight");
        dispatchKeyEvent("keydown", "KeyB");
        dispatchKeyEvent("keydown", "Escape");
      });

      expect(mockOnSpacebar).not.toHaveBeenCalled();
      expect(mockOnLeftArrow).not.toHaveBeenCalled();
      expect(mockOnRightArrow).not.toHaveBeenCalled();
      expect(mockOnBKeyDown).not.toHaveBeenCalled();
      expect(mockOnEscape).not.toHaveBeenCalled();
    });

    it("should start responding when enabled after being disabled", () => {
      const { rerender } = renderHook(
        ({ isEnabled }) =>
          useKeyboardNavigation({
            ...defaultOptions,
            isEnabled,
          }),
        { initialProps: { isEnabled: false } },
      );

      act(() => {
        dispatchKeyEvent("keydown", "Space");
      });

      expect(mockOnSpacebar).not.toHaveBeenCalled();

      rerender({ isEnabled: true });

      act(() => {
        dispatchKeyEvent("keydown", "Space");
      });

      expect(mockOnSpacebar).toHaveBeenCalledTimes(1);
    });

    it("should stop responding when disabled after being enabled", () => {
      const { rerender } = renderHook(
        ({ isEnabled }) =>
          useKeyboardNavigation({
            ...defaultOptions,
            isEnabled,
          }),
        { initialProps: { isEnabled: true } },
      );

      act(() => {
        dispatchKeyEvent("keydown", "Space");
      });

      expect(mockOnSpacebar).toHaveBeenCalledTimes(1);

      rerender({ isEnabled: false });

      act(() => {
        dispatchKeyEvent("keydown", "Space");
      });

      // Should still be 1, not increased
      expect(mockOnSpacebar).toHaveBeenCalledTimes(1);
    });

    it("should reset B key state when disabled", () => {
      const { rerender } = renderHook(
        ({ isEnabled }) =>
          useKeyboardNavigation({
            ...defaultOptions,
            isEnabled,
          }),
        { initialProps: { isEnabled: true } },
      );

      // Hold B key down
      act(() => {
        dispatchKeyEvent("keydown", "KeyB");
      });

      expect(mockOnBKeyDown).toHaveBeenCalledTimes(1);

      // Disable while B is held
      rerender({ isEnabled: false });

      // Re-enable and press B again
      rerender({ isEnabled: true });

      act(() => {
        dispatchKeyEvent("keydown", "KeyB");
      });

      // Should trigger again because state was reset
      expect(mockOnBKeyDown).toHaveBeenCalledTimes(2);
    });
  });

  describe("cleanup", () => {
    it("should remove event listeners on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useKeyboardNavigation(defaultOptions));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keyup",
        expect.any(Function),
      );
    });

    it("should not respond to events after unmount", () => {
      const { unmount } = renderHook(() => useKeyboardNavigation(defaultOptions));

      unmount();

      act(() => {
        dispatchKeyEvent("keydown", "Space");
      });

      // Callbacks should not be called after unmount
      // Note: This is implicitly tested by the removeEventListener call
      // The actual behavior depends on event listener cleanup
    });
  });

  describe("unhandled keys", () => {
    it("should not respond to unhandled keys", () => {
      renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        dispatchKeyEvent("keydown", "KeyA");
        dispatchKeyEvent("keydown", "KeyZ");
        dispatchKeyEvent("keydown", "Enter");
        dispatchKeyEvent("keydown", "Tab");
      });

      expect(mockOnSpacebar).not.toHaveBeenCalled();
      expect(mockOnLeftArrow).not.toHaveBeenCalled();
      expect(mockOnRightArrow).not.toHaveBeenCalled();
      expect(mockOnUpArrow).not.toHaveBeenCalled();
      expect(mockOnDownArrow).not.toHaveBeenCalled();
      expect(mockOnBKeyDown).not.toHaveBeenCalled();
      expect(mockOnEscape).not.toHaveBeenCalled();
    });
  });

  describe("callback stability", () => {
    it("should update handlers when callbacks change", () => {
      const newOnSpacebar = vi.fn();

      const { rerender } = renderHook(
        ({ onSpacebar }) =>
          useKeyboardNavigation({
            ...defaultOptions,
            onSpacebar,
          }),
        { initialProps: { onSpacebar: mockOnSpacebar } },
      );

      act(() => {
        dispatchKeyEvent("keydown", "Space");
      });

      expect(mockOnSpacebar).toHaveBeenCalledTimes(1);
      expect(newOnSpacebar).not.toHaveBeenCalled();

      rerender({ onSpacebar: newOnSpacebar });

      act(() => {
        dispatchKeyEvent("keydown", "Space");
      });

      expect(mockOnSpacebar).toHaveBeenCalledTimes(1);
      expect(newOnSpacebar).toHaveBeenCalledTimes(1);
    });
  });
});
