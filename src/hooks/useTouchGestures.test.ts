import { act, renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseTouchGesturesOptions } from "./useTouchGestures";
import { useTouchGestures } from "./useTouchGestures";

describe("useTouchGestures", () => {
  const mockOnSwipeLeft = vi.fn();
  const mockOnSwipeRight = vi.fn();
  const mockOnSwipeUp = vi.fn();
  const mockOnSwipeDown = vi.fn();
  const mockOnTap = vi.fn();
  const mockOnDoubleTap = vi.fn();
  const mockOnLongPressStart = vi.fn();
  const mockOnLongPressEnd = vi.fn();

  let mockElement: HTMLDivElement;
  let mockElementRef: RefObject<HTMLDivElement | null>;

  const defaultOptions: UseTouchGesturesOptions = {
    onSwipeLeft: mockOnSwipeLeft,
    onSwipeRight: mockOnSwipeRight,
    onSwipeUp: mockOnSwipeUp,
    onSwipeDown: mockOnSwipeDown,
    onTap: mockOnTap,
    onDoubleTap: mockOnDoubleTap,
    onLongPressStart: mockOnLongPressStart,
    onLongPressEnd: mockOnLongPressEnd,
    isEnabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: false });

    mockElement = document.createElement("div");
    mockElementRef = { current: mockElement };
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Helper to create touch event
   */
  function createTouchEvent(
    type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
    touches: Array<{ clientX: number; clientY: number; }>,
  ): TouchEvent {
    const touchList = touches.map((touch, index) => ({
      identifier: index,
      clientX: touch.clientX,
      clientY: touch.clientY,
      target: mockElement,
      screenX: touch.clientX,
      screenY: touch.clientY,
      pageX: touch.clientX,
      pageY: touch.clientY,
      radiusX: 0,
      radiusY: 0,
      rotationAngle: 0,
      force: 1,
    })) as unknown as Touch[];

    const event = new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: type === "touchend" || type === "touchcancel" ? [] : touchList,
      changedTouches: touchList,
      targetTouches: type === "touchend" || type === "touchcancel" ? [] : touchList,
    });

    return event;
  }

  /**
   * Helper to simulate a swipe gesture
   */
  function simulateSwipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = 100,
  ) {
    act(() => {
      mockElement.dispatchEvent(
        createTouchEvent("touchstart", [{ clientX: startX, clientY: startY }]),
      );
    });

    act(() => {
      vi.advanceTimersByTime(duration);
    });

    act(() => {
      mockElement.dispatchEvent(
        createTouchEvent("touchend", [{ clientX: endX, clientY: endY }]),
      );
    });
  }

  describe("initialization", () => {
    it("should add touch event listeners when enabled", () => {
      const addEventListenerSpy = vi.spyOn(mockElement, "addEventListener");

      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        { passive: true },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchmove",
        expect.any(Function),
        { passive: true },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchend",
        expect.any(Function),
        { passive: true },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchcancel",
        expect.any(Function),
        { passive: true },
      );
    });

    it("should not add event listeners when disabled", () => {
      const addEventListenerSpy = vi.spyOn(mockElement, "addEventListener");

      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          isEnabled: false,
        })
      );

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it("should not add event listeners when elementRef is null", () => {
      const nullRef: RefObject<HTMLDivElement | null> = { current: null };
      const addEventListenerSpy = vi.spyOn(mockElement, "addEventListener");

      renderHook(() => useTouchGestures(nullRef, defaultOptions));

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });
  });

  describe("swipe left", () => {
    it("should detect swipe left when swiping left quickly", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      simulateSwipe(200, 100, 100, 100, 100); // -100px horizontal

      expect(mockOnSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it("should not detect swipe left if duration exceeds max duration", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      simulateSwipe(200, 100, 100, 100, 400); // Too slow

      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
    });

    it("should not detect swipe left if distance is below threshold", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      simulateSwipe(100, 100, 70, 100, 100); // Only 30px, below default 50px threshold

      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
    });
  });

  describe("swipe right", () => {
    it("should detect swipe right when swiping right quickly", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      simulateSwipe(100, 100, 200, 100, 100); // +100px horizontal

      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("should respect custom swipe threshold", () => {
      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          swipeThreshold: 100,
        })
      );

      // Below threshold
      simulateSwipe(100, 100, 180, 100, 100);
      expect(mockOnSwipeRight).not.toHaveBeenCalled();

      // Above threshold
      simulateSwipe(100, 100, 220, 100, 100);
      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("should respect custom swipe max duration", () => {
      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          swipeMaxDuration: 200,
        })
      );

      // Too slow for custom duration
      simulateSwipe(100, 100, 200, 100, 250);
      expect(mockOnSwipeRight).not.toHaveBeenCalled();

      // Fast enough for custom duration
      simulateSwipe(100, 100, 200, 100, 150);
      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
    });
  });

  describe("swipe up", () => {
    it("should detect swipe up when swiping up quickly", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      simulateSwipe(100, 200, 100, 100, 100); // -100px vertical

      expect(mockOnSwipeUp).toHaveBeenCalledTimes(1);
    });

    it("should not call onSwipeUp when callback not provided", () => {
      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          onSwipeUp: undefined,
        })
      );

      simulateSwipe(100, 200, 100, 100, 100);

      expect(mockOnSwipeUp).not.toHaveBeenCalled();
    });
  });

  describe("swipe down", () => {
    it("should detect swipe down when swiping down quickly", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      simulateSwipe(100, 100, 100, 200, 100); // +100px vertical

      expect(mockOnSwipeDown).toHaveBeenCalledTimes(1);
    });

    it("should not call onSwipeDown when callback not provided", () => {
      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          onSwipeDown: undefined,
        })
      );

      simulateSwipe(100, 100, 100, 200, 100);

      expect(mockOnSwipeDown).not.toHaveBeenCalled();
    });
  });

  describe("swipe direction priority", () => {
    it("should prioritize horizontal swipe over vertical when X delta is greater", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      // Diagonal swipe with more horizontal movement
      simulateSwipe(100, 100, 200, 140, 100); // +100 horizontal, +40 vertical

      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
      expect(mockOnSwipeDown).not.toHaveBeenCalled();
    });

    it("should prioritize vertical swipe over horizontal when Y delta is greater", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      // Diagonal swipe with more vertical movement
      simulateSwipe(100, 100, 140, 200, 100); // +40 horizontal, +100 vertical

      expect(mockOnSwipeDown).toHaveBeenCalledTimes(1);
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
    });
  });

  describe("single tap", () => {
    it("should detect single tap when touch with minimal movement", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      simulateSwipe(100, 100, 102, 102, 100); // Very small movement

      expect(mockOnTap).toHaveBeenCalledTimes(1);
    });

    it("should not call onTap when callback not provided", () => {
      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          onTap: undefined,
        })
      );

      simulateSwipe(100, 100, 102, 102, 100);

      expect(mockOnTap).not.toHaveBeenCalled();
    });
  });

  describe("double tap", () => {
    it("should detect double tap when two taps within delay", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      // First tap (takes ~50ms)
      simulateSwipe(100, 100, 102, 102, 50);

      // Small gap between taps (50ms gap + 50ms next tap = 100ms between touchends)
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Second tap within default 300ms delay
      simulateSwipe(100, 100, 102, 102, 50);

      expect(mockOnTap).toHaveBeenCalledTimes(1); // First tap
      expect(mockOnDoubleTap).toHaveBeenCalledTimes(1); // Second tap triggers double tap
    });

    it("should not detect double tap when taps are too far apart", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      // First tap
      simulateSwipe(100, 100, 102, 102, 50);

      // Wait too long (350ms gap ensures more than 300ms between touchends)
      act(() => {
        vi.advanceTimersByTime(350);
      });

      simulateSwipe(100, 100, 102, 102, 50);

      expect(mockOnTap).toHaveBeenCalledTimes(2);
      expect(mockOnDoubleTap).not.toHaveBeenCalled();
    });

    it("should respect custom double tap delay", () => {
      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          doubleTapDelay: 500,
        })
      );

      // First tap (takes ~50ms)
      simulateSwipe(100, 100, 102, 102, 50);

      // Second tap within custom 500ms delay (300ms gap + 50ms tap = 350ms between touchends)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      simulateSwipe(100, 100, 102, 102, 50);

      expect(mockOnDoubleTap).toHaveBeenCalledTimes(1);
    });

    it("should not call onDoubleTap when callback not provided", () => {
      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          onDoubleTap: undefined,
        })
      );

      // First tap
      simulateSwipe(100, 100, 102, 102, 100);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Second tap
      simulateSwipe(100, 100, 102, 102, 100);

      expect(mockOnTap).toHaveBeenCalledTimes(2);
      expect(mockOnDoubleTap).not.toHaveBeenCalled();
    });

    it("should not trigger triple tap", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      // First tap
      simulateSwipe(100, 100, 102, 102, 50);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Second tap (double tap)
      simulateSwipe(100, 100, 102, 102, 50);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Third tap (should be single tap, not another double tap)
      simulateSwipe(100, 100, 102, 102, 50);

      expect(mockOnTap).toHaveBeenCalledTimes(2); // First and third
      expect(mockOnDoubleTap).toHaveBeenCalledTimes(1); // Second
    });
  });

  describe("long press", () => {
    it("should detect long press when touch held for delay", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      // Wait for default 500ms long press delay
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).toHaveBeenCalledTimes(1);

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchend", [{ clientX: 100, clientY: 100 }]),
        );
      });

      expect(mockOnLongPressEnd).toHaveBeenCalledTimes(1);
    });

    it("should respect custom long press delay", () => {
      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          longPressDelay: 1000,
        })
      );

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      // Not enough time
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).not.toHaveBeenCalled();

      // Enough time
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).toHaveBeenCalledTimes(1);
    });

    it("should cancel long press if touch moves too much", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      // Move more than threshold (10px)
      act(() => {
        vi.advanceTimersByTime(100);
        mockElement.dispatchEvent(
          createTouchEvent("touchmove", [{ clientX: 150, clientY: 100 }]),
        );
      });

      // Wait for long press delay
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).not.toHaveBeenCalled();
    });

    it("should not cancel long press if touch moves within threshold", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      // Move less than threshold (10px)
      act(() => {
        vi.advanceTimersByTime(100);
        mockElement.dispatchEvent(
          createTouchEvent("touchmove", [{ clientX: 105, clientY: 105 }]),
        );
      });

      // Wait for long press delay
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).toHaveBeenCalledTimes(1);
    });

    it("should cancel long press on touchend before delay", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      act(() => {
        vi.advanceTimersByTime(200); // Less than 500ms default
        mockElement.dispatchEvent(
          createTouchEvent("touchend", [{ clientX: 100, clientY: 100 }]),
        );
      });

      // Even after more time passes
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).not.toHaveBeenCalled();
    });

    it("should not start long press timer when callback not provided", () => {
      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          onLongPressStart: undefined,
        })
      );

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).not.toHaveBeenCalled();
    });
  });

  describe("touch cancel", () => {
    it("should handle touchcancel event", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).toHaveBeenCalledTimes(1);

      act(() => {
        mockElement.dispatchEvent(createTouchEvent("touchcancel", []));
      });

      expect(mockOnLongPressEnd).toHaveBeenCalledTimes(1);
    });

    it("should cancel long press timer on touchcancel", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      act(() => {
        vi.advanceTimersByTime(200);
        mockElement.dispatchEvent(createTouchEvent("touchcancel", []));
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).not.toHaveBeenCalled();
    });
  });

  describe("enabled/disabled state", () => {
    it("should not respond to touches when disabled", () => {
      renderHook(() =>
        useTouchGestures(mockElementRef, {
          ...defaultOptions,
          isEnabled: false,
        })
      );

      simulateSwipe(200, 100, 100, 100, 100);

      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
    });

    it("should respond when enabled after being disabled", () => {
      const { rerender } = renderHook(
        ({ isEnabled }) =>
          useTouchGestures(mockElementRef, {
            ...defaultOptions,
            isEnabled,
          }),
        { initialProps: { isEnabled: false } },
      );

      simulateSwipe(200, 100, 100, 100, 100);
      expect(mockOnSwipeLeft).not.toHaveBeenCalled();

      rerender({ isEnabled: true });

      simulateSwipe(200, 100, 100, 100, 100);
      expect(mockOnSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it("should end long press when disabled during long press", () => {
      const { rerender } = renderHook(
        ({ isEnabled }) =>
          useTouchGestures(mockElementRef, {
            ...defaultOptions,
            isEnabled,
          }),
        { initialProps: { isEnabled: true } },
      );

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).toHaveBeenCalledTimes(1);

      rerender({ isEnabled: false });

      expect(mockOnLongPressEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe("cleanup", () => {
    it("should remove event listeners on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(mockElement, "removeEventListener");

      const { unmount } = renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchmove",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchend",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchcancel",
        expect.any(Function),
      );
    });

    it("should clear long press timer on unmount", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { unmount } = renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle touchend without touchstart", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchend", [{ clientX: 100, clientY: 100 }]),
        );
      });

      // Should not throw or call any callbacks
      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
      expect(mockOnTap).not.toHaveBeenCalled();
    });

    it("should handle touchmove without touchstart", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchmove", [{ clientX: 100, clientY: 100 }]),
        );
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle empty touches array in touchstart", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      const event = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [],
        changedTouches: [],
        targetTouches: [],
      });

      act(() => {
        mockElement.dispatchEvent(event);
      });

      // Should not throw or call any callbacks
      expect(mockOnLongPressStart).not.toHaveBeenCalled();
    });

    it("should handle empty changedTouches array in touchend", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      const endEvent = new TouchEvent("touchend", {
        bubbles: true,
        cancelable: true,
        touches: [],
        changedTouches: [],
        targetTouches: [],
      });

      act(() => {
        mockElement.dispatchEvent(endEvent);
      });

      // Should not throw or call swipe/tap callbacks
      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
      expect(mockOnTap).not.toHaveBeenCalled();
    });

    it("should handle empty touches array in touchmove", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      act(() => {
        mockElement.dispatchEvent(
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]),
        );
      });

      const moveEvent = new TouchEvent("touchmove", {
        bubbles: true,
        cancelable: true,
        touches: [],
        changedTouches: [],
        targetTouches: [],
      });

      act(() => {
        mockElement.dispatchEvent(moveEvent);
      });

      // Should not throw and long press timer should still work
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPressStart).toHaveBeenCalledTimes(1);
    });

    it("should handle rapid consecutive swipes", () => {
      renderHook(() => useTouchGestures(mockElementRef, defaultOptions));

      // Multiple rapid swipes
      for (let i = 0; i < 5; i++) {
        simulateSwipe(200, 100, 100, 100, 50);
      }

      expect(mockOnSwipeLeft).toHaveBeenCalledTimes(5);
    });
  });
});
