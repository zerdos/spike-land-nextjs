import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AgentControlPanel } from "./agent-control-panel";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AgentControlPanel", () => {
  const mockBox = {
    id: "box-1",
    name: "Test Box",
    description: "Test description",
    status: "RUNNING" as const,
    connectionUrl: "https://example.com/vnc",
    messages: [
      {
        id: "msg-1",
        role: "USER" as const,
        content: "Hello",
        createdAt: new Date("2025-01-01"),
      },
      {
        id: "msg-2",
        role: "AGENT" as const,
        content: "Hi there!",
        createdAt: new Date("2025-01-01"),
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
    render(<AgentControlPanel box={mockBox} />);

    const textarea = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(textarea, { target: { value: "New message" } });
    expect(textarea).toHaveValue("New message");

    fireEvent.click(sendButton);

    expect(screen.getByText("New message")).toBeInTheDocument();
    expect(textarea).toHaveValue("");
  });

  it("sends message on Enter key press", async () => {
    render(<AgentControlPanel box={mockBox} />);

    const textarea = screen.getByPlaceholderText("Type your message...");

    fireEvent.change(textarea, { target: { value: "Enter message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(screen.getByText("Enter message")).toBeInTheDocument();
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

    const sendButton = screen.getByRole("button", { name: /send/i });
    const initialMessageCount = screen.getAllByText(/Hello|Hi there!/).length;

    fireEvent.click(sendButton);

    const currentMessageCount = screen.getAllByText(/Hello|Hi there!/).length;
    expect(currentMessageCount).toBe(initialMessageCount);
  });

  it("shows typing indicator after sending a message", async () => {
    render(<AgentControlPanel box={mockBox} />);

    const textarea = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(textarea, { target: { value: "Test" } });
    fireEvent.click(sendButton);

    expect(screen.getByText("Typing...")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText("Typing...")).not.toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  });

  it("shows agent response after typing", async () => {
    render(<AgentControlPanel box={mockBox} />);

    const textarea = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(textarea, { target: { value: "Test" } });
    fireEvent.click(sendButton);

    await waitFor(
      () => {
        expect(
          screen.getByText("Message received. This is a placeholder response."),
        ).toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  });

  it("renders control buttons", () => {
    render(<AgentControlPanel box={mockBox} />);

    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restart/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /debug/i })).toBeInTheDocument();
  });

  it("calls toast when Pause button is clicked", () => {
    render(<AgentControlPanel box={mockBox} />);

    const pauseButton = screen.getByRole("button", { name: /pause/i });
    fireEvent.click(pauseButton);

    expect(toast.info).toHaveBeenCalledWith("Pausing agent...");
  });

  it("calls toast when Restart button is clicked", () => {
    render(<AgentControlPanel box={mockBox} />);

    const restartButton = screen.getByRole("button", { name: /restart/i });
    fireEvent.click(restartButton);

    expect(toast.info).toHaveBeenCalledWith("Restarting agent...");
  });

  it("displays correct status color for RUNNING status", () => {
    render(<AgentControlPanel box={mockBox} />);

    const statusIndicator = screen.getByText("RUNNING").previousSibling;
    expect(statusIndicator).toHaveClass("bg-green-500");
  });

  it("displays correct status color for STOPPED status", () => {
    const stoppedBox = { ...mockBox, status: "STOPPED" as const };
    render(<AgentControlPanel box={stoppedBox} />);

    const statusIndicator = screen.getByText("STOPPED").previousSibling;
    expect(statusIndicator).toHaveClass("bg-red-500");
  });

  it("displays correct status color for STARTING status", () => {
    const startingBox = { ...mockBox, status: "STARTING" as const };
    render(<AgentControlPanel box={startingBox} />);

    const statusIndicator = screen.getByText("STARTING").previousSibling;
    expect(statusIndicator).toHaveClass("bg-yellow-500");
  });

  it("displays correct status color for ERROR status", () => {
    const errorBox = { ...mockBox, status: "ERROR" as const };
    render(<AgentControlPanel box={errorBox} />);

    const statusIndicator = screen.getByText("ERROR").previousSibling;
    expect(statusIndicator).toHaveClass("bg-red-600");
  });

  it("displays correct status color for PAUSED status", () => {
    const pausedBox = { ...mockBox, status: "PAUSED" as const };
    render(<AgentControlPanel box={pausedBox} />);

    const statusIndicator = screen.getByText("PAUSED").previousSibling;
    expect(statusIndicator).toHaveClass("bg-red-500");
  });

  it("renders with no messages", () => {
    const boxWithoutMessages = { ...mockBox, messages: [] };
    render(<AgentControlPanel box={boxWithoutMessages} />);

    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("handles messages without the messages prop", () => {
    const { messages, ...boxWithoutMessagesProp } = mockBox;
    render(<AgentControlPanel box={boxWithoutMessagesProp as typeof mockBox} />);

    expect(screen.getByText("Chat")).toBeInTheDocument();
  });
});
