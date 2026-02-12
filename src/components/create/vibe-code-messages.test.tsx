import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VibeMessage } from "./vibe-code-provider";

const mockMessages: VibeMessage[] = [];
let mockAgentStage: string | null = null;
let mockIsStreaming = false;

const mockSendMessage = vi.fn();

vi.mock("./vibe-code-provider", () => ({
  useVibeCode: () => ({
    messages: mockMessages,
    agentStage: mockAgentStage,
    isStreaming: mockIsStreaming,
    sendMessage: mockSendMessage,
  }),
}));

vi.mock("@/components/my-apps/AgentProgressIndicator", () => ({
  AgentProgressIndicator: ({
    stage,
    isVisible,
    startTime,
  }: {
    stage: string | null;
    isVisible: boolean;
    startTime: number;
  }) =>
    isVisible ? (
      <div data-testid="agent-progress" data-stage={stage} data-start-time={startTime}>
        Progress
      </div>
    ) : null,
}));

import { VibeCodeMessages } from "./vibe-code-messages";

describe("VibeCodeMessages", () => {
  beforeEach(() => {
    mockMessages.length = 0;
    mockAgentStage = null;
    mockIsStreaming = false;
  });

  it("renders empty state when no messages", () => {
    render(<VibeCodeMessages />);
    expect(
      screen.getByText("What would you like to change?"),
    ).toBeInTheDocument();
  });

  it("renders user messages right-aligned", () => {
    mockMessages.push({
      id: "msg-1",
      role: "user",
      content: "Hello agent",
      timestamp: Date.now(),
    });

    render(<VibeCodeMessages />);
    expect(screen.getByText("Hello agent")).toBeInTheDocument();
  });

  it("renders agent messages with markdown", () => {
    mockMessages.push({
      id: "msg-1",
      role: "agent",
      content: "This is **bold** and *italic*",
      timestamp: Date.now(),
    });

    const { container } = render(<VibeCodeMessages />);
    expect(container.querySelector("strong")).toBeInTheDocument();
    expect(container.querySelector("strong")!.textContent).toBe("bold");
    expect(container.querySelector("em")).toBeInTheDocument();
    expect(container.querySelector("em")!.textContent).toBe("italic");
  });

  it("renders agent messages with inline code", () => {
    mockMessages.push({
      id: "msg-1",
      role: "agent",
      content: "Use `console.log()` for debugging",
      timestamp: Date.now(),
    });

    const { container } = render(<VibeCodeMessages />);
    const code = container.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code!.textContent).toBe("console.log()");
  });

  it("renders agent messages with code blocks", () => {
    mockMessages.push({
      id: "msg-1",
      role: "agent",
      content: "```js\nconst x = 1;\n```",
      timestamp: Date.now(),
    });

    const { container } = render(<VibeCodeMessages />);
    expect(container.querySelector("pre")).toBeInTheDocument();
    expect(container.querySelector("pre code")!.textContent).toBe(
      "const x = 1;\n",
    );
  });

  it("renders image thumbnails in messages", () => {
    mockMessages.push({
      id: "msg-1",
      role: "user",
      content: "See this",
      images: ["data:image/png;base64,abc123"],
      timestamp: Date.now(),
    });

    render(<VibeCodeMessages />);
    const img = screen.getByAltText("Attachment 1");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc123");
  });

  it("renders multiple images", () => {
    mockMessages.push({
      id: "msg-1",
      role: "user",
      content: "images",
      images: ["data:image/png;base64,aaa", "data:image/png;base64,bbb"],
      timestamp: Date.now(),
    });

    render(<VibeCodeMessages />);
    expect(screen.getByAltText("Attachment 1")).toBeInTheDocument();
    expect(screen.getByAltText("Attachment 2")).toBeInTheDocument();
  });

  it("shows AgentProgressIndicator when streaming", () => {
    mockMessages.push({
      id: "msg-1",
      role: "user",
      content: "test",
      timestamp: Date.now(),
    });
    mockIsStreaming = true;
    mockAgentStage = "processing";

    render(<VibeCodeMessages />);
    const progress = screen.getByTestId("agent-progress");
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute("data-stage", "processing");
  });

  it("does not show AgentProgressIndicator when not streaming", () => {
    mockMessages.push({
      id: "msg-1",
      role: "user",
      content: "test",
      timestamp: Date.now(),
    });
    mockIsStreaming = false;
    mockAgentStage = null;

    render(<VibeCodeMessages />);
    expect(screen.queryByTestId("agent-progress")).not.toBeInTheDocument();
  });

  it("passes stable startTime to AgentProgressIndicator", () => {
    // Use fake timers so Date.now() is deterministic across renders
    vi.useFakeTimers({ now: 1000000 });
    mockIsStreaming = true;
    mockAgentStage = "processing";

    const { rerender } = render(<VibeCodeMessages />);
    const progress1 = screen.getByTestId("agent-progress");
    const startTime1 = Number(progress1.getAttribute("data-start-time"));
    expect(startTime1).toBe(1000000);

    // Advance time to prove the ref is stable (not re-assigned on rerender)
    vi.advanceTimersByTime(500);

    // Re-render should keep same startTime
    rerender(<VibeCodeMessages />);
    const progress2 = screen.getByTestId("agent-progress");
    const startTime2 = Number(progress2.getAttribute("data-start-time"));
    expect(startTime2).toBe(startTime1);

    vi.useRealTimers();
  });

  it("resets startTime when streaming restarts", () => {
    // Use fake timers to make timestamps deterministic
    vi.useFakeTimers({ now: 1000000 });
    mockIsStreaming = true;
    mockAgentStage = "processing";

    const { rerender } = render(<VibeCodeMessages />);
    const progress1 = screen.getByTestId("agent-progress");
    const startTime1 = Number(progress1.getAttribute("data-start-time"));
    expect(startTime1).toBe(1000000);

    // Stop streaming
    mockIsStreaming = false;
    mockAgentStage = null;
    rerender(<VibeCodeMessages />);

    // Advance time so the new startTime is clearly different
    vi.advanceTimersByTime(5000);

    // Start streaming again
    mockIsStreaming = true;
    mockAgentStage = "initialize";
    rerender(<VibeCodeMessages />);
    const progress3 = screen.getByTestId("agent-progress");
    const startTime3 = Number(progress3.getAttribute("data-start-time"));
    // New start time should reflect the advanced clock
    expect(startTime3).toBe(1005000);
    expect(startTime3).not.toBe(startTime1);

    vi.useRealTimers();
  });

  it("does not render empty state when messages exist", () => {
    mockMessages.push({
      id: "msg-1",
      role: "user",
      content: "hello",
      timestamp: Date.now(),
    });

    render(<VibeCodeMessages />);
    expect(
      screen.queryByText("What would you like to change?"),
    ).not.toBeInTheDocument();
  });

  it("renders messages without images (no images property)", () => {
    mockMessages.push({
      id: "msg-1",
      role: "user",
      content: "no images here",
      timestamp: Date.now(),
    });

    render(<VibeCodeMessages />);
    expect(screen.getByText("no images here")).toBeInTheDocument();
    expect(screen.queryByAltText(/Attachment/)).not.toBeInTheDocument();
  });

  it("renders messages with empty images array", () => {
    mockMessages.push({
      id: "msg-1",
      role: "user",
      content: "empty images",
      images: [],
      timestamp: Date.now(),
    });

    render(<VibeCodeMessages />);
    expect(screen.getByText("empty images")).toBeInTheDocument();
    expect(screen.queryByAltText(/Attachment/)).not.toBeInTheDocument();
  });

  it("escapes HTML in agent code blocks", () => {
    mockMessages.push({
      id: "msg-1",
      role: "agent",
      content: '```\n<div class="test">&amp;</div>\n```',
      timestamp: Date.now(),
    });

    const { container } = render(<VibeCodeMessages />);
    const codeBlock = container.querySelector("pre code");
    expect(codeBlock).toBeInTheDocument();
    // Should escape the HTML
    expect(codeBlock!.innerHTML).toContain("&lt;div");
    expect(codeBlock!.innerHTML).toContain("&amp;amp;");
  });
});
