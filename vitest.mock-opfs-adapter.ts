/**
 * Mock for @spike-npm-land/opfs-node-adapter
 * Used in tests to avoid actual OPFS operations
 */

import { vi } from "vitest";

export const writeFile = vi.fn().mockResolvedValue(undefined);
export const readFile = vi.fn().mockResolvedValue(Buffer.from("test"));
export const rm = vi.fn().mockResolvedValue(undefined);
export const mkdir = vi.fn().mockResolvedValue(undefined);
export const glob = vi.fn().mockResolvedValue([] as string[]);
