import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Return the value directly with no delay
vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: (value: unknown) => value,
}));

vi.mock("lucide-react", () => ({
  Loader2: (props: Record<string, unknown>) => (
    <span data-testid="icon-loader" className={props["className"] as string} />
  ),
  Search: (props: Record<string, unknown>) => (
    <span data-testid="icon-search" className={props["className"] as string} />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: React.forwardRef(
    (
      props: React.InputHTMLAttributes<HTMLInputElement>,
      ref: React.Ref<HTMLInputElement>,
    ) => <input ref={ref} {...props} />,
  ),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: React.forwardRef(
      (
        {
          children,
          animate: _animate,
          transition: _transition,
          initial: _initial,
          exit: _exit,
          ...rest
        }: Record<string, unknown> & { children?: React.ReactNode },
        ref: React.Ref<HTMLDivElement>,
      ) => (
        <div ref={ref} {...rest}>
          {children}
        </div>
      ),
    ),
  },
}));

vi.mock("./skills-bar", () => ({
  SkillsBar: () => null,
}));

import { CreateSearch } from "./create-search";

describe("CreateSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders search input", () => {
    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("submits form and navigates on classify success", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/classify")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ status: "ok", slug: "todo-list-app" }),
          });
        }
        // Search endpoint
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    await user.type(input, "todo list");

    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/create/todo-list-app");
    });
  });

  it("shows blocked error message", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/classify")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: "blocked",
                reason: "This content is not allowed.",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    await user.type(input, "bad content");

    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("This content is not allowed."),
      ).toBeInTheDocument();
    });

    // Should NOT navigate
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows unclear error message", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/classify")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: "unclear",
                reason: "Please be more specific about the app.",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    await user.type(input, "something");

    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Please be more specific about the app."),
      ).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("falls back to slugified URL on API error", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/classify")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: "Internal server error" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    await user.type(input, "My Cool App");

    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/create/my-cool-app");
    });
  });

  it("falls back on network error", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/classify")) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    await user.type(input, "Weather App");

    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/create/weather-app");
    });
  });

  it("shows search results dropdown", async () => {
    const user = userEvent.setup();

    const searchResults = [
      {
        slug: "todo-list",
        title: "Todo List",
        description: "A simple todo app",
      },
      {
        slug: "color-picker",
        title: "Color Picker",
        description: "Pick colors",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/search")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(searchResults),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    await user.type(input, "todo");

    await waitFor(() => {
      expect(screen.getByText("Todo List")).toBeInTheDocument();
      expect(screen.getByText("A simple todo app")).toBeInTheDocument();
      expect(screen.getByText("Color Picker")).toBeInTheDocument();
    });
  });

  it("clicking result navigates to app", async () => {
    const user = userEvent.setup();

    const searchResults = [
      {
        slug: "todo-list",
        title: "Todo List",
        description: "A simple todo app",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/search")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(searchResults),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    await user.type(input, "todo");

    await waitFor(() => {
      expect(screen.getByText("Todo List")).toBeInTheDocument();
    });

    const resultButton = screen.getByText("Todo List").closest("button")!;
    await user.click(resultButton);

    expect(mockPush).toHaveBeenCalledWith("/create/todo-list");
  });

  it("hides results on blur with delay", async () => {
    const user = userEvent.setup();

    const searchResults = [
      {
        slug: "todo-list",
        title: "Todo List",
        description: "A simple todo app",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/search")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(searchResults),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");

    // Type to trigger search results
    await user.type(input, "todo");

    await waitFor(() => {
      expect(screen.getByText("Todo List")).toBeInTheDocument();
    });

    // Blur the input - the component uses a 200ms setTimeout to clear results
    act(() => {
      input.blur();
    });

    // Results should still be visible immediately (200ms delay hasn't passed)
    expect(screen.getByText("Todo List")).toBeInTheDocument();

    // Wait for the 200ms setTimeout to fire and clear the results
    await waitFor(
      () => {
        expect(screen.queryByText("Todo List")).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("disabled submit while classifying", async () => {
    const user = userEvent.setup();

    // Create a fetch that never resolves for classify
    let resolveClassify!: (value: unknown) => void;
    const classifyPromise = new Promise((resolve) => {
      resolveClassify = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/classify")) {
          return classifyPromise;
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    await user.type(input, "todo list");

    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    // The button should now be disabled while classifying
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Resolve the classify promise so the test can clean up
    resolveClassify({
      ok: true,
      json: () => Promise.resolve({ status: "ok", slug: "todo-list" }),
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("clears error when typing", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/classify")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: "blocked",
                reason: "Not allowed",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    await user.type(input, "bad");

    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    // Error should appear
    await waitFor(() => {
      expect(screen.getByText("Not allowed")).toBeInTheDocument();
    });

    // Type more to clear the error
    await user.type(input, " more text");

    // Error should be gone
    await waitFor(() => {
      expect(screen.queryByText("Not allowed")).not.toBeInTheDocument();
    });
  });

  it("handles unexpected classify response", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/create/classify")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ status: "unknown", data: "something weird" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<CreateSearch />);

    const input = screen.getByTestId("create-search-input");
    await user.type(input, "My App");

    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    // Should fall back to slugified URL for unexpected responses
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/create/my-app");
    });
  });
});
