import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";
import "@testing-library/jest-dom/vitest";

expect.extend(matchers);

import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

// Mock env vars
process.env.DATABASE_URL = "postgresql://mock:5432/mock";

// Mock reactflow
vi.mock("reactflow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("reactflow")>();
  // We need to use real state for hooks to work in tests
  // We can't import React directly here because of hoisting, but we can require it or assume it's available in the test env
  // However, simple useState mock might be enough if we just proxy to React's useState
  // But inside vi.mock factory, we can't easily access 'react'.

  // A workaround is to not mock the hooks if they are just wrappers, but useNodesState IS a wrapper.
  // If we can't easily use real useState, we might just stick to the simple mock and accept that state doesn't update in unit tests unless we use a more complex mock setup.

  // BUT, for the test to pass, we need state updates.
  // Let's try to import React dynamically.
  const React = await import("react");

  return {
    ...actual,
    useNodesState: (initial: any) => {
      const [nodes, setNodes] = React.useState(initial);
      const onNodesChange = vi.fn();
      return [nodes, setNodes, onNodesChange];
    },
    useEdgesState: (initial: any) => {
      const [edges, setEdges] = React.useState(initial);
      const onEdgesChange = vi.fn();
      return [edges, setEdges, onEdgesChange];
    },
    useReactFlow: vi.fn(() => ({
      setNodes: vi.fn(),
      setEdges: vi.fn(),
      project: vi.fn((pos) => pos),
    })),
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
    Panel: ({ children }: { children: React.ReactNode }) => children,
    Controls: () => null,
    Background: () => null,
    MiniMap: () => null,
    Handle: () => null,
    applyNodeChanges: vi.fn(),
    applyEdgeChanges: vi.fn(),
    addEdge: vi.fn(),
  };
});

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
