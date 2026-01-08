import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppWorkspacePage from "./page";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "test-app-id" }),
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((event: { data: string; }) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 1;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = 2;
  }

  static clearInstances() {
    MockEventSource.instances = [];
  }

  simulateMessage(data: object) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

vi.stubGlobal("EventSource", MockEventSource);

const mockAppData = {
  id: "test-app-id",
  name: "Test App",
  description: "Test description",
  status: "DRAFTING",
  codespaceId: "test-codespace",
  codespaceUrl: "https://testing.spike.land/live/test-codespace/",
  isPublic: false,
  isCurated: false,
  lastAgentActivity: null,
  agentWorking: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  requirements: [],
  monetizationModels: [],
  statusHistory: [
    {
      id: "status-1",
      status: "DRAFTING",
      message: "Initial status",
      createdAt: "2024-01-01T00:00:00Z",
    },
  ],
  _count: { messages: 0, images: 0 },
};

const mockMessages = {
  messages: [
    {
      id: "msg-1",
      role: "USER",
      content: "Hello",
      createdAt: "2024-01-01T00:00:00Z",
      attachments: [],
    },
    {
      id: "msg-2",
      role: "AGENT",
      content: "Hi there!",
      createdAt: "2024-01-01T00:01:00Z",
      attachments: [],
    },
  ],
  nextCursor: null,
  hasMore: false,
};

describe("AppWorkspacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.clearInstances();

    // Default successful responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/apps/test-app-id/messages")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        });
      }
      if (url.includes("/api/apps/test-app-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAppData),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    const { container } = render(<AppWorkspacePage />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders app name after loading", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("Test App")).toBeInTheDocument();
    });
  });

  it("renders app status badge", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      // There are multiple DRAFTING badges (header and status history)
      const badges = screen.getAllByText("DRAFTING");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it("renders chat panel", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("Chat")).toBeInTheDocument();
    });
  });

  it("renders preview panel", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("testing.spike.land/live/test-codespace/"))
        .toBeInTheDocument();
    });
  });

  it("renders messages in chat", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });
  });

  it("renders message input textarea", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/type your message/i),
      ).toBeInTheDocument();
    });
  });

  it("renders send button", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    });
  });

  it("renders back link", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText(/back/i)).toBeInTheDocument();
    });
  });

  it("renders iframe when codespaceUrl exists", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toBe(
        "https://testing.spike.land/live/test-codespace/",
      );
    });
  });

  it("renders status history", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("Activity Log")).toBeInTheDocument();
    });
  });

  it("shows error state when app fetch fails with 404", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/apps/test-app-id/messages")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ messages: [] }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not found" }),
      });
    });

    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("App not found")).toBeInTheDocument();
    });
  });

  it("shows error state when app fetch fails", async () => {
    mockFetch.mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
      });
    });

    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load app")).toBeInTheDocument();
    });
  });

  it("can send a message", async () => {
    const user = userEvent.setup();

    mockFetch.mockImplementation(
      (url: string, options?: { method?: string; }) => {
        if (
          url.includes("/api/apps/test-app-id/messages") &&
          options?.method === "POST"
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "new-msg",
                role: "USER",
                content: "New message",
                createdAt: new Date().toISOString(),
              }),
          });
        }
        if (url.includes("/api/apps/test-app-id/messages")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMessages),
          });
        }
        if (url.includes("/api/apps/test-app-id")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAppData),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      },
    );

    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type your message/i))
        .toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/type your message/i);
    await user.type(textarea, "New message");

    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/apps/test-app-id/messages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ content: "New message" }),
        }),
      );
    });
  });

  it("disables send button when textarea is empty", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      const sendButton = screen.getByRole("button", { name: /send/i });
      expect(sendButton).toBeDisabled();
    });
  });

  it("connects to SSE endpoint", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(1);
      const instance = MockEventSource.instances[0];
      expect(instance).toBeDefined();
      expect(instance?.url).toBe(
        "/api/apps/test-app-id/messages/stream",
      );
    });
  });

  it("handles SSE message events", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(1);
    });

    const eventSource = MockEventSource.instances[0]!;
    eventSource.simulateMessage({
      type: "message",
      data: {
        id: "sse-msg",
        role: "AGENT",
        content: "SSE Message",
        createdAt: new Date().toISOString(),
      },
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText("SSE Message")).toBeInTheDocument();
    });
  });

  it("handles SSE status events", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      const badges = screen.getAllByText("DRAFTING");
      expect(badges.length).toBeGreaterThan(0);
    });

    const eventSource = MockEventSource.instances[0]!;
    eventSource.simulateMessage({
      type: "status",
      data: { status: "BUILDING", message: "Building..." },
      timestamp: Date.now(),
    });

    await waitFor(() => {
      // After status change, BUILDING should appear in header
      expect(screen.getByText("BUILDING")).toBeInTheDocument();
    });
  });

  it("handles SSE agent_working events", async () => {
    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("Test App")).toBeInTheDocument();
    });

    const eventSource = MockEventSource.instances[0]!;
    eventSource.simulateMessage({
      type: "agent_working",
      data: { isWorking: true },
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText("Agent Working")).toBeInTheDocument();
    });
  });

  it("renders no preview message when codespaceUrl is null", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/apps/test-app-id/messages")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        });
      }
      if (url.includes("/api/apps/test-app-id")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockAppData,
              codespaceId: null,
              codespaceUrl: null,
            }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("Preview will appear here")).toBeInTheDocument();
    });
  });

  it("renders empty messages state", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/apps/test-app-id/messages")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              messages: [],
              nextCursor: null,
              hasMore: false,
            }),
        });
      }
      if (url.includes("/api/apps/test-app-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAppData),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByText("No messages yet. Start a conversation!"),
      ).toBeInTheDocument();
    });
  });

  it("cleans up EventSource on unmount", async () => {
    const { unmount } = render(<AppWorkspacePage />);

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(1);
    });

    const eventSource = MockEventSource.instances[0]!;
    unmount();

    expect(eventSource.readyState).toBe(2); // Closed
  });
});
