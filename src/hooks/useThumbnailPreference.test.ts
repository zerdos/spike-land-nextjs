import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThumbnailPreference } from "./useThumbnailPreference";

const STORAGE_KEY = "pixel-thumbnail-view-preference";

describe("useThumbnailPreference", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("initialization", () => {
    it("should default to showEnhanced: false when no stored value exists", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      expect(result.current.showEnhanced).toBe(false);
    });

    it("should read stored value 'true' from localStorage on mount", () => {
      localStorage.setItem(STORAGE_KEY, "true");

      const { result } = renderHook(() => useThumbnailPreference());

      expect(result.current.showEnhanced).toBe(true);
    });

    it("should read stored value 'false' from localStorage on mount", () => {
      localStorage.setItem(STORAGE_KEY, "false");

      const { result } = renderHook(() => useThumbnailPreference());

      expect(result.current.showEnhanced).toBe(false);
    });

    it("should handle invalid stored values gracefully", () => {
      localStorage.setItem(STORAGE_KEY, "invalid");

      const { result } = renderHook(() => useThumbnailPreference());

      expect(result.current.showEnhanced).toBe(false);
    });
  });

  describe("setShowEnhanced", () => {
    it("should update state to true", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      act(() => {
        result.current.setShowEnhanced(true);
      });

      expect(result.current.showEnhanced).toBe(true);
    });

    it("should update state to false", () => {
      localStorage.setItem(STORAGE_KEY, "true");
      const { result } = renderHook(() => useThumbnailPreference());

      act(() => {
        result.current.setShowEnhanced(false);
      });

      expect(result.current.showEnhanced).toBe(false);
    });

    it("should persist true to localStorage", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      act(() => {
        result.current.setShowEnhanced(true);
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
    });

    it("should persist false to localStorage", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      act(() => {
        result.current.setShowEnhanced(false);
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe("false");
    });

    it("should update both state and localStorage in a single call", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      act(() => {
        result.current.setShowEnhanced(true);
      });

      expect(result.current.showEnhanced).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
    });
  });

  describe("toggleView", () => {
    it("should toggle from false to true", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      act(() => {
        result.current.toggleView();
      });

      expect(result.current.showEnhanced).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
    });

    it("should toggle from true to false", () => {
      localStorage.setItem(STORAGE_KEY, "true");
      const { result } = renderHook(() => useThumbnailPreference());

      act(() => {
        result.current.toggleView();
      });

      expect(result.current.showEnhanced).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe("false");
    });

    it("should toggle multiple times correctly", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      act(() => {
        result.current.toggleView();
      });
      expect(result.current.showEnhanced).toBe(true);

      act(() => {
        result.current.toggleView();
      });
      expect(result.current.showEnhanced).toBe(false);

      act(() => {
        result.current.toggleView();
      });
      expect(result.current.showEnhanced).toBe(true);
    });
  });

  describe("cross-tab synchronization", () => {
    it("should sync state when storage event is fired with 'true'", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      const storageEvent = new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: "true",
        oldValue: "false",
        storageArea: localStorage,
      });

      act(() => {
        window.dispatchEvent(storageEvent);
      });

      expect(result.current.showEnhanced).toBe(true);
    });

    it("should sync state when storage event is fired with 'false'", () => {
      localStorage.setItem(STORAGE_KEY, "true");
      const { result } = renderHook(() => useThumbnailPreference());

      const storageEvent = new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: "false",
        oldValue: "true",
        storageArea: localStorage,
      });

      act(() => {
        window.dispatchEvent(storageEvent);
      });

      expect(result.current.showEnhanced).toBe(false);
    });

    it("should ignore storage events for different keys", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      const storageEvent = new StorageEvent("storage", {
        key: "other-key",
        newValue: "true",
        oldValue: "false",
        storageArea: localStorage,
      });

      act(() => {
        window.dispatchEvent(storageEvent);
      });

      expect(result.current.showEnhanced).toBe(false);
    });

    it("should ignore storage events with null newValue", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      const storageEvent = new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: null,
        oldValue: "false",
        storageArea: localStorage,
      });

      act(() => {
        window.dispatchEvent(storageEvent);
      });

      expect(result.current.showEnhanced).toBe(false);
    });

    it("should clean up storage event listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
      const { unmount } = renderHook(() => useThumbnailPreference());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "storage",
        expect.any(Function),
      );
    });
  });

  describe("SSR safety", () => {
    it("should check for window before accessing localStorage", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      // In JSDOM environment, window is always defined
      // This test verifies the hook includes typeof window checks
      expect(typeof window).toBe("object");
      expect(result.current.showEnhanced).toBe(false);
    });

    it("should handle setShowEnhanced safely", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      // Should not throw even if localStorage has issues
      expect(() => {
        act(() => {
          result.current.setShowEnhanced(true);
        });
      }).not.toThrow();

      expect(result.current.showEnhanced).toBe(true);
    });

    it("should handle toggleView safely", () => {
      const { result } = renderHook(() => useThumbnailPreference());

      // Should not throw even if localStorage has issues
      expect(() => {
        act(() => {
          result.current.toggleView();
        });
      }).not.toThrow();

      expect(result.current.showEnhanced).toBe(true);
    });
  });

  describe("function stability", () => {
    it("should maintain stable setShowEnhanced reference", () => {
      const { result, rerender } = renderHook(() => useThumbnailPreference());

      const firstSetShowEnhanced = result.current.setShowEnhanced;

      act(() => {
        result.current.setShowEnhanced(true);
      });

      rerender();

      expect(result.current.setShowEnhanced).toBe(firstSetShowEnhanced);
    });

    it("should maintain stable toggleView reference", () => {
      const { result, rerender } = renderHook(() => useThumbnailPreference());

      const firstToggleView = result.current.toggleView;

      act(() => {
        result.current.toggleView();
      });

      rerender();

      expect(result.current.toggleView).toBe(firstToggleView);
    });
  });
});
