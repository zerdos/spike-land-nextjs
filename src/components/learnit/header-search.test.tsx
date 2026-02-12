import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  Search: () => <span data-testid="icon-search" />,
  X: () => <span data-testid="icon-x" />,
}));

vi.mock("./search", () => ({
  LearnItSearch: ({ compact }: { compact?: boolean }) => (
    <div data-testid="learnit-search" data-compact={compact}>
      Search Component
    </div>
  ),
}));

import { HeaderSearch } from "./header-search";

describe("HeaderSearch", () => {
  it("renders search icon button by default", () => {
    render(<HeaderSearch />);
    expect(screen.getByTestId("header-search-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("icon-search")).toBeInTheDocument();
    expect(screen.queryByTestId("header-search-expanded")).not.toBeInTheDocument();
  });

  it("expands to search bar on click", async () => {
    const user = userEvent.setup();
    render(<HeaderSearch />);

    await user.click(screen.getByTestId("header-search-toggle"));

    expect(screen.getByTestId("header-search-expanded")).toBeInTheDocument();
    expect(screen.getByTestId("learnit-search")).toBeInTheDocument();
    expect(screen.getByTestId("learnit-search")).toHaveAttribute("data-compact", "true");
  });

  it("collapses on close button click", async () => {
    const user = userEvent.setup();
    render(<HeaderSearch />);

    // Expand
    await user.click(screen.getByTestId("header-search-toggle"));
    expect(screen.getByTestId("header-search-expanded")).toBeInTheDocument();

    // Collapse
    await user.click(screen.getByTestId("header-search-close"));
    expect(screen.queryByTestId("header-search-expanded")).not.toBeInTheDocument();
    expect(screen.getByTestId("header-search-toggle")).toBeInTheDocument();
  });

  it("has correct aria labels", async () => {
    const user = userEvent.setup();
    render(<HeaderSearch />);

    expect(screen.getByLabelText("Search topics")).toBeInTheDocument();

    await user.click(screen.getByTestId("header-search-toggle"));
    expect(screen.getByLabelText("Close search")).toBeInTheDocument();
  });
});
