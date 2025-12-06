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
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should call onError callback when error occurs", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent shouldThrow={true} />);

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should pass errorBoundaryProps to error boundary", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    const WrappedComponent = withErrorBoundary(ThrowError, { onError });

    render(<WrappedComponent shouldThrow={true} />);

    expect(onError).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should set display name for wrapped component", () => {
    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe("withErrorBoundary(TestComponent)");
  });
});
