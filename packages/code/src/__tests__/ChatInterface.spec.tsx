import type { ICode } from "@/lib/interfaces";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatInterface } from "../ChatInterface";

// Mock ICode interface
const mockCodeSession: ICode = {
  getCodeSpace: vi.fn().mockReturnValue("test-space"),
  getSession: vi.fn().mockResolvedValue({}),
} as unknown as ICode;

describe("ChatInterface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <ChatInterface
        isOpen={false}
        codeSession={mockCodeSession}
        codeSpace="test-space"
        onClose={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render placeholder when isOpen is true", () => {
    render(
      <ChatInterface
        isOpen={true}
        codeSession={mockCodeSession}
        codeSpace="test-space"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId("chat-interface-placeholder")).toBeInTheDocument();
    expect(screen.getByText("Assistant")).toBeInTheDocument();
    expect(
      screen.getByText("Chat assistant is being updated. Please check back later."),
    ).toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", () => {
    const onCloseMock = vi.fn();

    render(
      <ChatInterface
        isOpen={true}
        codeSession={mockCodeSession}
        codeSpace="test-space"
        onClose={onCloseMock}
      />,
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledOnce();
  });

  it("should have proper accessibility attributes", () => {
    render(
      <ChatInterface
        isOpen={true}
        codeSession={mockCodeSession}
        codeSpace="test-space"
        onClose={vi.fn()}
      />,
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    expect(closeButton).toHaveAttribute("aria-label", "Close");
  });

  it("should apply responsive width classes", () => {
    render(
      <ChatInterface
        isOpen={true}
        codeSession={mockCodeSession}
        codeSpace="test-space"
        onClose={vi.fn()}
      />,
    );

    const container = screen.getByTestId("chat-interface-placeholder");
    expect(container).toHaveClass("w-full");
    expect(container).toHaveClass("sm:w-[400px]");
    expect(container).toHaveClass("md:w-[512px]");
  });
});
