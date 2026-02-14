import { vi } from "vitest";
import type { ToolRegistry } from "../tool-registry";

export type MockRegistry = ToolRegistry & {
  handlers: Map<string, (...args: unknown[]) => unknown>;
};

export function createMockRegistry(): MockRegistry {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn(
      (def: { name: string; handler: (...args: unknown[]) => unknown }) => {
        handlers.set(def.name, def.handler);
      },
    ),
    handlers,
  };
  return registry as unknown as MockRegistry;
}
