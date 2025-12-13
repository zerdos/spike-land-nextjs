import { BoxMessageRole, BoxStatus } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentControlPanel } from "./agent-control-panel";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("AgentControlPanel", () => {
  const mockBox = {
    id: "box-1",
    name: "Test Box",
    description: "Test description",
    status: BoxStatus.RUNNING,
    connectionUrl: "https://example.com/vnc",
    messages: [
      {
        id: "msg-1",
        role: BoxMessageRole.USER,
        content: "Hello",
        createdAt: new Date("2025-01-01"),
      },
      {
        id: "msg-2",
        role: BoxMessageRole.AGENT,
        content: "Hi there!",
        createdAt: new Date("2025-01-01"),
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  it("renders the component with chat and live session panels", () => {
    render(<AgentControlPanel box={mockBox} />);

    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Live Session")).toBeInTheDocument();
  });

  it("displays existing messages", () => {
    render(<AgentControlPanel box={mockBox} />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  it("displays box status with correct badge", () => {
    render(<AgentControlPanel box={mockBox} />);

    expect(screen.getByText("RUNNING")).toBeInTheDocument();
  });

  it("renders iframe when connectionUrl is provided", () => {
    render(<AgentControlPanel box={mockBox} />);

    const iframe = screen.getByTitle("Live Session");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", "https://example.com/vnc");
  });

  it("shows connecting message when connectionUrl is not provided", () => {
    const boxWithoutUrl = { ...mockBox, connectionUrl: undefined };
    render(<AgentControlPanel box={boxWithoutUrl} />);

    expect(screen.getByText("Connecting to session...")).toBeInTheDocument();
  });

  it("allows user to type and send a message", async () => {
    const mockResponse = {
      userMessage: {
        id: "msg-3",
        role: BoxMessageRole.USER,
        content: "New message",
        createdAt: new Date().toISOString(),
      },
      agentMessage: {
        id: "msg-4",
        role: BoxMessageRole.AGENT,
        content: "Message received. This is a placeholder response.",
        createdAt: new Date().toISOString(),
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<AgentControlPanel box={mockBox} />);

    const textarea = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /send message/i });

    fireEvent.change(textarea, { target: { value: "New message" } });
    expect(textarea).toHaveValue("New message");

    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText("New message")).toBeInTheDocument();
    });

    expect(textarea).toHaveValue("");
  });

  it("sends message on Enter key press", async () => {
    const mockResponse = {
      userMessage: {
        id: "msg-5",
        role: BoxMessageRole.USER,
        content: "Enter message",
        createdAt: new Date().toISOString(),
      },
      agentMessage: {
        id: "msg-6",
        role: BoxMessageRole.AGENT,
        content: "Message received. This is a placeholder response.",
        createdAt: new Date().toISOString(),
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<AgentControlPanel box={mockBox} />);

    const textarea = screen.getByPlaceholderText("Type your message...");

    fireEvent.change(textarea, { target: { value: "Enter message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(screen.getByText("Enter message")).toBeInTheDocument();
    });
  });

  it("does not send message on Shift+Enter", () => {
    render(<AgentControlPanel box={mockBox} />);

    const textarea = screen.getByPlaceholderText("Type your message...");

    fireEvent.change(textarea, { target: { value: "Shift enter" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(textarea).toHaveValue("Shift enter");
  });

  it("does not send empty messages", () => {
    render(<AgentControlPanel box={mockBox} />);

    const sendButton = screen.getByRole("button", { name: /send message/i });
    const initialMessageCount = screen.getAllByText(/Hello|Hi there!/).length;

    fireEvent.click(sendButton);

    const currentMessageCount = screen.getAllByText(/Hello|Hi there!/).length;
    expect(currentMessageCount).toBe(initialMessageCount);
  });

  it("shows typing indicator after sending a message", async () => {
    const mockResponse = {
      userMessage: {
        id: "msg-7",
        role: BoxMessageRole.USER,
        content: "Test",
        createdAt: new Date().toISOString(),
      },
      agentMessage: {
        id: "msg-8",
        role: BoxMessageRole.AGENT,
        content: "Message received. This is a placeholder response.",
        createdAt: new Date().toISOString(),
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<AgentControlPanel box={mockBox} />);

    const textarea = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /send message/i });

    fireEvent.change(textarea, { target: { value: "Test" } });
    fireEvent.click(sendButton);

    expect(screen.getByText("Typing...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Typing...")).not.toBeInTheDocument();
    });
  });

  it("shows agent response after typing", async () => {
    const mockResponse = {
      userMessage: {
        id: "msg-9",
        role: BoxMessageRole.USER,
        content: "Test",
        createdAt: new Date().toISOString(),
      },
      agentMessage: {
        id: "msg-10",
        role: BoxMessageRole.AGENT,
        content: "Message received. This is a placeholder response.",
        createdAt: new Date().toISOString(),
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<AgentControlPanel box={mockBox} />);

    const textarea = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /send message/i });

    fireEvent.change(textarea, { target: { value: "Test" } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText("Message received. This is a placeholder response."),
      ).toBeInTheDocument();
    });
  });

  it("renders control buttons", () => {
    render(<AgentControlPanel box={mockBox} />);

    expect(
      screen.getByRole("button", { name: /pause agent/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /restart agent/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /debug agent/i }),
    ).toBeInTheDocument();
  });

  it("calls toast and API when Pause button is clicked", async () => {
    // Mock window.location.reload
    delete (window as any).location;
    window.location = { reload: vi.fn() } as any;

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, box: mockBox }),
    });

    render(<AgentControlPanel box={mockBox} />);

    const pauseButton = screen.getByRole("button", { name: /pause agent/i });
    fireEvent.click(pauseButton);

    expect(toast.info).toHaveBeenCalledWith("Pausing agent...");

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Agent paused successfully");
    });
  });

  it("calls toast and API when Restart button is clicked", async () => {
    // Mock window.location.reload
    delete (window as any).location;
    window.location = { reload: vi.fn() } as any;

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, box: mockBox }),
    });

    render(<AgentControlPanel box={mockBox} />);

    const restartButton = screen.getByRole("button", { name: /restart agent/i });
    fireEvent.click(restartButton);

    expect(toast.info).toHaveBeenCalledWith("Restarting agent...");

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Agent restarted successfully",
      );
    });
  });

  it("displays correct status color for RUNNING status", () => {
    render(<AgentControlPanel box={mockBox} />);

    const statusIndicator = screen.getByText("RUNNING").previousSibling;
    expect(statusIndicator).toHaveClass("bg-green-500");
  });

  it("displays correct status color for STOPPED status", () => {
    const stoppedBox = { ...mockBox, status: BoxStatus.STOPPED };
    render(<AgentControlPanel box={stoppedBox} />);

    const statusIndicator = screen.getByText("STOPPED").previousSibling;
    expect(statusIndicator).toHaveClass("bg-red-500");
  });

  it("displays correct status color for STARTING status", () => {
    const startingBox = { ...mockBox, status: BoxStatus.STARTING };
    render(<AgentControlPanel box={startingBox} />);

    const statusIndicator = screen.getByText("STARTING").previousSibling;
    expect(statusIndicator).toHaveClass("bg-blue-500");
  });

  it("displays correct status color for ERROR status", () => {
    const errorBox = { ...mockBox, status: BoxStatus.ERROR };
    render(<AgentControlPanel box={errorBox} />);

    const statusIndicator = screen.getByText("ERROR").previousSibling;
    expect(statusIndicator).toHaveClass("bg-red-600");
  });

  it("displays correct status color for PAUSED status", () => {
    const pausedBox = { ...mockBox, status: "PAUSED" as const };
    render(<AgentControlPanel box={pausedBox} />);

    const statusIndicator = screen.getByText("PAUSED").previousSibling;
    expect(statusIndicator).toHaveClass("bg-yellow-500");
  });

  it("renders with no messages", () => {
    const boxWithoutMessages = { ...mockBox, messages: [] };
    render(<AgentControlPanel box={boxWithoutMessages} />);

    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("handles messages without the messages prop", () => {
    const { messages: _messages, ...boxWithoutMessagesProp } = mockBox;
    render(<AgentControlPanel box={boxWithoutMessagesProp as typeof mockBox} />);

    expect(screen.getByText("Chat")).toBeInTheDocument();
  });
});
