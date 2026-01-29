import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewAppPage from "./page";

// Mock dependencies
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next-view-transitions", () => ({
  useTransitionRouter: () => mockRouter,
}));

describe("NewAppPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should render template selector", () => {
    render(<NewAppPage />);
    expect(screen.getByText("Choose a Template")).toBeInTheDocument();
    expect(screen.getByText("Start from Scratch")).toBeInTheDocument();
  });

  it("should redirect to a generated codespace ID when template is selected", async () => {
    const user = userEvent.setup();
    render(<NewAppPage />);

    // Click on "Start from Scratch" option
    const scratchCard = screen.getByText("Start from Scratch").closest("div");
    if (scratchCard) {
      await user.click(scratchCard);
    }

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    const redirectPath = mockPush.mock.calls[0]![0];
    // Check format: /my-apps/[generated-id]
    // ID format is adj.noun.verb.suffix (e.g., swift.forge.launch.a1b2)
    expect(redirectPath).toMatch(
      /^\/my-apps\/[a-z]+\.[a-z]+\.[a-z]+\.[a-z0-9]+$/,
    );
  });
});
