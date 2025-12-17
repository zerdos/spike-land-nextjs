import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./copy-button";

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe("CopyButton", () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    vi.useFakeTimers();
  });

  it("should render with Copy text initially", () => {
    render(<CopyButton text="test" />);
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("should copy text to clipboard when clicked", async () => {
    vi.useRealTimers();
    render(<CopyButton text="https://example.com" />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith("https://example.com");
    });
  });

  it("should show Copied text after clicking", async () => {
    vi.useRealTimers();
    render(<CopyButton text="test" />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
  });

  it("should reset to Copy after timeout", async () => {
    vi.useRealTimers();
    render(<CopyButton text="test" />);

    fireEvent.click(screen.getByRole("button"));

    // Verify it shows Copied initially
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
    render(<CopyButton text="test" className="custom-class" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });
});
