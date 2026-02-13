import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DisciplineCardShowcase } from "./DisciplineCardShowcase";

// Mock framer-motion to avoid animation issues in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const MOCK_POSTS = [
  {
    slug: "testing-shadows-on-the-cave-wall",
    title: "Shadows on the Cave Wall",
    description: "A philosophical perspective on testing",
    tags: ["testing", "philosophy"],
    plainText:
      "Some long text paragraph for testing that exceeds twenty characters easily.\n\nAnother paragraph here that is also long enough to be valid content.",
  },
  {
    slug: "the-wrong-question-we-answered-for-thirty-years",
    title: "The Wrong Question",
    description: "A cognitive science perspective",
    tags: ["testing", "cognitive-science"],
    plainText:
      "Cognitive science tells us about heuristics and biases in testing.\n\nSubstitution heuristic applied to software quality assurance.",
  },
  {
    slug: "the-transaction-cost-of-clicking-a-button",
    title: "Transaction Cost of Clicking",
    description: "An economics perspective",
    tags: ["testing", "economics"],
    plainText:
      "Transaction costs in software testing have collapsed to near zero.\n\nHayek would appreciate the distributed knowledge of test suites.",
  },
  {
    slug: "load-bearing-walls-and-curtain-walls",
    title: "Load-Bearing Walls",
    description: "An architectural perspective",
    tags: ["testing", "architecture"],
    plainText:
      "Architecture teaches us the difference between load-bearing and curtain walls.\n\nPalladio understood structural integrity centuries before software.",
  },
  {
    slug: "figured-bass-and-the-art-of-testing",
    title: "Figured Bass and Testing",
    description: "A music theory perspective",
    tags: ["testing", "music-theory"],
    plainText:
      "Bach's figured bass reveals the harmonic structure beneath the melody.\n\nCounterpoint in testing means independent voices working in harmony.",
  },
];

function createMockFetchSuccess() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ posts: MOCK_POSTS }),
  });
}

function createMockFetchFailure(message = "Network error") {
  return vi.fn().mockRejectedValue(new Error(message));
}

describe("DisciplineCardShowcase", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createMockFetchSuccess());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders 5 discipline cards after loading", async () => {
    render(<DisciplineCardShowcase />);

    await waitFor(() => {
      expect(screen.getByTestId("discipline-grid")).toBeInTheDocument();
    });

    const cards = screen.getAllByRole("button", { name: /Read .+ perspective/i });
    expect(cards).toHaveLength(5);
  });

  it("shows loading state initially", () => {
    // Use a fetch that never resolves so we stay in loading state
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {})),
    );

    render(<DisciplineCardShowcase />);

    expect(screen.getByTestId("discipline-loading")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    vi.stubGlobal("fetch", createMockFetchFailure("Network error"));

    render(<DisciplineCardShowcase />);

    await waitFor(() => {
      expect(screen.getByTestId("discipline-error")).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to load discipline posts/i)).toBeInTheDocument();
    expect(screen.getByText(/Network error/i)).toBeInTheDocument();
  });

  it("shows error state when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    render(<DisciplineCardShowcase />);

    await waitFor(() => {
      expect(screen.getByTestId("discipline-error")).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to load discipline posts/i)).toBeInTheDocument();
  });

  it("clicking a card opens dialog with article content", async () => {
    const user = userEvent.setup();

    render(<DisciplineCardShowcase />);

    await waitFor(() => {
      expect(screen.getByTestId("discipline-grid")).toBeInTheDocument();
    });

    const philosophyCard = screen.getByRole("button", {
      name: "Read Philosophy perspective",
    });

    await act(async () => {
      await user.click(philosophyCard);
    });

    await waitFor(() => {
      expect(screen.getByText("Philosophy: Socrates")).toBeInTheDocument();
    });

    // Tagline appears on both the card and the dialog description
    const taglineMatches = screen.getAllByText("Shadows on the cave wall");
    expect(taglineMatches.length).toBeGreaterThanOrEqual(2);
    // Check that the article paragraphs are rendered inside the dialog
    expect(
      screen.getByText(/Some long text paragraph for testing/),
    ).toBeInTheDocument();
  });

  it("dialog shows listen button with correct thinker name", async () => {
    const user = userEvent.setup();

    render(<DisciplineCardShowcase />);

    await waitFor(() => {
      expect(screen.getByTestId("discipline-grid")).toBeInTheDocument();
    });

    const economicsCard = screen.getByRole("button", {
      name: "Read Economics perspective",
    });

    await act(async () => {
      await user.click(economicsCard);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Listen with Hayek's voice" }),
      ).toBeInTheDocument();
    });
  });

  it("each card has correct discipline and thinker labels", async () => {
    render(<DisciplineCardShowcase />);

    await waitFor(() => {
      expect(screen.getByTestId("discipline-grid")).toBeInTheDocument();
    });

    // Verify discipline labels
    expect(screen.getByText("Philosophy")).toBeInTheDocument();
    expect(screen.getByText("Cognitive Science")).toBeInTheDocument();
    expect(screen.getByText("Economics")).toBeInTheDocument();
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByText("Music Theory")).toBeInTheDocument();

    // Verify thinker names
    expect(screen.getByText("Socrates")).toBeInTheDocument();
    expect(screen.getByText("Kahneman")).toBeInTheDocument();
    expect(screen.getByText("Hayek")).toBeInTheDocument();
    expect(screen.getByText("Palladio")).toBeInTheDocument();
    expect(screen.getByText("Bach")).toBeInTheDocument();
  });

  it("each card has a distinct aria-label for the discipline", async () => {
    render(<DisciplineCardShowcase />);

    await waitFor(() => {
      expect(screen.getByTestId("discipline-grid")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Read Philosophy perspective" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Read Cognitive Science perspective" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Read Economics perspective" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Read Architecture perspective" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Read Music Theory perspective" }),
    ).toBeInTheDocument();
  });

  it("fetches from the correct API endpoint with all slugs", async () => {
    render(<DisciplineCardShowcase />);

    await waitFor(() => {
      expect(screen.getByTestId("discipline-grid")).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const callUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(callUrl).toContain("/api/blog/content?slugs=");
    expect(callUrl).toContain("testing-shadows-on-the-cave-wall");
    expect(callUrl).toContain("the-wrong-question-we-answered-for-thirty-years");
    expect(callUrl).toContain("the-transaction-cost-of-clicking-a-button");
    expect(callUrl).toContain("load-bearing-walls-and-curtain-walls");
    expect(callUrl).toContain("figured-bass-and-the-art-of-testing");
  });

  it("closing the dialog resets selected discipline", async () => {
    const user = userEvent.setup();

    render(<DisciplineCardShowcase />);

    await waitFor(() => {
      expect(screen.getByTestId("discipline-grid")).toBeInTheDocument();
    });

    // Open the dialog
    const card = screen.getByRole("button", {
      name: "Read Philosophy perspective",
    });

    await act(async () => {
      await user.click(card);
    });

    await waitFor(() => {
      expect(screen.getByText("Philosophy: Socrates")).toBeInTheDocument();
    });

    // Close the dialog via the close button (sr-only text "Close")
    const closeButton = screen.getByRole("button", { name: "Close" });

    await act(async () => {
      await user.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByText("Philosophy: Socrates")).not.toBeInTheDocument();
    });
  });
});
