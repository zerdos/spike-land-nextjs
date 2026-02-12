import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: (value: string) => value,
}));

vi.mock("@/lib/learnit/utils", () => ({
  slugify: (text: string) => text.toLowerCase().replace(/\s+/g, "-"),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { animate: _a, transition: _t, ...rest } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
  },
}));

vi.mock("lucide-react", () => ({
  Search: () => <span data-testid="search-icon" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, onMouseDown, ...props }: Record<string, unknown>) => (
    <button
      onClick={onClick as React.MouseEventHandler}
      onMouseDown={onMouseDown as React.MouseEventHandler}
      {...props}
    >
      {children as React.ReactNode}
    </button>
  ),
}));

import { LearnItSearch } from "./search";

describe("LearnItSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders search input", () => {
    render(<LearnItSearch />);
    expect(screen.getByTestId("learnit-search-input")).toBeInTheDocument();
  });

  it("shows dropdown when focused with results", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { slug: "react", title: "React", description: "A library" },
        ]),
    });

    render(<LearnItSearch />);
    const input = screen.getByTestId("learnit-search-input");
    await user.click(input);
    await user.type(input, "react");

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
    });
  });

  it("hides dropdown on blur", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { slug: "react", title: "React", description: "A library" },
        ]),
    });

    render(<LearnItSearch />);
    const input = screen.getByTestId("learnit-search-input");
    await user.click(input);
    await user.type(input, "react");

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    // Blur the input
    await user.tab();

    await waitFor(() => {
      expect(screen.queryByText("React")).not.toBeInTheDocument();
    });
  });

  it("clicking result navigates and closes dropdown", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { slug: "react", title: "React", description: "A library" },
        ]),
    });

    render(<LearnItSearch />);
    const input = screen.getByTestId("learnit-search-input");
    await user.click(input);
    await user.type(input, "react");

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    await user.click(screen.getByText("React"));

    expect(mockPush).toHaveBeenCalledWith("/learnit/react");
    // Dropdown should close after navigation
    await waitFor(() => {
      expect(screen.queryByText("React")).not.toBeInTheDocument();
    });
  });

  it("shows no dropdown when query is too short", async () => {
    const user = userEvent.setup();

    render(<LearnItSearch />);
    const input = screen.getByTestId("learnit-search-input");
    await user.click(input);
    await user.type(input, "r");

    // fetch should not be called for single char
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits form and navigates to slugified topic", async () => {
    const user = userEvent.setup();

    render(<LearnItSearch />);
    const input = screen.getByTestId("learnit-search-input");
    await user.type(input, "React Hooks{Enter}");

    expect(mockPush).toHaveBeenCalledWith("/learnit/react-hooks");
  });

  it("renders compact variant with smaller placeholder", () => {
    render(<LearnItSearch compact />);
    const input = screen.getByTestId("learnit-search-input");
    expect(input).toHaveAttribute("placeholder", "Search topics...");
  });

  it("renders default variant with full placeholder", () => {
    render(<LearnItSearch />);
    const input = screen.getByTestId("learnit-search-input");
    expect(input).toHaveAttribute("placeholder", "What do you want to learn today?");
  });
});
