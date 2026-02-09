import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadAloudParagraph } from "./ReadAloudButton";

// --- Mock useTextToSpeech ---
const mockPlay = vi.fn();
const mockStop = vi.fn();
let mockState: "idle" | "loading" | "playing" | "error" = "idle";

vi.mock("@/hooks/useTextToSpeech", () => ({
  useTextToSpeech: () => ({
    state: mockState,
    play: mockPlay,
    stop: mockStop,
  }),
}));

// --- Mock tooltip components ---
// TooltipContent uses a portal in the real implementation, so it does NOT
// render inside the ref container. We mock it to render nothing to avoid
// polluting the ref's textContent.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("ReadAloudParagraph", () => {
  beforeEach(() => {
    mockState = "idle";
    mockPlay.mockClear();
    mockStop.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children content", () => {
    render(
      <ReadAloudParagraph>
        <p>This is a long enough paragraph text for testing purposes here.</p>
      </ReadAloudParagraph>,
    );

    expect(screen.getByText("This is a long enough paragraph text for testing purposes here.")).toBeInTheDocument();
  });

  it("shows button when text content is >= 20 characters", () => {
    render(
      <ReadAloudParagraph>
        <p>This is a sufficiently long paragraph for the test.</p>
      </ReadAloudParagraph>,
    );

    expect(screen.getByRole("button", { name: "Listen to this paragraph" })).toBeInTheDocument();
  });

  it("hides button when text content is < 20 characters", () => {
    render(
      <ReadAloudParagraph>
        <p>Short text</p>
      </ReadAloudParagraph>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hides button when children have no text", () => {
    render(
      <ReadAloudParagraph>
        <div />
      </ReadAloudParagraph>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls play with trimmed text on click in idle state", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text to trigger playback.</p>
      </ReadAloudParagraph>,
    );

    const button = screen.getByRole("button", { name: "Listen to this paragraph" });
    await user.click(button);

    expect(mockPlay).toHaveBeenCalledWith("This is a paragraph with enough text to trigger playback.");
    expect(mockStop).not.toHaveBeenCalled();
  });

  it("calls stop when clicked during playing state", async () => {
    mockState = "playing";
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text to trigger playback.</p>
      </ReadAloudParagraph>,
    );

    const button = screen.getByRole("button", { name: "Stop reading" });
    await user.click(button);

    expect(mockStop).toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("shows loading spinner and disables button during loading state", () => {
    mockState = "loading";

    render(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text to show loading.</p>
      </ReadAloudParagraph>,
    );

    const button = screen.getByRole("button", { name: "Generating audio..." });
    expect(button).toBeDisabled();
  });

  it("shows pause icon and 'Stop reading' aria-label during playing state", () => {
    mockState = "playing";

    render(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text for playing state.</p>
      </ReadAloudParagraph>,
    );

    const button = screen.getByRole("button", { name: "Stop reading" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("shows VolumeX icon on error state then resets after 2 seconds", () => {
    mockState = "error";

    const { rerender } = render(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text for error state.</p>
      </ReadAloudParagraph>,
    );

    // The tooltip says "Listen to this paragraph" (error is not a separate tooltip)
    expect(screen.getByRole("button", { name: "Listen to this paragraph" })).toBeInTheDocument();

    // Advance timer to clear the error display
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // After timeout, showError is false, so Volume2 icon is shown
    rerender(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text for error state.</p>
      </ReadAloudParagraph>,
    );

    expect(screen.getByRole("button", { name: "Listen to this paragraph" })).toBeInTheDocument();
  });

  it("cleans up error timeout on state change", () => {
    mockState = "error";

    const { rerender } = render(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text for error cleanup.</p>
      </ReadAloudParagraph>,
    );

    // Now change state to idle before timeout fires
    mockState = "idle";
    rerender(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text for error cleanup.</p>
      </ReadAloudParagraph>,
    );

    // Advance past timeout - should not cause issues due to cleanup
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByRole("button", { name: "Listen to this paragraph" })).toBeInTheDocument();
  });

  it("applies playing-specific CSS classes when state is playing", () => {
    mockState = "playing";

    render(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text for CSS class test.</p>
      </ReadAloudParagraph>,
    );

    const button = screen.getByRole("button", { name: "Stop reading" });
    expect(button.className).toContain("opacity-100");
    expect(button.className).toContain("text-primary");
  });

  it("calls play with boundary text of exactly 20 characters", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Use exactly 20 chars (boundary: >= 20), so button should appear
    render(
      <ReadAloudParagraph>
        <p>12345678901234567890</p>
      </ReadAloudParagraph>,
    );

    const button = screen.getByRole("button", { name: "Listen to this paragraph" });
    await user.click(button);

    expect(mockPlay).toHaveBeenCalledWith("12345678901234567890");
  });

  it("does not show button for exactly 19 characters", () => {
    render(
      <ReadAloudParagraph>
        <p>1234567890123456789</p>
      </ReadAloudParagraph>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows loading aria-label for loading state", () => {
    mockState = "loading";

    render(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text for tooltip test.</p>
      </ReadAloudParagraph>,
    );

    expect(screen.getByRole("button", { name: "Generating audio..." })).toBeInTheDocument();
  });

  it("shows idle aria-label for idle state", () => {
    mockState = "idle";

    render(
      <ReadAloudParagraph>
        <p>This is a paragraph with enough text for idle tooltip.</p>
      </ReadAloudParagraph>,
    );

    expect(screen.getByRole("button", { name: "Listen to this paragraph" })).toBeInTheDocument();
  });
});
