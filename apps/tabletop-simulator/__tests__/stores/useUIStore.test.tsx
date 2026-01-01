import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUIStore } from "../../stores/useUIStore";

// Store original window properties
const originalInnerWidth = window.innerWidth;
const originalOntouchstart = Object.getOwnPropertyDescriptor(window, "ontouchstart");

// Mock window.matchMedia
const mockMatchMedia = vi.fn().mockImplementation(() => ({
  matches: false,
  media: "",
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: mockMatchMedia,
});

describe("useUIStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to desktop width
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });
    // Delete ontouchstart to simulate non-touch device
    // Using "in" operator, property must not exist
    delete (window as unknown as Record<string, unknown>).ontouchstart;
  });

  afterAll(() => {
    // Restore original values
    Object.defineProperty(window, "innerWidth", { writable: true, value: originalInnerWidth });
    if (originalOntouchstart) {
      Object.defineProperty(window, "ontouchstart", originalOntouchstart);
    }
  });

  describe("interaction mode", () => {
    it("should default to orbit mode", () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.interactionMode).toBe("orbit");
    });

    it("should toggle between orbit and interaction modes", () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.interactionMode).toBe("orbit");

      act(() => {
        result.current.toggleMode();
      });

      expect(result.current.interactionMode).toBe("interaction");

      act(() => {
        result.current.toggleMode();
      });

      expect(result.current.interactionMode).toBe("orbit");
    });

    it("should set interaction mode directly", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setInteractionMode("interaction");
      });

      expect(result.current.interactionMode).toBe("interaction");
    });
  });

  describe("sidebar state", () => {
    it("should default to closed sidebar", () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.sidebarOpen).toBe(false);
    });

    it("should toggle sidebar open/closed", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(false);
    });

    it("should set sidebar open state directly", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarOpen(true);
      });

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.setSidebarOpen(false);
      });

      expect(result.current.sidebarOpen).toBe(false);
    });

    it("should default to players tab", () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.sidebarTab).toBe("players");
    });

    it("should change sidebar tab", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarTab("chat");
      });

      expect(result.current.sidebarTab).toBe("chat");

      act(() => {
        result.current.setSidebarTab("library");
      });

      expect(result.current.sidebarTab).toBe("library");
    });
  });

  describe("hand drawer state", () => {
    it("should default to closed hand", () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.handOpen).toBe(false);
    });

    it("should toggle hand drawer", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleHand();
      });

      expect(result.current.handOpen).toBe(true);

      act(() => {
        result.current.toggleHand();
      });

      expect(result.current.handOpen).toBe(false);
    });

    it("should set hand open state directly", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setHandOpen(true);
      });

      expect(result.current.handOpen).toBe(true);
    });
  });

  describe("context menu state", () => {
    it("should default to no context menu", () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.contextMenu).toBeNull();
    });

    it("should open context menu with object info", () => {
      const { result } = renderHook(() => useUIStore());

      const menuState = {
        objectId: "card-123",
        objectType: "card" as const,
        position: { x: 100, y: 200, z: 0 },
      };

      act(() => {
        result.current.openContextMenu(menuState);
      });

      expect(result.current.contextMenu).toEqual(menuState);
    });

    it("should close context menu", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openContextMenu({
          objectId: "card-123",
          objectType: "card",
          position: { x: 100, y: 200, z: 0 },
        });
      });

      expect(result.current.contextMenu).not.toBeNull();

      act(() => {
        result.current.closeContextMenu();
      });

      expect(result.current.contextMenu).toBeNull();
    });
  });

  describe("mobile detection", () => {
    it("should detect non-mobile by default when window is wide", () => {
      // Ensure desktop setup - wide screen, no touch
      Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });
      delete (window as unknown as Record<string, unknown>).ontouchstart;

      const { result } = renderHook(() => useUIStore());
      expect(result.current.isMobile).toBe(false);
    });

    it("should detect mobile when window is narrow", () => {
      // Narrow screen triggers mobile regardless of touch
      Object.defineProperty(window, "innerWidth", { writable: true, value: 600 });
      delete (window as unknown as Record<string, unknown>).ontouchstart;

      const { result } = renderHook(() => useUIStore());
      expect(result.current.isMobile).toBe(true);
    });

    it("should detect mobile when touch is supported", () => {
      // Touch support triggers mobile regardless of screen width
      Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });
      // Adding the property (even undefined) makes "in" operator return true
      Object.defineProperty(window, "ontouchstart", {
        writable: true,
        configurable: true,
        value: null,
      });

      const { result } = renderHook(() => useUIStore());
      expect(result.current.isMobile).toBe(true);
    });
  });
});
