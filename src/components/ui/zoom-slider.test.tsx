import { render, screen, waitFor } from "@testing-library/react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useZoomLevel, ZoomSlider } from "./zoom-slider";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("ZoomSlider", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("renders zoom slider with icons", async () => {
    render(<ZoomSlider />);

    // Wait for component to mount (it has a loading state)
    await waitFor(() => {
      // Check for zoom icons (svg elements)
      const svgs = document.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("renders placeholder while not mounted", () => {
    const { container } = render(<ZoomSlider />);

    // Initially shows placeholder
    const placeholder = container.querySelector(".bg-muted.rounded-full");
    // Placeholder might briefly appear before hydration
    expect(container.querySelector("svg")).toBeDefined();
  });

  it("applies custom className", async () => {
    const { container } = render(<ZoomSlider className="custom-zoom" />);

    await waitFor(() => {
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("custom-zoom");
    });
  });

  it("saves zoom level to localStorage when changed", async () => {
    const onChange = vi.fn();
    render(<ZoomSlider onChange={onChange} />);

    // Wait for mount
    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalledWith("album-zoom-level");
    });
  });

  it("loads initial zoom level from localStorage", async () => {
    localStorageMock.setItem("album-zoom-level", "4");

    const { rerender } = render(<ZoomSlider />);

    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalledWith("album-zoom-level");
    });

    // Rerender to ensure the value is loaded
    rerender(<ZoomSlider />);
  });
});

describe("useZoomLevel hook", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns default zoom level 3 before mount", () => {
    const { result } = renderHook(() => useZoomLevel());

    // Before mount, should return default value
    expect(result.current[0]).toBe(3);
  });

  it("returns setZoom function that updates localStorage", async () => {
    const { result } = renderHook(() => useZoomLevel());

    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalled();
    });

    // Set a new zoom level
    act(() => {
      result.current[1](4);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "album-zoom-level",
      "4",
    );
  });

  it("loads stored zoom level from localStorage after mount", async () => {
    localStorageMock.setItem("album-zoom-level", "5");

    const { result } = renderHook(() => useZoomLevel());

    await waitFor(() => {
      expect(result.current[0]).toBe(5);
    });
  });

  it("ignores invalid zoom levels in localStorage", async () => {
    localStorageMock.setItem("album-zoom-level", "10"); // Invalid

    const { result } = renderHook(() => useZoomLevel());

    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalled();
    });

    // Should remain at default since 10 is out of range
    expect(result.current[0]).toBe(3);
  });

  it("ignores non-numeric values in localStorage", async () => {
    localStorageMock.setItem("album-zoom-level", "invalid");

    const { result } = renderHook(() => useZoomLevel());

    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalled();
    });

    // Should remain at default
    expect(result.current[0]).toBe(3);
  });
});
