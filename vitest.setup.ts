import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";
import "@testing-library/jest-dom/vitest";

expect.extend(matchers);

import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

// Mock env vars
process.env.DATABASE_URL = "postgresql://mock:5432/mock";

// Polyfill for jsdom - missing pointer capture methods and scrollIntoView
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ||
    function() {
      return false;
    };
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ||
    function() {};
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ||
    function() {};
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ||
    function() {};
  Element.prototype.animate = Element.prototype.animate ||
    function() {
      return {
        finished: Promise.resolve(),
        cancel: () => {},
        pause: () => {},
        play: () => {},
        reverse: () => {},
        finish: () => {},
        onfinish: null,
        oncancel: null,
        currentTime: 0,
        playState: "finished",
        effect: null,
        timeline: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };
}

// Polyfill for ResizeObserver (required by Radix UI)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill for window.matchMedia (required by next-themes)
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Polyfill for localStorage (required by tracking modules and zoom-slider)
// Use a class-based implementation to satisfy StorageEvent constructor requirements
if (typeof window !== "undefined" && !window.localStorage?.getItem) {
  class MockStorage implements Storage {
    private data: Record<string, string> = {};

    get length(): number {
      return Object.keys(this.data).length;
    }

    clear(): void {
      this.data = {};
    }

    getItem(key: string): string | null {
      return this.data[key] ?? null;
    }

    key(index: number): string | null {
      return Object.keys(this.data)[index] ?? null;
    }

    removeItem(key: string): void {
      delete this.data[key];
    }

    setItem(key: string, value: string): void {
      this.data[key] = value;
    }

    // Allow indexing by string
    [name: string]: unknown;
  }

  const mockStorage = new MockStorage();
  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
}

// Suppress console warnings and errors during tests
beforeAll(() => {
  // Suppress console.error
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Suppress console.warn
  vi.spyOn(console, "warn").mockImplementation(() => {});
  // Suppress console.log
  vi.spyOn(console, "log").mockImplementation(() => {});
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
