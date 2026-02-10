import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IframeErrorBridge } from "./IframeErrorBridge";

const mockSendBeacon = vi.fn().mockReturnValue(true);
Object.defineProperty(navigator, "sendBeacon", {
  value: mockSendBeacon,
  writable: true,
  configurable: true,
});

describe("IframeErrorBridge", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("should render nothing", () => {
    const { container } = render(<IframeErrorBridge />);
    expect(container.innerHTML).toBe("");
  });

  it("should add message event listener on mount", () => {
    render(<IframeErrorBridge />);
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function),
    );
  });

  it("should remove event listener on unmount", () => {
    const { unmount } = render(<IframeErrorBridge />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function),
    );
  });

  it("should report code-editor-error messages from allowed origins", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === "message",
    )?.[1] as EventListener;

    const event = new MessageEvent("message", {
      data: {
        type: "code-editor-error",
        payload: {
          message: "Test error",
          stack: "Error: Test\n  at test.ts:1",
        },
      },
      origin: "https://testing.spike.land",
    });

    handler(event);

    expect(mockSendBeacon).toHaveBeenCalledWith(
      "/api/errors/report",
      expect.any(Blob),
    );
  });

  it("should ignore messages from unknown origins", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === "message",
    )?.[1] as EventListener;

    const event = new MessageEvent("message", {
      data: {
        type: "code-editor-error",
        payload: { message: "Test error" },
      },
      origin: "https://evil.example.com",
    });

    handler(event);

    expect(mockSendBeacon).not.toHaveBeenCalled();
  });

  it("should ignore messages that are not code-editor-error type", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === "message",
    )?.[1] as EventListener;

    const event = new MessageEvent("message", {
      data: { type: "other-message" },
      origin: "https://testing.spike.land",
    });

    handler(event);

    expect(mockSendBeacon).not.toHaveBeenCalled();
  });

  it("should accept messages from localhost origins", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === "message",
    )?.[1] as EventListener;

    const event = new MessageEvent("message", {
      data: {
        type: "code-editor-error",
        payload: { message: "Local error" },
      },
      origin: "http://localhost:5173",
    });

    handler(event);

    expect(mockSendBeacon).toHaveBeenCalled();
  });

  it("should not throw if sendBeacon fails", () => {
    mockSendBeacon.mockImplementation(() => {
      throw new Error("sendBeacon failed");
    });

    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === "message",
    )?.[1] as EventListener;

    const event = new MessageEvent("message", {
      data: {
        type: "code-editor-error",
        payload: { message: "Error" },
      },
      origin: "https://testing.spike.land",
    });

    expect(() => handler(event)).not.toThrow();
  });
});
