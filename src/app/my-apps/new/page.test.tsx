import { render, waitFor } from "@testing-library/react";
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

  it("should render loading state initially", () => {
    render(<NewAppPage />);
    expect(
      screen.getByText("Initializing workspace..."),
    ).toBeInTheDocument();
  });

  it("should redirect to a generated codespace ID", async () => {
    render(<NewAppPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    const redirectPath = mockReplace.mock.calls[0]![0];
    // Check format: /my-apps/[generated-id]
    // ID format is adj.noun.verb.suffix (e.g., swift.forge.launch.a1b2)
    expect(redirectPath).toMatch(
      /^\/my-apps\/[a-z]+\.[a-z]+\.[a-z]+\.[a-z0-9]+$/,
    );
  });
});

// Import screen from testing-library/react
import { screen } from "@testing-library/react";
