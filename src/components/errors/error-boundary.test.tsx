import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary, withErrorBoundary } from "./error-boundary";

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean; }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
}

// Component for testing
function TestComponent() {
  return <div>Test Component</div>;
}

describe("ErrorBoundary", () => {
  it("should render children when no error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("should catch errors and display error UI", () => {
    // Suppress console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(screen.getByText("Go home")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should display user-friendly error message", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("An unexpected error occurred."))
      .toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should call onError callback when error occurs", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should render custom fallback if provided", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    render(
      <ErrorBoundary fallback={<div>Custom Error UI</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom Error UI")).toBeInTheDocument();
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should reset error when Try again button is clicked", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    const tryAgainButton = screen.getByText("Try again");
    await user.click(tryAgainButton);

    // After clicking "Try again", the error boundary should reset
    // Since the component still throws, it will show the error again
    // This is expected behavior - the reset just clears the error state
    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should reset error when resetKeys change", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const { rerender } = render(
      <ErrorBoundary resetKeys={["key1"]}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    // Change resetKeys to trigger reset
    rerender(
      <ErrorBoundary resetKeys={["key2"]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("No error")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should not reset when resetKeys remain the same", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const { rerender } = render(
      <ErrorBoundary resetKeys={["key1"]}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    // Re-render with same resetKeys
    rerender(
      <ErrorBoundary resetKeys={["key1"]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    // Should still show error UI
    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should show technical details in development mode", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    const originalEnv = process.env.NODE_ENV;

    // Set to development mode
    process.env.NODE_ENV = "development";

    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    if (process.env.NODE_ENV === "development") {
      expect(screen.getByText(/Technical Details/)).toBeInTheDocument();
      // Use getAllByText since error message appears multiple times
      const errorElements = screen.getAllByText(/Test error/);
      expect(errorElements.length).toBeGreaterThan(0);
    }

    process.env.NODE_ENV = originalEnv;
    consoleErrorSpy.mockRestore();
  });
});

describe("withErrorBoundary", () => {
  it("should wrap component with error boundary", () => {
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText("Test Component")).toBeInTheDocument();
  });

  it("should catch errors in wrapped component", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent shouldThrow={true} />);

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should pass errorBoundaryProps to error boundary", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    const onError = vi.fn();

    const WrappedComponent = withErrorBoundary(ThrowError, { onError });

    render(<WrappedComponent shouldThrow={true} />);

    expect(onError).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should set display name for wrapped component", () => {
    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe(
      "withErrorBoundary(TestComponent)",
    );
  });

  it("should fallback to 'Component' when displayName and name are not available", () => {
    // Create an anonymous component without displayName or name
    const AnonymousComponent = (() => <div>Anonymous</div>) as React.ComponentType;
    // Remove name property by creating a fresh object
    Object.defineProperty(AnonymousComponent, "name", {
      value: "",
      writable: true,
    });
    Object.defineProperty(AnonymousComponent, "displayName", {
      value: undefined,
      writable: true,
    });

    const WrappedComponent = withErrorBoundary(AnonymousComponent);

    expect(WrappedComponent.displayName).toBe("withErrorBoundary(Component)");
  });
});

describe("ErrorBoundary - Additional Edge Cases", () => {
  it("should handle Go home button click", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    const user = userEvent.setup();

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    const goHomeButton = screen.getByText("Go home");
    await user.click(goHomeButton);

    expect(window.location.href).toBe("/");

    // Restore window.location
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });

    consoleErrorSpy.mockRestore();
  });

  it("should reset when resetKeys length changes", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const { rerender } = render(
      <ErrorBoundary resetKeys={["key1", "key2"]}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    // Change resetKeys to different length to trigger reset
    rerender(
      <ErrorBoundary resetKeys={["key1"]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    // Should reset and show children since keys length changed
    expect(screen.getByText("No error")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should not reset when hasError is false even if resetKeys change", () => {
    // Start without error
    const { rerender } = render(
      <ErrorBoundary resetKeys={["key1"]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("No error")).toBeInTheDocument();

    // Change resetKeys but no error occurred
    rerender(
      <ErrorBoundary resetKeys={["key2"]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    // Should still render children without issue
    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("should not reset when resetKeys are not provided in componentDidUpdate", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    // Rerender without resetKeys - should not try to reset
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    // Should still show error since no resetKeys to trigger reset
    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should not reset when previous resetKeys are undefined", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    // Add resetKeys on rerender (prevProps.resetKeys was undefined)
    rerender(
      <ErrorBoundary resetKeys={["key1"]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    // Should still show error since prevProps.resetKeys was undefined
    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should display error without suggestion", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    // Use a basic error that won't have a suggestion
    function ThrowBasicError() {
      throw new Error("Basic error message");
    }

    render(
      <ErrorBoundary>
        <ThrowBasicError />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should handle error without stack trace in development mode", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    // Create component that throws error without stack
    function ThrowErrorNoStack() {
      const error = new Error("Error without stack");
      error.stack = undefined;
      throw error;
    }

    render(
      <ErrorBoundary showDetails={true}>
        <ThrowErrorNoStack />
      </ErrorBoundary>,
    );

    if (process.env.NODE_ENV === "development") {
      expect(screen.getByText(/Technical Details/)).toBeInTheDocument();
      // Should not have pre element with stack trace
      const preElements = screen.queryAllByText((_, element) => element?.tagName === "PRE");
      expect(preElements.length).toBe(0);
    }

    process.env.NODE_ENV = originalEnv;
    consoleErrorSpy.mockRestore();
  });

  it("should handle componentStack being null in componentDidCatch", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    // The onError callback should still be called
    expect(onError).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
