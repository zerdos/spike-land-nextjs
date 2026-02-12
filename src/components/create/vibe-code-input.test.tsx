import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockSendMessage = vi.fn();
let mockIsStreaming = false;

vi.mock("./vibe-code-provider", () => ({
  useVibeCode: () => ({
    sendMessage: mockSendMessage,
    isStreaming: mockIsStreaming,
  }),
}));

vi.mock("lucide-react", () => ({
  Camera: ({ className }: { className?: string }) => (
    <span data-testid="camera-icon" className={className} />
  ),
  ImagePlus: ({ className }: { className?: string }) => (
    <span data-testid="image-plus-icon" className={className} />
  ),
  Send: ({ className }: { className?: string }) => (
    <span data-testid="send-icon" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <span data-testid="x-icon" className={className} />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

// Mock URL.createObjectURL and revokeObjectURL
const originalURL = globalThis.URL;
vi.stubGlobal("URL", class MockURL extends originalURL {
  constructor(url: string | URL, base?: string | URL) {
    super(url, base);
  }
  static createObjectURL = vi.fn(() => "blob:test-url");
  static revokeObjectURL = vi.fn();
});

import { VibeCodeInput } from "./vibe-code-input";

describe("VibeCodeInput", () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockIsStreaming = false;
  });

  it("renders textarea and buttons", () => {
    render(<VibeCodeInput />);

    expect(
      screen.getByPlaceholderText("Describe changes..."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Attach image")).toBeInTheDocument();
    expect(screen.getByLabelText("Include screenshot")).toBeInTheDocument();
    expect(screen.getByLabelText("Send message")).toBeInTheDocument();
  });

  it("send button is disabled when textarea is empty", () => {
    render(<VibeCodeInput />);

    const sendBtn = screen.getByLabelText("Send message");
    expect(sendBtn).toBeDisabled();
  });

  it("send button is disabled when streaming", () => {
    mockIsStreaming = true;
    render(<VibeCodeInput />);

    const textarea = screen.getByPlaceholderText("Describe changes...");
    fireEvent.change(textarea, { target: { value: "hello" } });

    const sendBtn = screen.getByLabelText("Send message");
    expect(sendBtn).toBeDisabled();
  });

  it("calls sendMessage on button click with text", () => {
    render(<VibeCodeInput />);

    const textarea = screen.getByPlaceholderText("Describe changes...");
    fireEvent.change(textarea, { target: { value: "Make it blue" } });

    const sendBtn = screen.getByLabelText("Send message");
    fireEvent.click(sendBtn);

    expect(mockSendMessage).toHaveBeenCalledWith(
      "Make it blue",
      undefined,
      false,
    );
  });

  it("clears textarea after sending", () => {
    render(<VibeCodeInput />);

    const textarea = screen.getByPlaceholderText(
      "Describe changes...",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "hello" } });
    expect(textarea.value).toBe("hello");

    fireEvent.click(screen.getByLabelText("Send message"));
    expect(textarea.value).toBe("");
  });

  it("sends on Enter key press", () => {
    render(<VibeCodeInput />);

    const textarea = screen.getByPlaceholderText("Describe changes...");
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(mockSendMessage).toHaveBeenCalledWith("test", undefined, false);
  });

  it("does not send on Shift+Enter", () => {
    render(<VibeCodeInput />);

    const textarea = screen.getByPlaceholderText("Describe changes...");
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("does not send empty or whitespace-only text", () => {
    render(<VibeCodeInput />);

    const textarea = screen.getByPlaceholderText("Describe changes...");
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.click(screen.getByLabelText("Send message"));

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("toggles screenshot option", () => {
    render(<VibeCodeInput />);

    const screenshotBtn = screen.getByLabelText("Include screenshot");

    // Initially off — click to turn on
    fireEvent.click(screenshotBtn);

    // Now send
    const textarea = screen.getByPlaceholderText("Describe changes...");
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    expect(mockSendMessage).toHaveBeenCalledWith("test", undefined, true);
  });

  it("handles file upload", () => {
    render(<VibeCodeInput />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["img-data"], "test.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Should show image thumbnail
    const thumbnail = screen.getByAltText("Attachment");
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute("src", "blob:test-url");
  });

  it("removes uploaded image", () => {
    render(<VibeCodeInput />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["img-data"], "test.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByAltText("Attachment")).toBeInTheDocument();

    const removeBtn = screen.getByLabelText("Remove image");
    fireEvent.click(removeBtn);

    expect(screen.queryByAltText("Attachment")).not.toBeInTheDocument();
  });

  it("opens file picker when attach button is clicked", () => {
    render(<VibeCodeInput />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    fireEvent.click(screen.getByLabelText("Attach image"));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("sends with images when files are attached", () => {
    render(<VibeCodeInput />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["data"], "test.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const textarea = screen.getByPlaceholderText("Describe changes...");
    fireEvent.change(textarea, { target: { value: "with image" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    expect(mockSendMessage).toHaveBeenCalledWith(
      "with image",
      [file],
      false,
    );
  });

  it("clears images after sending", () => {
    render(<VibeCodeInput />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["data"], "test.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByAltText("Attachment")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("Describe changes...");
    fireEvent.change(textarea, { target: { value: "send" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    expect(screen.queryByAltText("Attachment")).not.toBeInTheDocument();
  });

  it("handles file input with no files", () => {
    render(<VibeCodeInput />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: null } });

    // Should not crash, no images shown
    expect(screen.queryByAltText("Attachment")).not.toBeInTheDocument();
  });

  it("does not send when Enter pressed but text is empty", () => {
    render(<VibeCodeInput />);

    const textarea = screen.getByPlaceholderText("Describe changes...");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("does not send when streaming even with text", () => {
    mockIsStreaming = true;
    render(<VibeCodeInput />);

    const textarea = screen.getByPlaceholderText("Describe changes...");
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
