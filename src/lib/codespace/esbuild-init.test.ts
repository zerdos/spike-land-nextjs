import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock esbuild-wasm
const mockInitialize = vi.fn();
vi.mock("esbuild-wasm", () => ({
  initialize: mockInitialize,
}));

import { ensureEsbuildReady, resetEsbuild } from "./esbuild-init";

describe("esbuild-init", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEsbuild();
  });

  it("calls initialize on first invocation", async () => {
    mockInitialize.mockResolvedValue(undefined);

    await ensureEsbuildReady();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledWith(
      expect.objectContaining({ worker: false }),
    );
  });

  it("does not call initialize on subsequent calls (singleton)", async () => {
    mockInitialize.mockResolvedValue(undefined);

    await ensureEsbuildReady();
    await ensureEsbuildReady();
    await ensureEsbuildReady();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it("handles concurrent calls without double-initializing", async () => {
    let resolveInit: () => void;
    mockInitialize.mockReturnValue(
      new Promise<void>((r) => {
        resolveInit = r;
      }),
    );

    const p1 = ensureEsbuildReady();
    const p2 = ensureEsbuildReady();

    resolveInit!();
    await p1;
    await p2;

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it("handles 'already initialized' error gracefully", async () => {
    mockInitialize.mockRejectedValue(
      new Error('Cannot call "initialize" more than once'),
    );

    await expect(ensureEsbuildReady()).resolves.toBeUndefined();
  });

  it("rethrows non-initialize errors", async () => {
    mockInitialize.mockRejectedValue(new Error("WASM failed to load"));

    await expect(ensureEsbuildReady()).rejects.toThrow("WASM failed to load");
  });

  it("allows retry after a non-initialize error", async () => {
    mockInitialize
      .mockRejectedValueOnce(new Error("WASM failed to load"))
      .mockResolvedValueOnce(undefined);

    await expect(ensureEsbuildReady()).rejects.toThrow("WASM failed to load");

    // Reset was called internally (initPromise set to null on error)
    // so the next call should retry
    await ensureEsbuildReady();
    expect(mockInitialize).toHaveBeenCalledTimes(2);
  });

  it("resetEsbuild allows re-initialization", async () => {
    mockInitialize.mockResolvedValue(undefined);

    await ensureEsbuildReady();
    expect(mockInitialize).toHaveBeenCalledTimes(1);

    resetEsbuild();
    await ensureEsbuildReady();
    expect(mockInitialize).toHaveBeenCalledTimes(2);
  });

  it("passes wasmURL in initialize options", async () => {
    mockInitialize.mockResolvedValue(undefined);

    await ensureEsbuildReady();

    const options = mockInitialize.mock.calls[0]![0];
    expect(options).toHaveProperty("wasmURL");
    expect(typeof options.wasmURL).toBe("string");
    expect(options.wasmURL).toContain("esbuild.wasm");
  });
});
