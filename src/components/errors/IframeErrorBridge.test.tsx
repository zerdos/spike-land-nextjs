import * as consoleCaptureModule from "@/lib/errors/console-capture.client";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IframeErrorBridge } from "./IframeErrorBridge";

vi.mock("@/lib/errors/console-capture.client", () => ({
  reportErrorBoundary: vi.fn(),
}));

describe("IframeErrorBridge", () => {
  const addEventListenerSpy = vi.spyOn(window, "addEventListener");
  const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    addEventListenerSpy.mockClear();
    removeEventListenerSpy.mockClear();
  });

  it("should register a message event listener on mount", () => {
    render(<IframeErrorBridge />);

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function),
    );
  });

  it("should remove the message event listener on unmount", () => {
    const { unmount } = render(<IframeErrorBridge />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function),
    );
  });

  it("should report error when receiving valid iframe-error from allowed origin", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message",
    )![1] as EventListener;

    handler(
      new MessageEvent("message", {
        origin: "https://testing.spike.land",
        data: {
          type: "iframe-error",
          message: "Component crashed",
          stack: "Error: Component crashed\n    at Foo",
          componentStack: "\n    in Foo\n    in App",
          codeSpace: "test-space",
        },
      }),
    );

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(1);
    const [error, componentStack] = (
      consoleCaptureModule.reportErrorBoundary as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Component crashed");
    expect(error.stack).toBe("Error: Component crashed\n    at Foo");
    expect(componentStack).toBe("\n    in Foo\n    in App");
  });

  it("should report error from localhost origin", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message",
    )![1] as EventListener;

    handler(
      new MessageEvent("message", {
        origin: "http://localhost:3000",
        data: {
          type: "iframe-error",
          message: "Local error",
        },
      }),
    );

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(1);
  });

  it("should ignore messages from disallowed origins", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message",
    )![1] as EventListener;

    handler(
      new MessageEvent("message", {
        origin: "https://evil.com",
        data: {
          type: "iframe-error",
          message: "Injected error",
        },
      }),
    );

    expect(consoleCaptureModule.reportErrorBoundary).not.toHaveBeenCalled();
  });

  it("should ignore messages without iframe-error type", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message",
    )![1] as EventListener;

    handler(
      new MessageEvent("message", {
        origin: "https://testing.spike.land",
        data: { type: "other-message", message: "Not an error" },
      }),
    );

    expect(consoleCaptureModule.reportErrorBoundary).not.toHaveBeenCalled();
  });

  it("should ignore messages with non-object data", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message",
    )![1] as EventListener;

    handler(
      new MessageEvent("message", {
        origin: "https://testing.spike.land",
        data: "just a string",
      }),
    );

    expect(consoleCaptureModule.reportErrorBoundary).not.toHaveBeenCalled();
  });

  it("should ignore messages with null data", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message",
    )![1] as EventListener;

    handler(
      new MessageEvent("message", {
        origin: "https://testing.spike.land",
        data: null,
      }),
    );

    expect(consoleCaptureModule.reportErrorBoundary).not.toHaveBeenCalled();
  });

  it("should handle error without stack trace", () => {
    render(<IframeErrorBridge />);

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message",
    )![1] as EventListener;

    handler(
      new MessageEvent("message", {
        origin: "https://testing.spike.land",
        data: {
          type: "iframe-error",
          message: "No stack",
        },
      }),
    );

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(1);
    const [error] = (
      consoleCaptureModule.reportErrorBoundary as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(error.message).toBe("No stack");
  });

  it("should render null", () => {
    const { container } = render(<IframeErrorBridge />);
    expect(container.innerHTML).toBe("");
  });
});
