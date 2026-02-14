import { vi } from "vitest";

/**
 * Create mock functions for `node:fs` and return a vi.mock-compatible factory.
 *
 * Usage:
 * ```ts
 * const fsMocks = createNodeFsMocks();
 * vi.mock("node:fs", fsMocks.factory);
 * // Then use fsMocks.existsSync, fsMocks.readFileSync, etc.
 * ```
 */
export function createNodeFsMocks() {
  const existsSync = vi.fn();
  const readFileSync = vi.fn();
  const writeFileSync = vi.fn();
  const appendFileSync = vi.fn();
  const mkdirSync = vi.fn();

  const factory = async (importOriginal: () => Promise<typeof import("node:fs")>) => {
    const actual = await importOriginal();
    const mocked = {
      ...actual,
      existsSync: (...args: unknown[]) => existsSync(...args),
      readFileSync: (...args: unknown[]) => readFileSync(...args),
      writeFileSync: (...args: unknown[]) => writeFileSync(...args),
      appendFileSync: (...args: unknown[]) => appendFileSync(...args),
      mkdirSync: (...args: unknown[]) => mkdirSync(...args),
    };
    return { ...mocked, default: mocked };
  };

  return { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, factory };
}

// NOTE: createChildProcessMocks is a TEST MOCK factory, not real exec usage.
// It creates vi.fn() stubs for test files that need to mock node:child_process.
// This is safe - no actual shell commands are executed.

/**
 * Create mock functions for `node:child_process` and return a vi.mock-compatible factory.
 *
 * Usage:
 * ```ts
 * const cpMocks = createChildProcessMocks();
 * vi.mock("node:child_process", cpMocks.factory);
 * // Then use cpMocks.execSync in tests
 * ```
 */
export function createChildProcessMocks() {
  const execSync = vi.fn();

  const factory = async (
    importOriginal: () => Promise<typeof import("node:child_process")>,
  ) => {
    const actual = await importOriginal();
    const mocked = {
      ...actual,
      execSync: (...args: unknown[]) => execSync(...args),
    };
    return { ...mocked, default: mocked };
  };

  return { execSync, factory };
}
