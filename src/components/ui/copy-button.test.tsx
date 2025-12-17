import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./copy-button";

describe("CopyButton", () => {
  const mockWriteText = vi.fn();

  beforeEach(() => {
    mockWriteText.mockReset();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render with Copy text initially", () => {
    mockWriteText.mockResolvedValue(undefined);
    render(<CopyButton text="test" />);
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("should copy text to clipboard when clicked", async () => {
    mockWriteText.mockResolvedValue(undefined);
    render(<CopyButton text="https://example.com" />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith("https://example.com");
    });
  });

  it("should show Copied text after successful copy", async () => {
    mockWriteText.mockResolvedValue(undefined);
    render(<CopyButton text="test" />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
  });

  it("should reset to Copy after timeout", async () => {
    mockWriteText.mockResolvedValue(undefined);
    render(<CopyButton text="test" />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });

    // Wait for reset (2 seconds + buffer)
    await waitFor(
      () => {
        expect(screen.getByText("Copy")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should accept custom className", () => {
    mockWriteText.mockResolvedValue(undefined);
    render(<CopyButton text="test" className="custom-class" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should show Failed state when clipboard write fails", async () => {
    mockWriteText.mockRejectedValue(new Error("Permission denied"));
    render(<CopyButton text="test" />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });

  it("should reset to Copy after error timeout", async () => {
    mockWriteText.mockRejectedValue(new Error("Permission denied"));
    render(<CopyButton text="test" />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    // Wait for reset (2 seconds + buffer)
    await waitFor(
      () => {
        expect(screen.getByText("Copy")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should handle missing clipboard API", async () => {
    // Remove clipboard API
    Object.assign(navigator, { clipboard: undefined });
    render(<CopyButton text="test" />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });
});
