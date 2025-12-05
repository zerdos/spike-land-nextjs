import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

// Polyfill for jsdom - missing pointer capture methods and scrollIntoView
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || function() {
    return false;
  };
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function() {};
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ||
    function() {};
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function() {};
}

// Polyfill for ResizeObserver (required by Radix UI)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill for window.matchMedia (required by next-themes)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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
