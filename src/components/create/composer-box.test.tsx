import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockResize = vi.fn();
vi.mock("@/hooks/useAutoResizeTextarea", () => ({
  useAutoResizeTextarea: () => ({
    textareaRef: { current: null },
    resize: mockResize,
  }),
}));

const mockAddImages = vi.fn();
const mockRemoveImage = vi.fn();
vi.mock("@/hooks/useComposerImages", () => ({
  useComposerImages: () => ({
    images: [],
    addImages: mockAddImages,
    removeImage: mockRemoveImage,
    clearAll: vi.fn(),
    isDragging: false,
    dragHandlers: {
      onDragOver: vi.fn(),
      onDragLeave: vi.fn(),
      onDrop: vi.fn(),
    },
    uploadedUrls: [],
  }),
}));

vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: (value: unknown) => value,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { animate: _a, initial: _i, exit: _e, transition: _t, style: _s, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("lucide-react", () => ({
  Paperclip: () => null,
  Loader2: (props: Record<string, unknown>) => <span data-testid="loader" {...props} />,
}));

vi.mock("./composer-glow", () => ({
  ComposerGlow: ({ children }: { children: React.ReactNode }) => <div data-testid="composer-glow">{children}</div>,
}));

vi.mock("./composer-image-strip", () => ({
  ComposerImageStrip: () => null,
}));

vi.mock("./composer-skills", () => ({
  ComposerSkills: () => null,
}));

vi.mock("./composer-typing-demo", () => ({
  ComposerTypingDemo: () => null,
}));

// Stub global fetch
vi.stubGlobal("fetch", vi.fn());

const mockFetch = fetch as ReturnType<typeof vi.fn>;

/** Default fetch that returns empty search results for the debounced search effect. */
function mockSearchAndClassify(classifyResponse: {
  ok: boolean;
  json: () => Promise<unknown>;
}) {
  // The debounced search will fire first (any call to /api/create/search),
  // then the classify call fires on submit.
  mockFetch.mockImplementation((url: string) => {
    if (typeof url === "string" && url.includes("/api/create/search")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }
    // classify call
    return Promise.resolve(classifyResponse);
  });
}

import { ComposerBox } from "./composer-box";

describe("ComposerBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: search returns empty, classify falls through to catch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it("renders textarea with correct aria-label", () => {
    render(<ComposerBox />);
    const textarea = screen.getByLabelText("Describe the app you want to create");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("renders the Create submit button", () => {
    render(<ComposerBox />);
    const button = screen.getByTestId("composer-submit");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Create");
  });

  it("disables Create button when textarea is empty", () => {
    render(<ComposerBox />);
    const button = screen.getByTestId("composer-submit");
    expect(button).toBeDisabled();
  });

  it("enables Create button when textarea has text", async () => {
    render(<ComposerBox />);
    const textarea = screen.getByTestId("composer-textarea");
    fireEvent.change(textarea, { target: { value: "A weather app" } });

    const button = screen.getByTestId("composer-submit");
    expect(button).not.toBeDisabled();
  });

  it("populates textarea from initialPrompt prop", () => {
    render(<ComposerBox initialPrompt="Build a calculator" />);
    const textarea = screen.getByTestId("composer-textarea");
    expect(textarea).toHaveValue("Build a calculator");
  });

  it("navigates to slug on successful classify response", async () => {
    mockSearchAndClassify({
      ok: true,
      json: () => Promise.resolve({ status: "ok", slug: "weather-app" }),
    });

    render(<ComposerBox />);
    const textarea = screen.getByTestId("composer-textarea");
    fireEvent.change(textarea, { target: { value: "A weather app" } });
    fireEvent.submit(screen.getByTestId("composer-submit").closest("form")!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/create/weather-app");
    });
  });

  it("navigates to slugified query when classify response is not ok", async () => {
    mockSearchAndClassify({
      ok: false,
      json: () => Promise.resolve({}),
    });

    render(<ComposerBox />);
    const textarea = screen.getByTestId("composer-textarea");
    fireEvent.change(textarea, { target: { value: "My App" } });
    fireEvent.submit(screen.getByTestId("composer-submit").closest("form")!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/create/my-app");
    });
  });

  it("shows blocked error message from classify response", async () => {
    mockSearchAndClassify({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "blocked",
          reason: "Content not allowed here.",
        }),
    });

    render(<ComposerBox />);
    const textarea = screen.getByTestId("composer-textarea");
    fireEvent.change(textarea, { target: { value: "bad input" } });
    fireEvent.submit(screen.getByTestId("composer-submit").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Content not allowed here.")).toBeInTheDocument();
    });
  });

  it("shows unclear error message from classify response", async () => {
    mockSearchAndClassify({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "unclear",
          reason: "Please be more specific.",
        }),
    });

    render(<ComposerBox />);
    const textarea = screen.getByTestId("composer-textarea");
    fireEvent.change(textarea, { target: { value: "something" } });
    fireEvent.submit(screen.getByTestId("composer-submit").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Please be more specific.")).toBeInTheDocument();
    });
  });

  it("navigates to slug on fetch error (fallback)", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/create/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error("Network error"));
    });

    render(<ComposerBox />);
    const textarea = screen.getByTestId("composer-textarea");
    fireEvent.change(textarea, { target: { value: "test app" } });
    fireEvent.submit(screen.getByTestId("composer-submit").closest("form")!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/create/test-app");
    });
  });

  it("shows search results dropdown when query returns results", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/create/search")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { slug: "calc", title: "Calculator", description: "A calculator app" },
            ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<ComposerBox />);
    const textarea = screen.getByTestId("composer-textarea");
    fireEvent.change(textarea, { target: { value: "calc" } });

    await waitFor(() => {
      expect(screen.getByText("Calculator")).toBeInTheDocument();
      expect(screen.getByText("A calculator app")).toBeInTheDocument();
    });
  });

  it("navigates when clicking a search result", async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/create/search")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { slug: "todo-list", title: "Todo List", description: "Manage tasks" },
            ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<ComposerBox />);
    const textarea = screen.getByTestId("composer-textarea");
    fireEvent.change(textarea, { target: { value: "todo" } });

    await waitFor(() => {
      expect(screen.getByText("Todo List")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Todo List"));

    expect(mockPush).toHaveBeenCalledWith("/create/todo-list");
  });

  it("submits on Cmd+Enter keyboard shortcut", async () => {
    mockSearchAndClassify({
      ok: true,
      json: () => Promise.resolve({ status: "ok", slug: "quick-app" }),
    });

    render(<ComposerBox />);
    const textarea = screen.getByTestId("composer-textarea");
    fireEvent.change(textarea, { target: { value: "quick app" } });
    fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/create/quick-app");
    });
  });

  it("clears textarea and blurs on Escape key", () => {
    render(<ComposerBox />);
    const textarea = screen.getByTestId("composer-textarea");
    fireEvent.change(textarea, { target: { value: "something" } });
    expect(textarea).toHaveValue("something");

    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(textarea).toHaveValue("");
  });

  it("renders hidden file input for image attachment", () => {
    render(<ComposerBox />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.accept).toBe("image/*");
    expect(fileInput.multiple).toBe(true);
    expect(fileInput.className).toContain("hidden");
  });

  it("renders the attach image button with correct aria-label", () => {
    render(<ComposerBox />);
    const attachButton = screen.getByLabelText("Attach image");
    expect(attachButton).toBeInTheDocument();
    expect(attachButton.getAttribute("type")).toBe("button");
  });
});
