import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInitializeServerConsoleCapture = vi.fn();
const mockFlushServerErrors = vi.fn().mockResolvedValue(undefined);
const mockStartVibeWatcher = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureRequestError: vi.fn(),
}));

vi.mock("../sentry.server.config", () => ({}));
vi.mock("../sentry.edge.config", () => ({}));

vi.mock("@/lib/errors/console-capture.server", () => ({
  initializeServerConsoleCapture: mockInitializeServerConsoleCapture,
  flushServerErrors: mockFlushServerErrors,
}));

vi.mock("@/lib/vibe-watcher", () => ({
  startVibeWatcher: mockStartVibeWatcher,
}));

const { register } = await import("../instrumentation");

describe("instrumentation", () => {
  const originalEnv = { ...process.env };
  let processOnSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    processOnSpy = vi.spyOn(process, "on");
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(
      (() => {}) as never,
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    processOnSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("initializes server console capture on nodejs runtime", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    await register();
    expect(mockInitializeServerConsoleCapture).toHaveBeenCalledTimes(1);
  });

  it("registers SIGTERM and SIGINT shutdown handlers on nodejs runtime", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    await register();

    const sigTermCalls = processOnSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === "SIGTERM",
    );
    const sigIntCalls = processOnSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === "SIGINT",
    );

    expect(sigTermCalls.length).toBeGreaterThanOrEqual(1);
    expect(sigIntCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("shutdown handler calls flushServerErrors", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    await register();

    // Find the SIGTERM handler we registered
    const sigTermCall = processOnSpy.mock.calls.find(
      ([event]: [string, ...unknown[]]) => event === "SIGTERM",
    );
    expect(sigTermCall).toBeDefined();

    const handler = sigTermCall![1] as () => void;

    vi.useFakeTimers();
    handler();

    // flushServerErrors should have been called
    expect(mockFlushServerErrors).toHaveBeenCalledTimes(1);

    // After flush resolves, process.exit should be called
    await mockFlushServerErrors();
    // Allow promise chain to resolve
    await vi.advanceTimersByTimeAsync(0);

    expect(processExitSpy).toHaveBeenCalledWith(0);
    vi.useRealTimers();
  });

  it("does not initialize console capture on edge runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    await register();
    expect(mockInitializeServerConsoleCapture).not.toHaveBeenCalled();
  });

  it("starts vibe watcher only in development", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    (process.env as Record<string, string>)["NODE_ENV"] = "development";
    await register();
    expect(mockStartVibeWatcher).toHaveBeenCalledTimes(1);
  });

  it("does not start vibe watcher in production", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    (process.env as Record<string, string>)["NODE_ENV"] = "production";
    await register();
    expect(mockStartVibeWatcher).not.toHaveBeenCalled();
  });
});
